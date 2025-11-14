import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationStatusDto } from '../dto/notification-status.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiCreatedResponse({
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: ExpressRequest & { headers: { authorization?: string } },
  ) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    const notification = await this.notificationsService.createNotification(
      createNotificationDto,
      token,
    );
    return ResponseUtil.success(
      notification,
      'notification_created',
      ResponseUtil.buildSingleMeta(),
    );
  }

  @Post(':notification_type/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification status' })
  @ApiParam({
    name: 'notification_type',
    enum: ['email', 'push'],
    description: 'Type of notification',
  })
  @ApiOkResponse({
    description: 'Notification status updated successfully',
  })
  async updateStatus(
    @Param('notification_type') notificationType: string,
    @Body() statusDto: NotificationStatusDto,
  ) {
    await this.notificationsService.updateNotificationStatus(
      statusDto.notification_id,
      statusDto.status,
      statusDto.timestamp,
      statusDto.error,
    );
    return ResponseUtil.success(
      null,
      'notification_status_updated',
      ResponseUtil.buildSingleMeta(),
    );
  }

  @Get(':notification_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiOkResponse({
    description: 'Notification retrieved successfully',
    type: NotificationResponseDto,
  })
  async getNotification(@Param('notification_id') notificationId: string) {
    const notification =
      await this.notificationsService.getNotification(notificationId);
    return ResponseUtil.success(
      notification,
      'notification_retrieved',
      ResponseUtil.buildSingleMeta(),
    );
  }
}
