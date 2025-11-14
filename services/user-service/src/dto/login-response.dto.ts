import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
	@ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
	access_token: string;

	@ApiProperty({ example: 'Bearer' })
	token_type: string;

	@ApiProperty({ example: '15h' })
	expires_in: string;

	@ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
	user_id: string;
}

