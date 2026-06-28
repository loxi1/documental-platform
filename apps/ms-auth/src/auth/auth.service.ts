import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import type { LoginDto } from './schemas/login.schema';
import type { SelectWorkspaceDto } from './schemas/select-workspace.schema';
import type { ValidateTokenDto } from './schemas/validate-token.schema';
import type { WorkspacesDto } from './schemas/workspaces.schema';
import type { SelectContextDto } from './schemas/select-context.schema';

type PermissionsShape = {
  menus: string[];
  actions: string[];
};

type IdentityPayload = {
  sub: number;
  email?: string;
  nombres?: string;
  purpose?: string;
};

function normalizePermissions(value: unknown): PermissionsShape {
  if (Array.isArray(value)) {
    const permissions = value.filter((item): item is string => typeof item === 'string');

    return {
      menus: permissions
        .filter((permission) => permission.endsWith('.ver'))
        .map((permission) => permission.replace(/\.ver$/, '')),
      actions: permissions.filter((permission) => !permission.endsWith('.ver')),
    };
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const menus = Array.isArray(record.menus)
      ? record.menus.filter((item): item is string => typeof item === 'string')
      : [];
    const actions = Array.isArray(record.actions)
      ? record.actions.filter((item): item is string => typeof item === 'string')
      : [];

    return { menus, actions };
  }

  return { menus: [], actions: [] };
}

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async login(dto: LoginDto) {
    const user = await this.repo.findUserByEmail(dto.email);

    if (!user || user.estado !== 'activo') {
      await this.repo.auditEvent({
        usuarioId: null,
        accion: 'LOGIN_FAIL',
        entidad: 'auth.usuarios',
        descripcion: `Intento de login fallido para ${dto.email}`,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!passwordOk) {
      await this.repo.auditEvent({
        usuarioId: user.id,
        accion: 'LOGIN_FAIL',
        entidad: 'auth.usuarios',
        entidadId: String(user.id),
        descripcion: 'Contraseña inválida',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const identityToken = this.signIdentityToken({
      sub: user.id,
      email: user.email,
      nombres: user.nombres,
      purpose: 'identity',
    });

    await this.repo.touchUserLastLogin(user.id);
    await this.repo.auditEvent({
      usuarioId: user.id,
      accion: 'LOGIN_OK',
      entidad: 'auth.usuarios',
      entidadId: String(user.id),
      descripcion: 'Login correcto',
    });

    return {
      usuario: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
      },
      identityToken,
      identityTokenType: 'Bearer',
      identityExpiresIn: process.env.IDENTITY_TOKEN_EXPIRES_IN ?? '5m',
    };
  }

  async listWorkspaces(dto: WorkspacesDto) {
    const identity = this.verifySelectionToken(dto.identityToken);
    const workspaces = await this.repo.findUserWorkspaces(identity.sub);

    await this.repo.auditEvent({
      usuarioId: identity.sub,
      accion: 'GET_WORKSPACES',
      entidad: 'auth.usuario_workspaces',
      descripcion: 'Consulta de espacios de trabajo disponibles',
    });

    return {
      usuarioId: identity.sub,
      workspaces: workspaces.map((workspace) => ({
        workspaceId: workspace.workspace_id,
        empresa: workspace.empresa_codigo,
        empresaCodigo: workspace.empresa_codigo,
        clienteDestinoId: workspace.cliente_destino_id,
        sistema: workspace.sistema_codigo,
        sistemaNombre: workspace.sistema_nombre,
        perfilId: workspace.perfil_id,
        perfil: workspace.perfil_codigo,
        perfilNombre: workspace.perfil_nombre,
        esFavorito: workspace.es_favorito,
        ultimoUsoEn: workspace.ultimo_uso_en,
        vigenciaDesde: workspace.vigencia_desde,
        vigenciaHasta: workspace.vigencia_hasta,
        permisos: normalizePermissions(workspace.permisos),
      })),
    };
  }

  async selectWorkspace(dto: SelectWorkspaceDto) {
    const identity = this.verifySelectionToken(dto.identityToken);
    const workspace = await this.repo.findUserWorkspaceById({
      usuarioId: identity.sub,
      workspaceId: dto.workspaceId,
    });

    if (!workspace) {
      throw new ForbiddenException('No tiene acceso al workspace solicitado');
    }

    const sessionContextId = randomUUID();
    const permisos = normalizePermissions(workspace.permisos);

    if (dto.recordar) {
      await this.repo.markFavoriteWorkspace({
        usuarioId: identity.sub,
        workspaceId: workspace.workspace_id,
      });
    }

    await this.repo.touchWorkspaceUsage(workspace.workspace_id);

    const payload = {
      sub: workspace.usuario_id,
      email: workspace.email,
      nombres: workspace.nombres,
      workspaceId: workspace.workspace_id,
      empresa: workspace.empresa_codigo,
      clienteDestinoId: workspace.cliente_destino_id,
      sistema: workspace.sistema_codigo,
      perfilId: workspace.perfil_id,
      perfil: workspace.perfil_codigo,
      permissionVersion: workspace.permission_version ?? 1,
      sessionContextId,
      permisos,
    };

    const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
    const jwtExpiresIn =
      (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'];

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    await this.repo.auditEvent({
      usuarioId: workspace.usuario_id,
      workspaceId: workspace.workspace_id,
      sessionContextId,
      empresaCodigo: workspace.empresa_codigo,
      sistemaCodigo: workspace.sistema_codigo,
      perfilCodigo: workspace.perfil_codigo,
      accion: dto.recordar ? 'SELECT_WORKSPACE_FAVORITE' : 'SELECT_WORKSPACE',
      entidad: 'auth.usuario_workspaces',
      entidadId: String(workspace.workspace_id),
      descripcion: `Workspace seleccionado: ${workspace.empresa_codigo} · ${workspace.perfil_codigo}`,
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      contexto: payload,
    };
  }

  /** Compatibilidad temporal con el endpoint antiguo. No usar en nuevas pantallas. */
  async selectContext(dto: SelectContextDto) {
    if ('identityToken' in dto && 'workspaceId' in dto) {
      return this.selectWorkspace(dto as SelectWorkspaceDto);
    }

    throw new ForbiddenException(
      'select-context legacy deshabilitado. Use /auth/workspaces/select con identityToken y workspaceId.',
    );
  }

  validateToken(dto: ValidateTokenDto) {
    try {
      const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
      const payload = jwt.verify(dto.token, jwtSecret);

      return {
        valid: true,
        payload,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private verifySelectionToken(token: string): IdentityPayload {
    try {
      const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
      const payload = jwt.verify(token, jwtSecret) as unknown as IdentityPayload & { workspaceId?: number };

      if (!payload.sub) {
        throw new UnauthorizedException('Token de selección inválido');
      }

      if (payload.purpose === 'identity' || payload.workspaceId) {
        return payload;
      }

      throw new UnauthorizedException('Token de selección inválido');
    } catch {
      throw new UnauthorizedException('Token de selección inválido o expirado');
    }
  }

  private signIdentityToken(payload: IdentityPayload) {
    const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
    const expiresIn =
      (process.env.IDENTITY_TOKEN_EXPIRES_IN ?? '5m') as SignOptions['expiresIn'];

    return jwt.sign(payload, jwtSecret, { expiresIn });
  }

  private verifyIdentityToken(token: string): IdentityPayload {
    try {
      const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
      const payload = jwt.verify(token, jwtSecret) as unknown as IdentityPayload;

      if (payload.purpose !== 'identity' || !payload.sub) {
        throw new UnauthorizedException('Identity token inválido');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Identity token inválido o expirado');
    }
  }
}
