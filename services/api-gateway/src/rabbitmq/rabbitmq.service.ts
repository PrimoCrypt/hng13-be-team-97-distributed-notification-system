import {
	Injectable,
	Logger,
	OnModuleInit,
	OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, Channel, Options } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RabbitMQService.name);
	private connection: any = null;
	private channel: Channel | null = null;
	private readonly exchangeName = 'notifications.direct';
	private readonly emailQueue = 'email.queue';
	private readonly pushQueue = 'push.queue';
	private readonly failedQueue = 'failed.queue';

	constructor(private readonly configService: ConfigService) {}

	async onModuleInit() {
		await this.connect();
		await this.setupExchangeAndQueues();
	}

	async onModuleDestroy() {
		await this.close();
	}

	private async connect() {
		try {
			const rabbitmqUrl =
				this.configService.get<string>('RABBITMQ_URL') ||
				'amqp://guest:guest@localhost:5672';

			this.connection = await connect(rabbitmqUrl);
			this.channel = await this.connection.createChannel();

			this.connection.on('error', (err) => {
				this.logger.error('RabbitMQ connection error:', err);
			});

			this.connection.on('close', () => {
				this.logger.warn('RabbitMQ connection closed');
			});

			this.logger.log('Connected to RabbitMQ');
		} catch (error) {
			this.logger.error('Failed to connect to RabbitMQ:', error);
			throw error;
		}
	}

	private async setupExchangeAndQueues() {
		try {
			if (!this.channel) {
				throw new Error('Channel not available');
			}
			await this.channel.assertExchange(this.exchangeName, 'direct', {
				durable: true,
			});

			await this.channel.assertQueue(this.emailQueue, { durable: true });
			await this.channel.assertQueue(this.pushQueue, { durable: true });
			await this.channel.assertQueue(this.failedQueue, { durable: true });

			await this.channel.bindQueue(this.emailQueue, this.exchangeName, 'email');
			await this.channel.bindQueue(this.pushQueue, this.exchangeName, 'push');
			await this.channel.bindQueue(
				this.failedQueue,
				this.exchangeName,
				'failed',
			);

			this.logger.log('Exchange and queues setup completed');
		} catch (error) {
			this.logger.error('Failed to setup exchange and queues:', error);
			throw error;
		}
	}

	async publishToQueue(
		routingKey: 'email' | 'push' | 'failed',
		message: object,
		priority?: number,
	): Promise<boolean> {
		try {
			if (!this.channel) {
				throw new Error('RabbitMQ channel not available');
			}

			const messageBuffer = Buffer.from(JSON.stringify(message));
			const options: Options.Publish = {
				persistent: true,
			};

			if (priority !== undefined) {
				options.priority = priority;
			}

			const result = this.channel.publish(
				this.exchangeName,
				routingKey,
				messageBuffer,
				options,
			);

			if (result) {
				this.logger.debug(
					`Message published to ${routingKey} queue: ${JSON.stringify(message)}`,
				);
			} else {
				this.logger.warn(`Failed to publish message to ${routingKey} queue`);
			}

			return result;
		} catch (error) {
			this.logger.error(`Error publishing to ${routingKey} queue:`, error);
			throw error;
		}
	}

	async close() {
		try {
			if (this.channel) {
				await this.channel.close();
			}
			if (this.connection) {
				await this.connection.close();
			}
			this.logger.log('RabbitMQ connection closed');
		} catch (error) {
			this.logger.error('Error closing RabbitMQ connection:', error);
		}
	}

	isConnected(): boolean {
		return this.connection !== null && this.channel !== null;
	}
}

