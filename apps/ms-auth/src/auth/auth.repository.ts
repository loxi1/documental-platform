import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

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

  async findUserAccesses(userId: number) {
    return sql`
      SELECT
        s.codigo AS sistema,
        s.nombre AS sistema_nombre,
        ua.empresa_codigo,
        ua.perfil,
        ua.permisos
      FROM auth.usuario_accesos ua
      JOIN auth.sistemas s ON s.id = ua.sistema_id
      WHERE ua.usuario_id = ${userId}
        AND ua.estado = 'activo'
        AND s.estado = 'activo'
      ORDER BY s.codigo, ua.empresa_codigo
    `;
  }

  async findAccessByContext(params: {
    usuarioId: number;
    sistema: string;
    empresaCodigo: string;
  }) {
    const rows = await sql`
      SELECT
        u.id AS usuario_id,
        u.nombres,
        u.apellidos,
        u.email,
        s.codigo AS sistema,
        s.nombre AS sistema_nombre,
        ua.empresa_codigo,
        ua.perfil,
        ua.permisos
      FROM auth.usuario_accesos ua
      JOIN auth.usuarios u ON u.id = ua.usuario_id
      JOIN auth.sistemas s ON s.id = ua.sistema_id
      WHERE ua.usuario_id = ${params.usuarioId}
        AND s.codigo = ${params.sistema}
        AND ua.empresa_codigo = ${params.empresaCodigo}
        AND ua.estado = 'activo'
        AND u.estado = 'activo'
        AND s.estado = 'activo'
      LIMIT 1
    `;

    return rows[0] ?? null;
  }
}
