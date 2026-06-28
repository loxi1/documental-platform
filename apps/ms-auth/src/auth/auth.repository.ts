import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

type AuditEventInput = {
  workspaceId?: number | null;
  sessionContextId?: string | null;
  requestId?: string | null;
  usuarioId?: number | null;
  empresaCodigo?: string | null;
  sistemaCodigo?: string | null;
  perfilCodigo?: string | null;
  modulo?: string | null;
  entidad?: string | null;
  entidadId?: string | null;
  accion: string;
  descripcion?: string | null;
  antes?: Record<string, unknown> | unknown[] | null;
  despues?: Record<string, unknown> | unknown[] | null;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuthRepository {
  async findUserByEmail(email: string) {
    const rows = await sql`
      SELECT
        id,
        nombres,
        apellidos,
        email,
        password_hash,
        estado
      FROM auth.usuarios
      WHERE email = ${email}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async touchUserLastLogin(userId: number) {
    await sql`
      UPDATE auth.usuarios
      SET actualizado_en = now()
      WHERE id = ${userId}
    `;
  }

  async findUserWorkspaces(userId: number) {
    return sql`
      SELECT
        uw.id AS workspace_id,
        uw.usuario_id,
        uw.empresa_codigo,
        uw.cliente_destino_id,
        s.codigo AS sistema_codigo,
        s.nombre AS sistema_nombre,
        p.id AS perfil_id,
        p.codigo AS perfil_codigo,
        p.nombre AS perfil_nombre,
        uw.permission_version,
        uw.permisos,
        uw.es_favorito,
        uw.ultimo_uso_en,
        uw.vigencia_desde,
        uw.vigencia_hasta
      FROM auth.usuario_workspaces uw
      JOIN core.sistemas s ON s.id = uw.sistema_id
      JOIN auth.perfiles p ON p.id = uw.perfil_id
      WHERE uw.usuario_id = ${userId}
        AND uw.estado = 'activo'
        AND s.estado = 'activo'
        AND p.estado = 'activo'
        AND (uw.vigencia_desde IS NULL OR uw.vigencia_desde <= CURRENT_DATE)
        AND (uw.vigencia_hasta IS NULL OR uw.vigencia_hasta >= CURRENT_DATE)
      ORDER BY uw.es_favorito DESC, uw.ultimo_uso_en DESC NULLS LAST, s.orden, uw.empresa_codigo, p.codigo
    `;
  }

  async findUserWorkspaceById(params: {
    usuarioId: number;
    workspaceId: number;
  }) {
    const rows = await sql`
      SELECT
        uw.id AS workspace_id,
        uw.usuario_id,
        u.nombres,
        u.apellidos,
        u.email,
        uw.empresa_codigo,
        uw.cliente_destino_id,
        s.codigo AS sistema_codigo,
        s.nombre AS sistema_nombre,
        p.id AS perfil_id,
        p.codigo AS perfil_codigo,
        p.nombre AS perfil_nombre,
        uw.permission_version,
        uw.permisos,
        uw.es_favorito,
        uw.ultimo_uso_en,
        uw.vigencia_desde,
        uw.vigencia_hasta
      FROM auth.usuario_workspaces uw
      JOIN auth.usuarios u ON u.id = uw.usuario_id
      JOIN core.sistemas s ON s.id = uw.sistema_id
      JOIN auth.perfiles p ON p.id = uw.perfil_id
      WHERE uw.id = ${params.workspaceId}
        AND uw.usuario_id = ${params.usuarioId}
        AND uw.estado = 'activo'
        AND u.estado = 'activo'
        AND s.estado = 'activo'
        AND p.estado = 'activo'
        AND (uw.vigencia_desde IS NULL OR uw.vigencia_desde <= CURRENT_DATE)
        AND (uw.vigencia_hasta IS NULL OR uw.vigencia_hasta >= CURRENT_DATE)
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async markFavoriteWorkspace(params: {
    usuarioId: number;
    workspaceId: number;
  }) {
    await sql.begin(async (tx) => {
      await tx`
        UPDATE auth.usuario_workspaces
        SET es_favorito = false,
            actualizado_en = now()
        WHERE usuario_id = ${params.usuarioId}
      `;

      await tx`
        UPDATE auth.usuario_workspaces
        SET es_favorito = true,
            actualizado_en = now()
        WHERE id = ${params.workspaceId}
          AND usuario_id = ${params.usuarioId}
      `;
    });
  }

  async touchWorkspaceUsage(workspaceId: number) {
    await sql`
      UPDATE auth.usuario_workspaces
      SET ultimo_uso_en = now(),
          actualizado_en = now()
      WHERE id = ${workspaceId}
    `;
  }

  async auditEvent(event: AuditEventInput) {
    await sql`
      INSERT INTO core.auditoria_eventos (
        workspace_id,
        session_context_id,
        request_id,
        usuario_id,
        empresa_codigo,
        sistema_codigo,
        perfil_codigo,
        modulo,
        entidad,
        entidad_id,
        accion,
        descripcion,
        antes,
        despues,
        ip,
        user_agent
      ) VALUES (
        ${event.workspaceId ?? null},
        ${event.sessionContextId ?? null},
        ${event.requestId ?? null},
        ${event.usuarioId ?? null},
        ${event.empresaCodigo ?? null},
        ${event.sistemaCodigo ?? null},
        ${event.perfilCodigo ?? null},
        ${event.modulo ?? 'auth'},
        ${event.entidad ?? null},
        ${event.entidadId ?? null},
        ${event.accion},
        ${event.descripcion ?? null},
        ${event.antes ? sql.json(event.antes as never) : null},
        ${event.despues ? sql.json(event.despues as never) : null},
        ${event.ip ?? null},
        ${event.userAgent ?? null}
      )
    `;
  }

  /** Compatibilidad antigua para reportes/manuales. El nuevo flujo usa workspaces. */
  async findUserAccesses(userId: number) {
    const workspaces = await this.findUserWorkspaces(userId);

    return workspaces.map((workspace) => ({
      workspaceId: workspace.workspace_id,
      sistema: workspace.sistema_codigo,
      sistema_nombre: workspace.sistema_nombre,
      empresa_codigo: workspace.empresa_codigo,
      clienteDestinoId: workspace.cliente_destino_id,
      perfilId: workspace.perfil_id,
      perfil: workspace.perfil_codigo,
      permisos: workspace.permisos,
      esFavorito: workspace.es_favorito,
    }));
  }
}
