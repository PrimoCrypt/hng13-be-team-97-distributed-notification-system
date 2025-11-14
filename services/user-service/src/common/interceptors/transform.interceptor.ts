import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_WRAP } from '../decorators/skip-wrap.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
		const skip = this.reflector.get<boolean>(SKIP_WRAP, ctx.getHandler());
		if (skip) return next.handle();

		return next.handle().pipe(
			map((result: unknown) => {
				if (
					result &&
					typeof result === 'object' &&
					'success' in result &&
					'message' in result &&
					'meta' in result
				) {
					return result;
				}

				return result;
			}),
		);
	}
}

