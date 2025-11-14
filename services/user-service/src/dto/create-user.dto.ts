import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 'push-token-123', required: false })
	@IsString()
	@IsOptional()
	push_token?: string;

	@ApiProperty({ example: { email: true, push: true }, required: false })
	@IsObject()
	@IsOptional()
	preferences?: {
		email: boolean;
		push: boolean;
	};
}

