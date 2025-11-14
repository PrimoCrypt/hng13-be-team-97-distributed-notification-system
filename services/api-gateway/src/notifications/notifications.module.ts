import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';

@Module({
  imports: [HttpModule, RabbitMQModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, CircuitBreakerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
