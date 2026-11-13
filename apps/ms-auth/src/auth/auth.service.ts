import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
  authVersion: number;
};

type AccessPayload = {
  sub: number;
  email?: string;
  nombres?: string;
  workspaceId?: number;
  empresa?: string;
  clienteDestinoId?: number;
  sistema?: string;
  perfilId?: number;
  perfil?: string;
  permissionVersion?: number;
  authVersion: number;
  sessionContextId?: string;
  permisos?: PermissionsShape;
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

    const authVersion = Number(user.auth_version);

    if (
      !Number.isSafeInteger(authVersion) ||
      authVersion < 1
    ) {
      throw new UnauthorizedException(
        'No se pudo verificar la versión de autenticación',
      );
    }

    const identityToken = this.signIdentityToken({
      sub: user.id,
      email: user.email,
      nombres: user.nombres,
      purpose: 'identity',
      authVersion,
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

  async changePassword(dto: {
    accessToken: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (Array.from(dto.newPassword).length < 8) {
      throw new ForbiddenException('La nueva contraseña debe tener al menos 8 caracteres');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new ForbiddenException(
        'La confirmación no coincide con la nueva contraseña',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ForbiddenException(
        'La nueva contraseña debe ser diferente de la actual',
      );
    }

    if (Buffer.byteLength(dto.newPassword, 'utf8') > 72) {
      throw new ForbiddenException(
        'La nueva contraseña no puede superar los 72 bytes UTF-8',
      );
    }

    const identity = await this.verifyTokenWithAuthVersion(
      dto.accessToken,
    );

    if (!identity.workspaceId) {
      throw new UnauthorizedException(
        'Se requiere una sesión contextual válida',
      );
    }

    const result = await this.repo.changePasswordAndRevokeSessions({
      userId: identity.sub,
      expectedAuthVersion: identity.authVersion,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,

      workspaceId: identity.workspaceId,
      sessionContextId: identity.sessionContextId,
      empresaCodigo: identity.empresa,
      sistemaCodigo: identity.sistema,
      perfilCodigo: identity.perfil,
    });

    if (!result.changed) {
      if (result.reason === 'INVALID_CURRENT_PASSWORD') {
        throw new UnauthorizedException({ message: 'Contraseña actual incorrecta', code: 'CURRENT_PASSWORD_INCORRECT' });
      }

      throw new UnauthorizedException(
        'No se pudo completar el cambio de contraseña',
      );
    }

    return {
      success: true,
      sessionRevoked: true,
      requiresLogin: true,
    };
  }

  async listWorkspaces(dto: WorkspacesDto) {
    const identity = await this.verifySelectionToken(dto.identityToken);
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
    const identity = await this.verifySelectionToken(dto.identityToken);
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
      authVersion: identity.authVersion,
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


  async listUsuariosAdmin(accessToken: string) {
    const admin = await this.verifyAdminAccessToken(accessToken);
    const usuarios = await this.repo.listUsuariosAdmin();

    await this.repo.auditEvent({
      usuarioId: admin.sub,
      workspaceId: admin.workspaceId ?? null,
      sessionContextId: admin.sessionContextId ?? null,
      empresaCodigo: admin.empresa ?? null,
      sistemaCodigo: admin.sistema ?? null,
      perfilCodigo: admin.perfil ?? null,
      accion: 'ADMIN_LIST_USUARIOS',
      entidad: 'auth.usuarios',
      descripcion: 'Consulta administrativa de usuarios',
    });

    return usuarios.map((usuario) => this.mapUsuarioAdmin(usuario));
  }

  async findUsuarioAdminById(params: { accessToken: string; id: number }) {
    await this.verifyAdminAccessToken(params.accessToken);
    const usuario = await this.repo.findUsuarioAdminById(params.id);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapUsuarioAdmin(usuario);
  }

  async listPerfilesAdmin(accessToken: string) {
    const admin = await this.verifyAdminAccessToken(accessToken);
    const perfiles = await this.repo.listPerfilesAdmin();

    await this.repo.auditEvent({
      usuarioId: admin.sub,
      workspaceId: admin.workspaceId ?? null,
      sessionContextId: admin.sessionContextId ?? null,
      empresaCodigo: admin.empresa ?? null,
      sistemaCodigo: admin.sistema ?? null,
      perfilCodigo: admin.perfil ?? null,
      accion: 'ADMIN_LIST_PERFILES',
      entidad: 'auth.perfiles',
      descripcion: 'Consulta administrativa de perfiles',
    });

    return perfiles.map((perfil) => this.mapPerfilAdmin(perfil));
  }

  async findPerfilAdminById(params: { accessToken: string; id: number }) {
    await this.verifyAdminAccessToken(params.accessToken);
    const perfil = await this.repo.findPerfilAdminById(params.id);

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.mapPerfilAdmin(perfil);
  }

  async listUsuarioWorkspacesAdmin(params: { accessToken: string; usuarioId?: number }) {
    const admin = await this.verifyAdminAccessToken(params.accessToken);
    const workspaces = await this.repo.listUsuarioWorkspacesAdmin({
      usuarioId: params.usuarioId,
    });

    await this.repo.auditEvent({
      usuarioId: admin.sub,
      workspaceId: admin.workspaceId ?? null,
      sessionContextId: admin.sessionContextId ?? null,
      empresaCodigo: admin.empresa ?? null,
      sistemaCodigo: admin.sistema ?? null,
      perfilCodigo: admin.perfil ?? null,
      accion: params.usuarioId ? 'ADMIN_LIST_USUARIO_WORKSPACES' : 'ADMIN_LIST_WORKSPACES',
      entidad: 'auth.usuario_workspaces',
      entidadId: params.usuarioId ? String(params.usuarioId) : null,
      descripcion: params.usuarioId
        ? 'Consulta administrativa de workspaces por usuario'
        : 'Consulta administrativa de workspaces',
    });

    return workspaces.map((workspace) => this.mapUsuarioWorkspaceAdmin(workspace));
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

  async validateToken(dto: ValidateTokenDto) {
    const payload = await this.verifyTokenWithAuthVersion(dto.token);

    return {
      valid: true,
      payload,
    };
  }

  private async verifySelectionToken(
    token: string,
  ): Promise<IdentityPayload> {
    const payload = await this.verifyTokenWithAuthVersion(token);

    if (payload.purpose === 'identity' || payload.workspaceId) {
      return payload;
    }

    throw new UnauthorizedException('Token de selección inválido');
  }

  private async verifyAdminAccessToken(
    token: string,
  ): Promise<AccessPayload> {
    const payload = await this.verifyTokenWithAuthVersion(token);

    if (!payload.workspaceId) {
      throw new UnauthorizedException('Token contextual inválido');
    }

    if (payload.perfil !== 'admin') {
      throw new ForbiddenException(
        'Solo el perfil admin puede consultar administración de accesos',
      );
    }

    return payload;
  }

  private async verifyTokenWithAuthVersion(
    token: string,
  ): Promise<IdentityPayload & AccessPayload> {
    try {
      if (!token) {
        throw new UnauthorizedException('Token requerido');
      }

      const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
      const decoded = jwt.verify(token, jwtSecret);

      if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('sub' in decoded) ||
        !('authVersion' in decoded)
      ) {
        throw new UnauthorizedException('Token inválido');
      }

      const payload = decoded as unknown as IdentityPayload & AccessPayload;

      if (
        !Number.isSafeInteger(payload.sub) ||
        payload.sub < 1 ||
        !Number.isSafeInteger(payload.authVersion) ||
        payload.authVersion < 1
      ) {
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.repo.findUserAuthStateById(payload.sub);

      if (
        !user ||
        user.estado !== 'activo' ||
        !Number.isSafeInteger(Number(user.auth_version)) ||
        Number(user.auth_version) !== payload.authVersion
      ) {
        throw new UnauthorizedException('Token revocado o usuario inactivo');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Token inválido, expirado o revocado');
    }
  }

  private mapUsuarioAdmin(usuario: any) {
    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      estado: usuario.estado,
      creadoEn: usuario.creado_en,
      actualizadoEn: usuario.actualizado_en,
      creado_en: usuario.creado_en,
      actualizado_en: usuario.actualizado_en,
    };
  }

  private mapPerfilAdmin(perfil: any) {
    return {
      id: perfil.id,
      codigo: perfil.codigo,
      nombre: perfil.nombre,
      descripcion: perfil.descripcion,
      sistemaId: perfil.sistema_id,
      sistema_id: perfil.sistema_id,
      sistema: perfil.sistema_codigo,
      sistemaCodigo: perfil.sistema_codigo,
      sistemaNombre: perfil.sistema_nombre,
      estado: perfil.estado ?? 'activo',
      creadoEn: perfil.creado_en,
      actualizadoEn: perfil.actualizado_en,
      creado_en: perfil.creado_en,
      actualizado_en: perfil.actualizado_en,
    };
  }

  private mapUsuarioWorkspaceAdmin(workspace: any) {
    const permisos = normalizePermissions(workspace.permisos);

    return {
      id: workspace.id,
      workspaceId: workspace.workspace_id,
      usuarioId: workspace.usuario_id,
      usuario_id: workspace.usuario_id,
      nombres: workspace.nombres,
      apellidos: workspace.apellidos,
      email: workspace.email,
      usuario: [workspace.nombres, workspace.apellidos].filter(Boolean).join(' ').trim(),
      empresa: workspace.empresa_codigo,
      empresaCodigo: workspace.empresa_codigo,
      empresa_codigo: workspace.empresa_codigo,
      clienteDestinoId: workspace.cliente_destino_id,
      cliente_destino_id: workspace.cliente_destino_id,
      sistemaId: workspace.sistema_id,
      sistema_id: workspace.sistema_id,
      sistema: workspace.sistema_codigo,
      sistemaCodigo: workspace.sistema_codigo,
      sistemaNombre: workspace.sistema_nombre,
      perfilId: workspace.perfil_id,
      perfil_id: workspace.perfil_id,
      perfil: workspace.perfil_codigo,
      perfilNombre: workspace.perfil_nombre,
      estado: workspace.estado,
      esFavorito: workspace.es_favorito,
      es_favorito: workspace.es_favorito,
      ultimoUsoEn: workspace.ultimo_uso_en,
      ultimo_uso_en: workspace.ultimo_uso_en,
      vigenciaDesde: workspace.vigencia_desde,
      vigenciaHasta: workspace.vigencia_hasta,
      permissionVersion: workspace.permission_version,
      permission_version: workspace.permission_version,
      permisos,
      creadoEn: workspace.creado_en,
      actualizadoEn: workspace.actualizado_en,
      creado_en: workspace.creado_en,
      actualizado_en: workspace.actualizado_en,
    };
  }

  private signIdentityToken(payload: IdentityPayload) {
    const jwtSecret: Secret = process.env.JWT_SECRET ?? 'dev_secret';
    const expiresIn =
      (process.env.IDENTITY_TOKEN_EXPIRES_IN ?? '5m') as SignOptions['expiresIn'];

    return jwt.sign(payload, jwtSecret, { expiresIn });
  }

  private async verifyIdentityToken(
    token: string,
  ): Promise<IdentityPayload> {
    const payload = await this.verifyTokenWithAuthVersion(token);

    if (payload.purpose !== 'identity') {
      throw new UnauthorizedException('Identity token inválido');
    }

    return payload;
  }
}
