import logging
import json
import asyncio
from contextlib import asynccontextmanager
from uuid import UUID
from email.message import EmailMessage

import aio_pika
import httpx
from redis.asyncio import Redis
from fastapi import FastAPI
from jinja2 import Environment, BaseLoader
from circuitbreaker import AsyncCircuitBreaker
import aiosmtplib

from .app_logging import setup_logging
from .config import settings
from .schema import (
    NotificationRequest,
    UserResponse,
    TemplateResponse,
    NotificationStatusUpdate
)

# Configure logging first
setup_logging()
logger = logging.getLogger(__name__)


# --- 2. Global Clients & Configuration ---

HTTPX_CLIENT: httpx.AsyncClient | None = None
REDIS_CLIENT: Redis | None = None
RABBITMQ_CONNECTION: aio_pika.Connection | None = None

mail_circuit_breaker = AsyncCircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    name="EmailSMTPLimits"
)

USER_SERVICE_URL = "http://user-service:8000/api/v1/users"
TEMPLATE_SERVICE_URL = "http://template-service:8000/api/v1/templates"
MANAGER_SERVICE_URL = "http://notifications-manager:8000/api/v1/email/status"

async def retry_async(fn, retries=3, delay=0.5, backoff=2):
    """
    Generic retry wrapper for async functions.

    fn: the function to execute (already wrapped with args)
    retries: how many attempts
    delay: initial delay between retries
    backoff: multiplier for exponential backoff
    """
    for attempt in range(1, retries + 1):
        try:
            return await fn()

        except Exception as e:
            logger.error(
                f"Attempt {attempt} failed: {str(e)}"
            )

            if attempt == retries:
                # No more retries
                raise

            # Wait before next retry
            await asyncio.sleep(delay)
            delay *= backoff  # exponential backoff

# --- 3. Core Logic: Helper Functions ---

async def fetch_user_details(user_id: UUID) -> UserResponse | None:
    """Fetches user's email and preferences from the User Service."""
    try:
        response = await HTTPX_CLIENT.get(f"{USER_SERVICE_URL}/{user_id}")
        response.raise_for_status()
        return UserResponse.model_validate(response.json())
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching user {user_id}: {e.response.status_code}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Network error fetching user {user_id}: {e}")
        return None


async def fetch_template(template_code: str) -> TemplateResponse | None:
    """Fetches the email subject and body template."""
    try:
        url = f"{TEMPLATE_SERVICE_URL}/{template_code}"
        response = await HTTPX_CLIENT.get(url)
        response.raise_for_status()
        return TemplateResponse.model_validate(response.json())
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching template {template_code}: {e}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Network error fetching template {template_code}: {e}")
        return None

async def save_status_to_redis(notification_id: str, status: str):
    key = f"notification:{notification_id}"
    value = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat()
    }
    await REDIS_CLIENT.hset(key, mapping=value)

#async def report_status(request_id: str, status: #str, error_msg: str = None):
 #   """Reports the final status (delivered/failed#) to the Manager."""
#    payload = NotificationStatusUpdate(
    #    notification_id=request_id,
   #     status=status,
   #     error=error_msg
#    )
#    try:
#        await HTTPX_CLIENT.post(
    #        MANAGER_SERVICE_URL,
 #           json=payload.model_dump(exclude_none=True)
  #      )
#    except httpx.RequestError as e:
#        logger.error(f"Failed to report status for {request_id}: {e}")


@mail_circuit_breaker
async def send_email(to_email: str, subject: str, html_body: str):
    """Sends the email using aiosmtplib (wrapped by circuit breaker)."""
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.EMAIL_SENDER
    msg['To'] = to_email
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_body, subtype='html')

    await aiosmtplib.send(
        msg,
        hostname=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
    )
    logger.info(f"Successfully sent email to {to_email}")


# --- 4. Core Logic: Main Processing Function ---

