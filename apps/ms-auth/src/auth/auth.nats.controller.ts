import { Controller, HttpException, UnauthorizedException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { NatsSubjects } from '@documental/shared';

import { AuthService } from './auth.service';
import { changePasswordSchema } from './schemas/change-password.schema';
import { loginSchema } from './schemas/login.schema';
import { selectContextSchema } from './schemas/select-context.schema';
import { selectWorkspaceSchema } from './schemas/select-workspace.schema';
import { validateTokenSchema } from './schemas/validate-token.schema';
import { workspacesSchema } from './schemas/workspaces.schema';

const authNamespace = process.env.AUTH_NATS_NAMESPACE ?? 'auth';
if (authNamespace !== 'auth' && authNamespace !== 'dev.source.auth') {
  throw new Error('AUTH_NATS_NAMESPACE inválido');
}
function authPattern(pattern: string): string {
  if (!pattern.startsWith('auth.')) throw new Error('Patrón Auth inválido');
  return `${authNamespace}${pattern.slice(4)}`;
}

@Controller()
export class AuthNatsController {
  constructor(private readonly service: AuthService) {
    if ((process.env.AUTH_NATS_NAMESPACE ?? 'auth') !== authNamespace) {
      throw new Error('Exporte AUTH_NATS_NAMESPACE antes de iniciar Auth');
    }
  }

  @MessagePattern(authPattern(NatsSubjects.AuthLogin))
  async login(@Payload() payload: unknown) {
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) throw new RpcException({ statusCode: 400, message: 'Datos de autenticación inválidos' });
    try {
      return await this.service.login(parsed.data);
    } catch (error) {
      const statusCode = error instanceof HttpException && error.getStatus() === 401 ? 401 : 500;
      throw new RpcException({ statusCode, message: statusCode === 401 ? 'Credenciales inválidas' : 'No se pudo completar la autenticación' });
    }
  }

  @MessagePattern(authPattern('auth.workspaces.list'))
  listWorkspaces(@Payload() payload: unknown) {
    const dto = workspacesSchema.parse(payload);
    return this.service.listWorkspaces(dto);
  }

  @MessagePattern(authPattern('auth.workspaces.select'))
  selectWorkspace(@Payload() payload: unknown) {
    const dto = selectWorkspaceSchema.parse(payload);
    return this.service.selectWorkspace(dto);
  }


  @MessagePattern(authPattern('auth.admin.usuarios.list'))
  listUsuariosAdmin(@Payload() payload: { accessToken?: string }) {
    return this.service.listUsuariosAdmin(payload?.accessToken ?? '');
  }

  @MessagePattern(authPattern('auth.admin.usuarios.get'))
  findUsuarioAdminById(@Payload() payload: { accessToken?: string; id?: number }) {
    return this.service.findUsuarioAdminById({
      accessToken: payload?.accessToken ?? '',
      id: Number(payload?.id),
    });
  }

  @MessagePattern(authPattern('auth.admin.perfiles.list'))
  listPerfilesAdmin(@Payload() payload: { accessToken?: string }) {
    return this.service.listPerfilesAdmin(payload?.accessToken ?? '');
  }

  @MessagePattern(authPattern('auth.admin.perfiles.get'))
  findPerfilAdminById(@Payload() payload: { accessToken?: string; id?: number }) {
    return this.service.findPerfilAdminById({
      accessToken: payload?.accessToken ?? '',
      id: Number(payload?.id),
    });
  }

  @MessagePattern(authPattern('auth.admin.usuario-workspaces.list'))
  listUsuarioWorkspacesAdmin(
    @Payload() payload: { accessToken?: string; usuarioId?: number },
  ) {
    return this.service.listUsuarioWorkspacesAdmin({
      accessToken: payload?.accessToken ?? '',
      usuarioId: payload?.usuarioId,
    });
  }

  @MessagePattern(authPattern(NatsSubjects.AuthSelectContext))
  selectContext(@Payload() payload: unknown) {
    const dto = selectContextSchema.parse(payload);
    return this.service.selectContext(dto);
  }

  @MessagePattern(authPattern(NatsSubjects.AuthChangePassword))
  async changePassword(@Payload() payload: unknown) {
    const parsed = changePasswordSchema.safeParse(payload);
    if (!parsed.success) {
      throw new RpcException({ statusCode: 400, message: 'Datos de cambio de contraseña inválidos' });
    }
    try {
      return await this.service.changePassword(parsed.data);
    } catch (error) {
      const statusCode = error instanceof HttpException ? error.getStatus() : 500;
      const messages: Record<number, string> = {
        400: 'Datos de cambio de contraseña inválidos',
        401: 'Contraseña actual incorrecta o sesión no válida',
        403: 'La nueva contraseña no cumple las condiciones requeridas',
      };
      const response = error instanceof HttpException ? error.getResponse() : null;
      const code = statusCode === 401 && typeof response === 'object' && response !== null && 'code' in response && response.code === 'CURRENT_PASSWORD_INCORRECT' ? 'CURRENT_PASSWORD_INCORRECT' : undefined;
      throw new RpcException({
        code,
        statusCode: messages[statusCode] ? statusCode : 500,
        message: messages[statusCode] ?? 'No se pudo completar el cambio de contraseña',
      });
    }
  }

  @MessagePattern(authPattern(NatsSubjects.AuthValidateToken))
  async validateToken(@Payload() payload: unknown) {
    const dto = validateTokenSchema.parse(payload);

    try {
      return await this.service.validateToken(dto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new RpcException({
          statusCode: 401,
          message: 'Token inválido, expirado o revocado',
          error: 'Unauthorized',
        });
      }

      throw error;
    }
  }
}
