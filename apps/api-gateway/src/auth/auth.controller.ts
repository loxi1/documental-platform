import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { NatsSubjects } from '@documental/shared';

import { NATS_CLIENT } from '../nats/nats-client.provider';

function extractBearerToken(authHeader?: string) {
  if (!authHeader) return '';
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token ?? '' : authHeader;
}

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

  @ApiOperation({ summary: 'Listar workspaces vía API Gateway' })
  @Get('workspaces')
  async listWorkspaces(@Headers('authorization') authorization?: string) {
    return firstValueFrom(
      this.nats.send('auth.workspaces.list', {
        identityToken: extractBearerToken(authorization),
      }),
    );
  }

  @ApiOperation({ summary: 'Seleccionar workspace vía API Gateway' })
  @Post('workspaces/select')
  async selectWorkspace(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const identityToken = extractBearerToken(authorization);
    const payload =
      body && typeof body === 'object' && !Array.isArray(body)
        ? {
            ...body,
            identityToken:
              'identityToken' in body && typeof body.identityToken === 'string'
                ? body.identityToken
                : identityToken,
          }
        : { identityToken };

    return firstValueFrom(
      this.nats.send('auth.workspaces.select', payload),
    );
  }

  @ApiOperation({ summary: 'Seleccionar contexto legacy vía API Gateway' })
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
