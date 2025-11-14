import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UserPreferencesDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  email?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  push?: boolean;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'push-token-123', required: false })
  @IsString()
  @IsOptional()
  push_token?: string;

  @ApiProperty({ type: UserPreferencesDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;
}
