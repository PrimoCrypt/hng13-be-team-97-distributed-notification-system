import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
	id: string;

	@ApiProperty({ example: 'user@example.com' })
	email: string;

	@ApiProperty({ example: 'John Doe' })
	name: string;

	@ApiProperty({ example: 'push-token-123', nullable: true })
	push_token: string | null;

	@ApiProperty({ example: { email: true, push: true } })
	preferences: {
		email: boolean;
		push: boolean;
	};

	@ApiProperty({ example: '2024-01-01T00:00:00Z' })
	created_at: Date;

	@ApiProperty({ example: '2024-01-01T00:00:00Z' })
	updated_at: Date;
}

