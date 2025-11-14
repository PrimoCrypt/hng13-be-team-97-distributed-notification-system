import {
  Controller,
  Post,
  Body,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterDto } from '../dto/register.dto';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginResponseDto } from '../dto/login-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.proxyRequest('POST', '/auth/register', registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiBody({ type: CreateAuthDto })
  @ApiOkResponse({
    description: 'Login successful',
    type: LoginResponseDto,
  })
  async login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.proxyRequest('POST', '/auth/login', createAuthDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed successfully',
  })
  async changePassword(
    @Request() req: ExpressRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const authHeader = req.headers.authorization;
    return this.authService.proxyRequest(
      'PATCH',
      '/auth/change-password',
      changePasswordDto,
      {
        Authorization: authHeader || '',
      },
    );
  }
}
