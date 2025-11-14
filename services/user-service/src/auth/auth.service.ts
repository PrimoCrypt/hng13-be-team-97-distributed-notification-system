import {
	Injectable,
	ConflictException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { RegisterDto } from '../dto/register.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
	private readonly jwtExpiresIn: string;

	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {
		this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
	}

	private async hashPassword(password: string): Promise<string> {
		const saltRounds = 12;
		return bcrypt.hash(password, saltRounds);
	}

	async register(registerDto: RegisterDto): Promise<void> {
		const existingUser = await this.usersService.findByEmail(registerDto.email);
		if (existingUser) {
			throw new ConflictException('User with this email already exists');
		}

		const passwordHash = await this.hashPassword(registerDto.password);

		// Normalize preferences to ensure both email and push are boolean values
		const preferences = registerDto.preferences
			? {
					email: registerDto.preferences.email ?? true,
					push: registerDto.preferences.push ?? true,
				}
			: undefined;

		await this.usersService.createUserWithFullDetails({
			email: registerDto.email,
			password: passwordHash,
			name: registerDto.name,
			push_token: registerDto.push_token,
			preferences,
		});
	}

	async login(createAuthDto: CreateAuthDto): Promise<LoginResponseDto> {
		const user = await this.usersService.validateUserCredentials(
			createAuthDto.email,
			createAuthDto.password,
		);

		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
		};

		const accessToken = await this.jwtService.signAsync(payload);

		return {
			access_token: accessToken,
			token_type: 'Bearer',
			expires_in: this.jwtExpiresIn,
			user_id: user.id,
		};
	}

	async changePassword(
		userId: string,
		changePasswordDto: ChangePasswordDto,
	): Promise<void> {
		const user = await this.usersService.findEntityById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		const isCurrentPasswordValid = await bcrypt.compare(
			changePasswordDto.currentPassword,
			user.password_hash,
		);

		if (!isCurrentPasswordValid) {
			throw new UnauthorizedException('Current password is incorrect');
		}

		const newPasswordHash = await this.hashPassword(
			changePasswordDto.newPassword,
		);

		await this.usersService.updatePassword(userId, newPasswordHash);
	}
}

