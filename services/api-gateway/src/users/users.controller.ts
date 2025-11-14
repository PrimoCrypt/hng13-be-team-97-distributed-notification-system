import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'Current user profile retrieved',
    type: UserResponseDto,
  })
  async getMe(@Request() req: ExpressRequest) {
    const authHeader = req.headers.authorization;
    return this.usersService.proxyRequest('GET', '/users/me', undefined, {
      Authorization: authHeader || '',
    });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    description: 'Profile updated',
    type: UserResponseDto,
  })
  async updateMe(
    @Request() req: ExpressRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const authHeader = req.headers.authorization;
    return this.usersService.proxyRequest('PATCH', '/users/me', updateUserDto, {
      Authorization: authHeader || '',
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'User service health check' })
  @ApiOkResponse({ description: 'Service health status' })
  async health() {
    return this.usersService.proxyRequest('GET', '/users/health');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Retrieve paginated users' })
  @ApiOkResponse({
    description: 'Paginated users retrieved',
    type: [UserResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  async findAll(
    @Request() req: ExpressRequest,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const authHeader = req.headers.authorization;
    let path = '/users';
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (page) params.append('page', page);
    if (params.toString()) {
      path += `?${params.toString()}`;
    }
    return this.usersService.proxyRequest('GET', path, undefined, {
      Authorization: authHeader || '',
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiParam({ name: 'id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({
    description: 'User retrieved',
    type: UserResponseDto,
  })
  async findOne(@Request() req: ExpressRequest, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    return this.usersService.proxyRequest('GET', `/users/${id}`, undefined, {
      Authorization: authHeader || '',
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({ name: 'id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    description: 'User updated',
    type: UserResponseDto,
  })
  async update(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const authHeader = req.headers.authorization;
    return this.usersService.proxyRequest(
      'PATCH',
      `/users/${id}`,
      updateUserDto,
      {
        Authorization: authHeader || '',
      },
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  async remove(@Request() req: ExpressRequest, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    return this.usersService.proxyRequest('DELETE', `/users/${id}`, undefined, {
      Authorization: authHeader || '',
    });
  }
}
