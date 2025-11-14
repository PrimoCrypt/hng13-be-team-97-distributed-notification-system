import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ResponseUtil } from './common/utils/response.util';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'API Gateway health check' })
  @ApiOkResponse({ description: 'Service is healthy' })
  health() {
    return ResponseUtil.success({ status: 'ok' }, 'healthy');
  }
}
