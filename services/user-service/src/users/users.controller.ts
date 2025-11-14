import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { UserResponseDto } from '../dto/user-response.dto';
import type { SafeUser } from './users.service';
import { ResponseUtil } from '../common/utils/response.util';

const responseMetaSchema = {
	type: 'object',
	properties: {
		total: { type: 'number', example: 1 },
		limit: { type: 'number', example: 1 },
		page: { type: 'number', example: 1 },
		total_pages: { type: 'number', example: 1 },
		has_next: { type: 'boolean', example: false },
		has_previous: { type: 'boolean', example: false },
	},
};

const buildEnvelopeSchema = (
	dataSchema: Record<string, unknown>,
	messageExample: string,
) => ({
	type: 'object',
	properties: {
		success: { type: 'boolean', example: true },
		data: dataSchema,
		message: { type: 'string', example: messageExample },
		meta: responseMetaSchema,
	},
});

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
		schema: buildEnvelopeSchema(
			{ $ref: '#/components/schemas/UserResponseDto' },
			'profile_fetched',
		),
	})
	async getMe(@Request() req: ExpressRequest & { user: SafeUser }) {
		const user = await this.usersService.findOne(req.user.id);
		return ResponseUtil.success(user, 'profile_fetched');
	}

	@Patch('me')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Update current user profile' })
	@ApiOkResponse({
		description: 'Profile updated',
		schema: buildEnvelopeSchema(
			{ $ref: '#/components/schemas/UserResponseDto' },
			'profile_updated',
		),
	})
	async updateMe(
		@Request() req: ExpressRequest & { user: SafeUser },
		@Body() updateUserDto: UpdateUserDto,
	) {
		const user = await this.usersService.update(req.user.id, updateUserDto);
		return ResponseUtil.success(user, 'profile_updated');
	}

	@Get('health')
	@ApiOperation({ summary: 'User service health check' })
	@ApiOkResponse({
		description: 'Service health status',
		schema: buildEnvelopeSchema(
			{
				type: 'object',
				properties: {
					status: { type: 'string', example: 'ok' },
				},
			},
			'healthy',
		),
	})
	health() {
		return ResponseUtil.success({ status: 'ok' }, 'healthy');
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Retrieve paginated users' })
	@ApiOkResponse({
		description: 'Paginated users retrieved',
		schema: buildEnvelopeSchema(
			{
				type: 'array',
				items: { $ref: '#/components/schemas/UserResponseDto' },
			},
			'users_fetched',
		),
	})
	async findAll(@Query('limit') limit?: string, @Query('page') page?: string) {
		const inputLimit = limit ? Number(limit) : 10;
		const normalizedLimit = Math.max(1, Math.min(100, inputLimit));
		const inputPage = page ? Number(page) : 1;
		const normalizedPage = Math.max(1, inputPage);

		const { users, total } = await this.usersService.findAll(
			normalizedLimit,
			normalizedPage,
		);

		return ResponseUtil.success(
			users,
			'users_fetched',
			ResponseUtil.buildPaginationMeta(total, normalizedLimit, normalizedPage),
		);
	}

	@Get(':id')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Retrieve a user by ID' })
	@ApiOkResponse({
		description: 'User retrieved',
		schema: buildEnvelopeSchema(
			{ $ref: '#/components/schemas/UserResponseDto' },
			'user_fetched',
		),
	})
	async findOne(@Param('id') id: string) {
		const user = await this.usersService.findOne(id);
		return ResponseUtil.success(user, 'user_fetched');
	}

	@Patch(':id')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Update an existing user' })
	@ApiOkResponse({
		description: 'User updated',
		schema: buildEnvelopeSchema(
			{ $ref: '#/components/schemas/UserResponseDto' },
			'user_updated',
		),
	})
	async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
		const user = await this.usersService.update(id, updateUserDto);
		return ResponseUtil.success(user, 'user_updated');
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('Bearer')
	@ApiOperation({ summary: 'Delete a user' })
	@ApiOkResponse({
		description: 'User deleted successfully',
		schema: buildEnvelopeSchema(
			{ type: 'null', nullable: true },
			'user_deleted',
		),
	})
	async remove(@Param('id') id: string) {
		await this.usersService.remove(id);
		return ResponseUtil.success(null, 'user_deleted', {
			total: 0,
			limit: 0,
			page: 0,
			total_pages: 0,
			has_next: false,
			has_previous: false,
		});
	}
}

