import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe Updated', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'push-token-456', required: false })
  @IsString()
  @IsOptional()
  push_token?: string | null;

  @ApiProperty({ example: { email: false, push: true }, required: false })
  @IsObject()
  @IsOptional()
  preferences?: {
    email?: boolean;
    push?: boolean;
  };
}
