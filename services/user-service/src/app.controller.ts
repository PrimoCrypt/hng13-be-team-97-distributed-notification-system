import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ResponseUtil } from './common/utils/response.util';

@ApiTags('Root')
@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	@ApiOperation({ summary: 'Root endpoint' })
	@ApiOkResponse({ description: 'Service information' })
	getHello() {
		return ResponseUtil.success(
			{ service: this.appService.getHello() },
			'service_info',
		);
	}
}

