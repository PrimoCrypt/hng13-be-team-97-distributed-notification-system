import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class NotificationStatusDto {
  @ApiProperty({ example: 'notif-123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  notification_id: string;

  @ApiProperty({
    example: 'sent',
    enum: ['pending', 'sent', 'failed', 'delivered'],
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: '2024-01-01T00:05:00Z', required: false })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({ example: 'Bounce detected', required: false })
  @IsString()
  @IsOptional()
  error?: string;
}
