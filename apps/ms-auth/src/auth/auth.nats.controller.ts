import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NatsSubjects } from '@documental/shared';

import { AuthService } from './auth.service';
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
  login(@Payload() payload: unknown) {
    const dto = loginSchema.parse(payload);
    return this.service.login(dto);
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

  @MessagePattern(authPattern(NatsSubjects.AuthValidateToken))
  validateToken(@Payload() payload: unknown) {
    const dto = validateTokenSchema.parse(payload);
    return this.service.validateToken(dto);
  }
}
