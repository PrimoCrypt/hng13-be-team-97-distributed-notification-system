import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ResponseUtil } from '../common/utils/response.util';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({ description: 'Service is healthy' })
  health() {
    return ResponseUtil.success({ status: 'ok' }, 'healthy');
  }
}
