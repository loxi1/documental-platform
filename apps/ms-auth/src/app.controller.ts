import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('sistema')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check del microservicio, PostgreSQL y NATS' })
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @ApiOperation({ summary: 'Liveness check del microservicio de autenticación' })
  @Get('live')
  getLive() {
    return this.appService.getLive();
  }

  @ApiOperation({ summary: 'Readiness check del microservicio de autenticación' })
  @Get('ready')
  getReady() {
    return this.appService.getReady();
  }

  @ApiOperation({ summary: 'Versión del microservicio de autenticación' })
  @Get('version')
  getVersion() {
    return this.appService.getVersion();
  }
}