async def process_email_request(request: NotificationRequest) -> bool:
    """
    Main logic function to process a single notification request.
    Returns True on success/non-retryable error, False on a retryable failure.
    """
    idempotency_key = f"idempotency:email:{request.request_id}"

    try:
        if await REDIS_CLIENT.get(idempotency_key):
            logger.warning(f"Duplicate request: {request.request_id}. Skipping.")
            return True

        user = await fetch_user_details(request.user_id)
        if not user:
            logger.error(f"User {request.user_id} not found. Giving up.")
            await report_status(request.request_id, "failed", "User not found")
            return True

        if not user.preferences.email:
            logger.info(f"User {user.email} has disabled emails. Skipping.")
            return True

        template_data = await fetch_template(request.template_code)
        if not template_data:
            logger.error(f"Template {request.template_code} not found. Retrying.")
            return False

        try:
            template = Environment(loader=BaseLoader()).from_string(template_data.body)
            html_body = template.render(request.variables.model_dump())
            subject = template_data.subject
        except Exception as e:
            logger.error(f"Template rendering failed: {e}")
            await report_status(request.request_id, "failed", str(e))
            return True

        await send_email(user.email, subject, html_body)

        await REDIS_CLIENT.set(idempotency_key, "processed", ex=3600)
        await report_status(request.request_id, "delivered")
        return True

    except aiosmtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}. Retrying message.")
        return False
    except httpx.RequestError as e:
        logger.error(f"Network error: {e}. Retrying message.")
        return False
    except Exception as e:
        logger.critical(f"Unhandled error for {request.request_id}: {e}")
        await report_status(request.request_id, "failed", str(e))
        return True


# --- 5. RabbitMQ Consumer ---

async def on_message(message: aio_pika.IncomingMessage):
    """Callback function for RabbitMQ messages."""
    try:
        body = message.body.decode()
        logger.info(f"Received message: {body}")

        request = NotificationRequest.model_validate_json(body)
        success = await process_email_request(request)

        if success:
            await message.ack()
        else:
            logger.warning(
                f"NACKing message (will be dead-lettered): {request.request_id}"
            )
            await message.nack(requeue=False)

    except json.JSONDecodeError:
        logger.error("Message is not valid JSON. Discarding.")
        await message.ack()
    except Exception as e:
        logger.critical(f"Unprocessable message: {e}. Discarding.")
        await message.ack()


# --- 6. FastAPI Lifespan & App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    global HTTPX_CLIENT, REDIS_CLIENT, RABBITMQ_CONNECTION
    logger.info("FastAPI app is starting up...")

    HTTPX_CLIENT = httpx.AsyncClient()
    REDIS_CLIENT = Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        decode_responses=True
    )

    loop = asyncio.get_event_loop()
    connected = False
    for i in range(5):
        try:
            RABBITMQ_CONNECTION = await aio_pika.connect_robust(
                f"amqp://{settings.RABBITMQ_USER}:{settings.RABBITMQ_PASS}"
                f"@{settings.RABBITMQ_HOST}/",
                loop=loop
            )
            connected = True
            logger.info("Successfully connected to RabbitMQ.")
            break
        except aio_pika.exceptions.AMQPConnectionError as e:
            logger.warning(
                f"RabbitMQ connection failed (Attempt {i+1}/5): {e}. "
                f"Retrying in 5s..."
            )
            await asyncio.sleep(5)

    if connected:
        channel = await RABBITMQ_CONNECTION.channel()
        await channel.set_qos(prefetch_count=10)

        exchange = await channel.declare_exchange(
            "notifications.direct",
            type=aio_pika.ExchangeType.DIRECT,
            durable=True
        )

        failed_queue = await channel.declare_queue("failed.queue", durable=True)

        email_queue = await channel.declare_queue(
            "email.queue",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "notifications.direct",
                "x-dead-letter-routing-key": failed_queue.name,
            }
        )

        await email_queue.bind(exchange, routing_key="email.queue")
        await failed_queue.bind(exchange, routing_key="failed.queue")
        logger.info("RabbitMQ exchange and queues declared.")

        await email_queue.consume(on_message)
        logger.info("Started consuming from 'email.queue'.")
    else:
        logger.critical("Could not connect to RabbitMQ after 5 attempts.")

    yield

    logger.info("FastAPI app is shutting down...")
    if RABBITMQ_CONNECTION:
        await RABBITMQ_CONNECTION.close()
    if HTTPX_CLIENT:
        await HTTPX_CLIENT.aclose()
    if REDIS_CLIENT:
        await REDIS_CLIENT.aclose()
    logger.info("All connections closed. Shutdown complete.")


app = FastAPI(
    title="Email Notification Service",
    lifespan=lifespan
)


@app.get("/health", status_code=200)
def health_check():
    """Endpoint to check if the service is alive."""
    return {"status": "ok", "service": "email-service"}
