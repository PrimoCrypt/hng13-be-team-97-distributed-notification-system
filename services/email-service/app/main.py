import logging
import json
import asyncio
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import datetime
from email.message import EmailMessage
from functools import wraps

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
)

# ------------------------------
# 1. Logging
# ------------------------------
setup_logging()
logger = logging.getLogger(__name__)

# ------------------------------
# 2. Global Clients
# ------------------------------
HTTPX_CLIENT: httpx.AsyncClient | None = None
REDIS_CLIENT: Redis | None = None
RABBITMQ_CONNECTION: aio_pika.Connection | None = None


# ------------------------------
# 3. Circuit Breaker (Email)
# ------------------------------
mail_circuit_breaker = AsyncCircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    name="EmailSMTPCircuitBreaker"
)

# ------------------------------
# 4. External URLs
# ------------------------------
USER_SERVICE_URL = "http://user-service:8000/api/v1/users"
TEMPLATE_SERVICE_URL = "http://template-service:8000/api/v1/templates"


# ------------------------------
# 5. Retry Decorator
# ------------------------------
class StopRetry(Exception):
    """Raise when retry must stop immediately."""
    pass


def retry_async(retries=3, delay=0.5, backoff=2):
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            attempt_delay = delay

            for attempt in range(1, retries + 1):
                try:
                    return await fn(*args, **kwargs)

                except StopRetry as e:
                    logger.warning(f"Retry stopped explicitly: {e}")
                    return None

                except Exception as e:
                    logger.error(f"Attempt {attempt} failed: {e}")
                    if attempt == retries:
                        raise

                    await asyncio.sleep(attempt_delay)
                    attempt_delay *= backoff

        return wrapper
    return decorator


# ------------------------------
# 6. Helper Functions
# ------------------------------
@retry_async(retries=3)
async def fetch_user_details(user_id: UUID):
    try:
        response = await HTTPX_CLIENT.get(f"{USER_SERVICE_URL}/{user_id}")
        response.raise_for_status()
        return UserResponse.model_validate(response.json())

    except httpx.HTTPStatusError as e:
        # Stop retrying on 4xx
        if 400 <= e.response.status_code < 500:
            raise StopRetry(f"User lookup returned {e.response.status_code}")
        raise


@retry_async(retries=3)
async def fetch_template(template_code: str) -> TemplateResponse | None:
    try:
        url = f"{TEMPLATE_SERVICE_URL}/{template_code}"
        response = await HTTPX_CLIENT.get(url)
        response.raise_for_status()
        return TemplateResponse.model_validate(response.json())

    except httpx.HTTPStatusError as e:
        logger.error(f"Template fetch error {template_code}: {e}")
        if 400 <= e.response.status_code < 500:
            raise StopRetry("Fatal template error")
        raise
    except httpx.RequestError as e:
        logger.error(f"Network error: {e}")
        raise


@retry_async(retries=3)
async def save_status_to_redis(notification_id: str, status: str):
    logger.info(f"Saving status '{status}' for {notification_id} to Redis")
    try:
        key = f"notification:{notification_id}"
        value = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        await REDIS_CLIENT.hset(key, mapping=value)

    except Exception as e:
        logger.error(f"Failed to save status to Redis: {e}")
        raise


async def report_status(request_id: str, status: str, error_msg: str = None):
    try:
        await save_status_to_redis(request_id, status)
    except Exception as e:
        logger.error(f"Could not report status for {request_id}: {e}")


# ------------------------------
# 7. Sending Email
# ------------------------------
@mail_circuit_breaker
async def send_email(to_email: str, subject: str, body_text: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_SENDER
    msg["To"] = to_email
    msg.set_content(body_text)   # PLAIN TEXT ONLY

    await aiosmtplib.send(
        msg,
        hostname=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
    )

    logger.info(f"Email sent to {to_email}")


# ------------------------------
# 8. Main Processing
# ------------------------------
async def process_email_request(request: NotificationRequest) -> bool:
    idempotency_key = f"idempotency:email:{request.request_id}"

    try:
        # Idempotency
        if await REDIS_CLIENT.get(idempotency_key):
            logger.warning(f"Duplicate request: {request.request_id}")
            return True

        # User lookup
        user = await fetch_user_details(request.user_id)
        if not user:
            await report_status(request.request_id, "failed", "User not found")
            return True

        if not user.preferences.email:
            logger.info(f"User {user.email} disabled email")
            return True

        # Template
        template_data = await fetch_template(request.template_code)
        if not template_data:
            return False  # retryable

        # Render template (plain text)
        try:
            template = Environment(loader=BaseLoader()).from_string(template_data.body)
            body_text = template.render(request.variables.model_dump())
            subject = template_data.subject
        except Exception as e:
            logger.error(f"Template render failure: {e}")
            await report_status(request.request_id, "failed", str(e))
            return True

        # Send email
        await send_email(user.email, subject, body_text)

        # Cache idempotency
        await REDIS_CLIENT.set(idempotency_key, "processed", ex=3600)

        # Final status
        await report_status(request.request_id, "delivered")
        return True

    except aiosmtplib.SMTPException as e:
        logger.error(f"SMTP failure: {e}")
        return False

    except httpx.RequestError as e:
        logger.error(f"Network error: {e}")
        return False

    except Exception as e:
        logger.critical(f"Fatal email service error: {e}")
        await report_status(request.request_id, "failed", str(e))
        return True


# ------------------------------
# 9. RabbitMQ Consumer
# ------------------------------
async def on_message(message: aio_pika.IncomingMessage):
    try:
        body = message.body.decode()
        logger.info(f"Received: {body}")

        request = NotificationRequest.model_validate_json(body)
        success = await process_email_request(request)

        if success:
            await message.ack()
        else:
            logger.warning(f"NACK → {request.request_id}")
            await message.nack(requeue=False)

    except json.JSONDecodeError:
        logger.error("Invalid JSON → ACK")
        await message.ack()

    except Exception as e:
        logger.critical(f"Unprocessable: {e}")
        await message.ack()


# ------------------------------
# 10. FastAPI Lifespan
# ------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global HTTPX_CLIENT, REDIS_CLIENT, RABBITMQ_CONNECTION

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
            break
        except Exception as e:
            logger.warning(f"RabbitMQ retry {i+1}/5: {e}")
            await asyncio.sleep(5)

    if connected:
        channel = await RABBITMQ_CONNECTION.channel()
        await channel.set_qos(prefetch_count=10)

        exchange = await channel.declare_exchange(
            "notifications.direct",
            durable=True,
            type=aio_pika.ExchangeType.DIRECT
        )

        failed_queue = await channel.declare_queue("failed.queue", durable=True)
        email_queue = await channel.declare_queue(
            "email.queue",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "notifications.direct",
                "x-dead-letter-routing-key": "failed.queue",
            }
        )

        await email_queue.bind(exchange, "email.queue")
        await failed_queue.bind(exchange, "failed.queue")

        await email_queue.consume(on_message)
        logger.info("Email consumer started")

    yield

    # Shutdown
    if RABBITMQ_CONNECTION:
        await RABBITMQ_CONNECTION.close()
    if HTTPX_CLIENT:
        await HTTPX_CLIENT.aclose()
    if REDIS_CLIENT:
        await REDIS_CLIENT.aclose()


# ------------------------------
# 11. FastAPI App
# ------------------------------
app = FastAPI(
    title="Email Notification Service",
    lifespan=lifespan
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "email-service"}
