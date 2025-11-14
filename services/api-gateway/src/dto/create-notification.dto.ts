import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
}

export class UserData {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com/reset-password' })
  @IsString()
  @IsNotEmpty()
  link: string;

  @ApiProperty({ example: { key: 'value' }, required: false })
  @IsObject()
  @IsOptional()
  meta?: Record<string, unknown>;
}

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  notification_type: NotificationType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'welcome_email' })
  @IsString()
  @IsNotEmpty()
  template_code: string;

  @ApiProperty({ type: UserData })
  @IsObject()
  @IsNotEmpty()
  variables: UserData;

  @ApiProperty({ example: 'req-123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  request_id: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 10, required: false })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number;

  @ApiProperty({ example: { source: 'api' }, required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
