import {
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

export type SafeUser = Omit<User, 'password_hash'>;

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	private sanitizeUser(user: User): SafeUser {
		const { password_hash: _passwordHash, ...safeUser } = user;
		return safeUser;
	}

	async createUserWithAuth(
		email: string,
		passwordHash: string,
		name: string,
	): Promise<SafeUser> {
		const user = this.userRepository.create({
			email,
			name,
			password_hash: passwordHash,
			push_token: null,
			preferences: {
				email: true,
				push: true,
			},
		});
		const created = await this.userRepository.save(user);
		return this.sanitizeUser(created);
	}

	async createUserWithFullDetails(registerDto: {
		email: string;
		password: string;
		name: string;
		push_token?: string | null;
		preferences?: { email: boolean; push: boolean };
	}): Promise<SafeUser> {
		const user = this.userRepository.create({
			email: registerDto.email,
			name: registerDto.name,
			password_hash: registerDto.password,
			push_token: registerDto.push_token ?? null,
			preferences: registerDto.preferences ?? {
				email: true,
				push: true,
			},
		});
		const created = await this.userRepository.save(user);
		return this.sanitizeUser(created);
	}

	async createUserWithFullDetailsAndHash(registerDto: {
		email: string;
		password: string;
		name: string;
		push_token?: string | null;
		preferences?: { email: boolean; push: boolean };
	}): Promise<SafeUser> {
		const saltRounds = 12;
		const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

		return this.createUserWithFullDetails({
			...registerDto,
			password: passwordHash,
		});
	}

	async create(createUserDto: CreateUserDto): Promise<SafeUser> {
		const user = this.userRepository.create({
			name: createUserDto.name,
			push_token: createUserDto.push_token ?? null,
			preferences: {
				email: createUserDto.preferences?.email ?? true,
				push: createUserDto.preferences?.push ?? true,
			},
		});
		const created = await this.userRepository.save(user);
		return this.sanitizeUser(created);
	}

	async updatePassword(userId: string, passwordHash: string): Promise<void> {
		await this.userRepository.update(userId, {
			password_hash: passwordHash,
		});
	}

	async findAll(
		limit = 10,
		page = 1,
	): Promise<{ users: SafeUser[]; total: number }> {
		const take = Math.max(1, Math.min(100, Number(limit)));
		const currentPage = Math.max(1, Number(page));
		const [users, total] = await this.userRepository.findAndCount({
			take,
			skip: (currentPage - 1) * take,
			order: { created_at: 'DESC' },
		});
		return { users: users.map((user) => this.sanitizeUser(user)), total };
	}

	async findOne(id: string): Promise<SafeUser> {
		const user = await this.userRepository.findOne({ where: { id } });
		if (!user) throw new NotFoundException('User not found');
		return this.sanitizeUser(user);
	}

	async findEntityById(id: string): Promise<User> {
		const user = await this.userRepository.findOne({ where: { id } });
		if (!user) throw new NotFoundException('User not found');
		return user;
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
		const user = await this.findEntityById(id);
		if (updateUserDto.name !== undefined) user.name = updateUserDto.name;
		if (updateUserDto.push_token !== undefined)
			user.push_token = updateUserDto.push_token ?? null;
		if (updateUserDto.preferences !== undefined) {
			user.preferences = {
				email: updateUserDto.preferences.email ?? user.preferences.email,
				push: updateUserDto.preferences.push ?? user.preferences.push,
			};
		}
		const updated = await this.userRepository.save(user);
		return this.sanitizeUser(updated);
	}

	async remove(id: string): Promise<void> {
		await this.userRepository.delete({ id });
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	async comparePassword(
		password: string,
		passwordHash: string,
	): Promise<boolean> {
		return bcrypt.compare(password, passwordHash);
	}

	async getSafeUserById(id: string): Promise<SafeUser> {
		const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.sanitizeUser(user);
	}

	async validateUserCredentials(
		email: string,
		password: string,
	): Promise<SafeUser> {
		const user = await this.findByEmail(email);
		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}
		const passwordMatches = await this.comparePassword(
			password,
			user.password_hash,
		);
		if (!passwordMatches) {
			throw new UnauthorizedException('Invalid credentials');
		}
		return this.sanitizeUser(user);
	}
}

