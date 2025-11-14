import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ||
      'http://localhost:3001';
  }

  async proxyRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const url = `${this.userServiceUrl}/api/v1${path}`;
      const config = {
        headers: headers || {},
        timeout: 10000,
      };

      let response: AxiosResponse;

      switch (method) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(url, config));
          break;
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, body, config),
          );
          break;
        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, body, config),
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(url, config));
          break;
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error proxying ${method} ${path}: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        // Forward the error response from user service
        throw new HttpException(
          error.response.data || error.message,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'User service unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
