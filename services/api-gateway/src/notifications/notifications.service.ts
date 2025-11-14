import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CircuitBreaker from 'opossum';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';
import {
  CreateNotificationDto,
  NotificationType,
} from '../dto/create-notification.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';

interface UserPreferences {
  email?: boolean;
  push?: boolean;
}

interface RemoteUser {
  id: string;
  preferences?: UserPreferences;
  [key: string]: unknown;
}

interface StandardApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: unknown;
}

type UserServiceResponse = StandardApiResponse<RemoteUser> | RemoteUser;

type HttpServiceError = Error & {
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly userServiceUrl: string;
  private readonly templateServiceUrl: string;
  private readonly notificationStore = new Map<
    string,
    NotificationResponseDto
  >();

  private userServiceBreaker: CircuitBreaker<RemoteUser>;
  private templateServiceBreaker: CircuitBreaker<void>;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ||
      'http://localhost:3001';
    this.templateServiceUrl =
      this.configService.get<string>('TEMPLATE_SERVICE_URL') ||
      'http://localhost:3003';

    // Initialize circuit breakers
    this.initializeCircuitBreakers();
  }

  private initializeCircuitBreakers() {
    // User Service Circuit Breaker
    this.userServiceBreaker = this.circuitBreakerService.getBreaker<RemoteUser>(
      'user-service',
      (userId: string, authToken?: string) =>
        this.callUserService(userId, authToken),
      (userId: string) => this.userServiceFallback(userId),
    );

    // Template Service Circuit Breaker
    this.templateServiceBreaker = this.circuitBreakerService.getBreaker<void>(
      'template-service',
      (templateCode: string) => this.callTemplateService(templateCode),
      () => this.templateServiceFallback(),
    );
  }

  async createNotification(
    createNotificationDto: CreateNotificationDto,
    authToken?: string,
  ): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();

    const existingNotification = Array.from(
      this.notificationStore.values(),
    ).find((n) => n.request_id === createNotificationDto.request_id);

    if (existingNotification) {
      this.logger.log(
        `Idempotent request detected: ${createNotificationDto.request_id}`,
      );
      return existingNotification;
    }

    const user = await this.userServiceBreaker.fire(
      createNotificationDto.user_id,
      authToken,
    );

    if (
      createNotificationDto.notification_type === NotificationType.EMAIL &&
      !user.preferences?.email
    ) {
      throw new BadRequestException('User has email notifications disabled');
    }

    if (
      createNotificationDto.notification_type === NotificationType.PUSH &&
      !user.preferences?.push
    ) {
      throw new BadRequestException('User has push notifications disabled');
    }

    try {
      await this.templateServiceBreaker.fire(
        createNotificationDto.template_code,
      );
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        this.logger.error(
          `Template validation failed for ${createNotificationDto.template_code}`,
        );
        throw error;
      }
      this.logger.warn(
        `Template validation had an issue for ${createNotificationDto.template_code}, but continuing: ${this.formatError(error)}`,
      );
    }

    const metadata = this.cloneMetadata(createNotificationDto.metadata);
    const notification: NotificationResponseDto = {
      notification_id: notificationId,
      request_id: createNotificationDto.request_id,
      notification_type: createNotificationDto.notification_type,
      status: 'pending',
      created_at: timestamp,
      metadata,
    };

    this.notificationStore.set(notificationId, notification);

    const routingKey =
      createNotificationDto.notification_type === NotificationType.EMAIL
        ? 'email'
        : 'push';

    const message = {
      notification_id: notificationId,
      user_id: createNotificationDto.user_id,
      template_code: createNotificationDto.template_code,
      variables: createNotificationDto.variables,
      request_id: createNotificationDto.request_id,
      priority: createNotificationDto.priority || 1,
      metadata,
    };

    const published = await this.rabbitMQService.publishToQueue(
      routingKey,
      message,
      createNotificationDto.priority,
    );

    if (!published) {
      await this.rabbitMQService.publishToQueue('failed', message);
      notification.status = 'failed';
      this.notificationStore.set(notificationId, notification);
      throw new BadRequestException('Failed to publish notification to queue');
    }

    this.logger.log(
      `Notification ${notificationId} created and published to ${routingKey} queue`,
    );

    return notification;
  }

  updateNotificationStatus(
    notificationId: string,
    status: string,
    timestamp?: string,
    error?: string,
  ): void {
    const notification = this.notificationStore.get(notificationId);
    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    notification.status = status;
    if (timestamp) {
      notification.updated_at = timestamp;
    }
    if (error) {
      const currentMetadata = this.cloneMetadata(notification.metadata);
      notification.metadata = {
        ...currentMetadata,
        error,
      };
    }
    this.notificationStore.set(notificationId, notification);
    this.logger.log(
      `Notification ${notificationId} status updated to ${status}`,
    );
  }

  getNotification(notificationId: string): NotificationResponseDto {
    const notification = this.notificationStore.get(notificationId);
    if (!notification) {
      throw new BadRequestException('Notification not found');
    }
    return notification;
  }

  /**
   * Internal method to call User Service (wrapped by circuit breaker)
   */
  private async callUserService(
    userId: string,
    authToken?: string,
  ): Promise<RemoteUser> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await firstValueFrom<AxiosResponse<UserServiceResponse>>(
      this.httpService.get<UserServiceResponse>(
        `${this.userServiceUrl}/api/v1/users/${userId}`,
        {
          headers,
          timeout: 5000,
        },
      ),
    );

    const userData = this.extractUserData(response.data);
    if (!userData) {
      throw new BadRequestException('User not found');
    }
    return userData;
  }

  /**
   * Fallback when User Service circuit is open
   */
  private async userServiceFallback(userId: string): Promise<RemoteUser> {
    this.logger.warn(
      `User Service circuit breaker is OPEN. Using fallback for user ${userId}`,
    );
    // Return a default user with preferences enabled (fail open)
    // This allows notifications to proceed when user service is down
    // In production, you might want to fail closed instead
    return {
      id: userId,
      preferences: {
        email: true,
        push: true,
      },
    };
  }

  /**
   * Internal method to call Template Service (wrapped by circuit breaker)
   */
  private async callTemplateService(templateCode: string): Promise<void> {
    await firstValueFrom(
      this.httpService.get(
        `${this.templateServiceUrl}/api/v1/templates/${templateCode}`,
        {
          timeout: 5000,
        },
      ),
    );
    this.logger.debug(`Template ${templateCode} validated successfully`);
  }

  /**
   * Fallback when Template Service circuit is open
   */
  private async templateServiceFallback(): Promise<void> {
    this.logger.warn(
      'Template Service circuit breaker is OPEN. Skipping template validation',
    );
    // Allow processing to continue when template service is down
    // Template validation is non-critical for notification creation
    return;
  }

  private extractUserData(
    payload: UserServiceResponse,
  ): RemoteUser | undefined {
    if (this.isStandardUserResponse(payload)) {
      return payload.data;
    }
    if (this.isRemoteUser(payload)) {
      return payload;
    }
    return undefined;
  }

  private isStandardUserResponse(
    payload: unknown,
  ): payload is StandardApiResponse<RemoteUser> {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const candidate = payload as Record<string, unknown>;
    return 'data' in candidate;
  }

  private isRemoteUser(payload: unknown): payload is RemoteUser {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const candidate = payload as Record<string, unknown>;
    return typeof candidate.id === 'string';
  }

  private isTimeoutError(error: HttpServiceError): boolean {
    const timeoutMessages = ['ETIMEDOUT', 'timeout', 'ECONNREFUSED'];
    return timeoutMessages.some(
      (timeoutMessage) =>
        error?.message?.includes(timeoutMessage) ||
        error?.code === timeoutMessage,
    );
  }

  private cloneMetadata(metadata: unknown): Record<string, unknown> {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      return { ...(metadata as Record<string, unknown>) };
    }
    return {};
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
