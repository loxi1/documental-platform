import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
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

  private async assertAdminAuthorization(authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = extractBearerToken(authHeader);

    try {
      const response = await firstValueFrom(
        this.nats.send(NatsSubjects.AuthValidateToken, { token }),
      );

      if (!response?.valid || !response?.payload) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      if (response.payload.perfil !== 'admin') {
        throw new ForbiddenException(
          'Solo el perfil admin puede consultar administración de accesos',
        );
      }

      return token;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

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


  @ApiOperation({ summary: 'Listar usuarios sanitizados para administración de accesos' })
  @Get('usuarios')
  async listUsuariosAdmin(@Headers('authorization') authorization?: string) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.usuarios.list', { accessToken }),
    );
  }

  @ApiOperation({ summary: 'Obtener usuario sanitizado para administración de accesos' })
  @Get('usuarios/:id')
  async findUsuarioAdminById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.usuarios.get', { accessToken, id }),
    );
  }

  @ApiOperation({ summary: 'Listar perfiles para administración de accesos' })
  @Get('perfiles')
  async listPerfilesAdmin(@Headers('authorization') authorization?: string) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.perfiles.list', { accessToken }),
    );
  }

  @ApiOperation({ summary: 'Obtener perfil para administración de accesos' })
  @Get('perfiles/:id')
  async findPerfilAdminById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.perfiles.get', { accessToken, id }),
    );
  }

  @ApiOperation({ summary: 'Listar workspaces de usuarios para administración de accesos' })
  @Get('usuario-workspaces')
  async listUsuarioWorkspacesAdmin(
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.usuario-workspaces.list', { accessToken }),
    );
  }

  @ApiOperation({ summary: 'Listar workspaces de un usuario para administración de accesos' })
  @Get('usuarios/:id/workspaces')
  async listWorkspacesByUsuarioAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = await this.assertAdminAuthorization(authorization);

    return firstValueFrom(
      this.nats.send('auth.admin.usuario-workspaces.list', {
        accessToken,
        usuarioId: id,
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
