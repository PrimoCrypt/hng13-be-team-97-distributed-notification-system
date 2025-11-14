import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseUtil } from '../utils/response.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const respObj = exceptionResponse as any;
        message = respObj.message || exception.message;
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
        error = respObj.error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      if (
        exception.name === 'AggregateError' ||
        exception.constructor.name === 'AggregateError'
      ) {
        const aggError = exception as any;
        if (aggError.errors && aggError.errors.length > 0) {
          const firstError = aggError.errors[0];
          if (
            firstError?.code === 'ETIMEDOUT' ||
            firstError?.code === 'ECONNREFUSED'
          ) {
            message = 'Service connection timeout. Please try again later.';
            status = HttpStatus.BAD_GATEWAY;
            error = 'Gateway Timeout';
          }
        }
      }

      if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        message = 'Request timeout. Please try again later.';
        status = HttpStatus.REQUEST_TIMEOUT;
        error = 'Request Timeout';
      }

      this.logger.error(exception.message, exception.stack);
    }

    const errorResponse = ResponseUtil.error(message, error);

    response.status(status).json(errorResponse);
  }
}
