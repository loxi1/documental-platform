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
}
