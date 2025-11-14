import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);

	app.enableCors();
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: { enableImplicitConversion: true },
		}),
	);
	app.useGlobalFilters(new HttpErrorFilter());
	app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

	const apiPrefix = configService.get<string>('API_PREFIX', 'api');
	const apiVersion = configService.get<string>('API_VERSION', 'v1');
	app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);
	const swaggerEnabled = configService.get<string>('ENABLE_SWAGGER', 'true').toLowerCase() === 'true';

	if (swaggerEnabled) {
		const swaggerConfig = new DocumentBuilder()
			.setTitle('Notification User Service')
			.setDescription('User management microservice for distributed notification system')
			.setVersion(apiVersion)
			.addBearerAuth(
				{
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
				'Bearer',
			)
			.build();

		const document = SwaggerModule.createDocument(app, swaggerConfig);
		const swaggerPath = configService.get<string>('SWAGGER_PATH', 'docs');
		const fullSwaggerPath = `${apiPrefix}/${apiVersion}/${swaggerPath}`;
		SwaggerModule.setup(fullSwaggerPath, app, document, {
			swaggerOptions: {
				persistAuthorization: true,
				displayRequestDuration: true,
				filter: true,
				tryItOutEnabled: true,
			},
			customSiteTitle: 'User Service API Docs',
		});
	}

	const port = configService.get<number>('PORT', 3001);
	await app.listen(port, '0.0.0.0');
	const logger = new Logger('Bootstrap');
	logger.log(`User service running on http://localhost:${port}`);
}
void bootstrap();																																																																																																																																																																																																																																																																																																																																																																																																																																																	
