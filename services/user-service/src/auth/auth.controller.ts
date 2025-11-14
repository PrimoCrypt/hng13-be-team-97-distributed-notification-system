import { Controller, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
	ApiTags,
	ApiOperation,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/register.dto';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { JwtAuthGuard } from '../guards/jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	@ApiOperation({ summary: 'Register a new user' })
	@ApiCreatedResponse({
		description: 'User registered successfully',
	})
	async register(@Body() registerDto: RegisterDto) {
		await this.authService.register(registerDto);
		return ResponseUtil.success(null, 'user_registered');
	}

	@Post('login')
	@ApiOperation({ summary: 'Login and get JWT token' })
	@ApiOkResponse({
		description: 'Login successful',
		type: LoginResponseDto,
	})
	async login(@Body() createAuthDto: CreateAuthDto) {
		const result = await this.authService.login(createAuthDto);
		return ResponseUtil.success(result, 'login_successful');
	}

	@Patch('change-password')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Change user password' })
	@ApiOkResponse({
		description: 'Password changed successfully',
	})
	async changePassword(
		@Request() req: ExpressRequest & { user: { id: string } },
		@Body() changePasswordDto: ChangePasswordDto,
	) {
		await this.authService.changePassword(req.user.id, changePasswordDto);
		return ResponseUtil.success(null, 'password_changed');
	}
}

