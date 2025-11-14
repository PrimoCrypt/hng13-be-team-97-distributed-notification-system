import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		AuthModule,
		UsersModule,
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env', '.env.example'],
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const nodeEnv = configService.get<string>('NODE_ENV', 'development');
				const dbHost = configService.get<string>('DB_HOST', 'localhost');
				const enableSSL =
					configService.get<string>('DB_SSL', 'false').toLowerCase() === 'true';
				const isProduction = nodeEnv === 'production';
				const useSSL =
					enableSSL ||
					(isProduction && dbHost !== 'localhost' && dbHost !== 'postgres');

				return {
					type: 'postgres',
					host: dbHost,
					port: +configService.get<number>('DB_PORT', 5432),
					username: configService.get<string>('DB_USERNAME', 'postgres'),
					password: configService.get<string>('DB_PASSWORD', 'password'),
					database: configService.get<string>('DB_DATABASE', 'nest_auth_db'),
					autoLoadEntities: true,
					synchronize: true,
					...(useSSL && {
						ssl: {
							rejectUnauthorized: false,
						},
					}),
				};
			},
		}),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}

