import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  total_pages: number;

  @ApiProperty({ example: true })
  has_next: boolean;

  @ApiProperty({ example: false })
  has_previous: boolean;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'notif-123e4567-e89b-12d3-a456-426614174000' })
  notification_id: string;

  @ApiProperty({ example: 'req-123e4567-e89b-12d3-a456-426614174000' })
  request_id: string;

  @ApiProperty({ example: 'email' })
  notification_type: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  created_at: string;

  @ApiProperty({
    example: '2024-01-01T00:05:00Z',
    required: false,
    nullable: true,
  })
  updated_at?: string | null;

  @ApiProperty({
    example: { provider: 'ses', error: 'Bounce detected' },
    required: false,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}
