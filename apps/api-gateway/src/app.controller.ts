import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('sistema')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check del API Gateway' })
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @ApiOperation({ summary: 'Liveness check del API Gateway' })
  @Get('live')
  getLive() {
    return this.appService.getLive();
  }

  @ApiOperation({ summary: 'Readiness check del API Gateway' })
  @Get('ready')
  getReady() {
    return this.appService.getReady();
  }

  @ApiOperation({ summary: 'Versión del API Gateway' })
  @Get('version')
  getVersion() {
    return this.appService.getVersion();
  }
}