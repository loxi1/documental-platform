import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { NatsSubjects } from '@documental/shared';

import { NATS_CLIENT } from '../nats/nats-client.provider';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(NATS_CLIENT)
    private readonly nats: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Login vía API Gateway' })
  @Post('login')
  async login(@Body() body: unknown) {
    return firstValueFrom(
      this.nats.send(NatsSubjects.AuthLogin, body),
    );
  }

  @ApiOperation({ summary: 'Seleccionar contexto vía API Gateway' })
  @Post('select-context')
  async selectContext(@Body() body: unknown) {
    return firstValueFrom(
      this.nats.send(NatsSubjects.AuthSelectContext, body),
    );
  }

  @ApiOperation({ summary: 'Validar token vía API Gateway' })
  @Post('validate-token')
  async validateToken(@Body() body: unknown) {
    return firstValueFrom(
      this.nats.send(NatsSubjects.AuthValidateToken, body),
    );
  }
}
