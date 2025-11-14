import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
		});
	}

	async validate(payload: JwtPayload) {
		if (!payload.sub || !payload.email) {
			throw new UnauthorizedException('Invalid token payload');
		}
		return {
			id: payload.sub,
			email: payload.email,
		};
	}
}

