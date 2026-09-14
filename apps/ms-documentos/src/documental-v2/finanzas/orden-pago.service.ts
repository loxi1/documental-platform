import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from '@documental/database';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { validarActorOp, validarOrdenPago, TIPOS_OP } from './orden-pago.dto';
import type { OrdenPagoActor } from './orden-pago.dto';

@Injectable()
export class OrdenPagoService {
  constructor(private readonly auditoria: AuditoriaOperativaV2Repository) {}

  async opciones(actor: OrdenPagoActor) {
    validarActorOp(actor);
    const contextos = await sql`
      SELECT id, codigo, nombre, centro_costo_codigo AS "centroCostoCodigo"
      FROM documentos.contenedores_operativos
      WHERE estado = 'activo' AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
      ORDER BY codigo, id
    `;
    const monedas = await sql`SELECT codigo, nombre FROM core.monedas
      WHERE activo = true AND codigo IN ('PEN', 'USD') ORDER BY orden, codigo`;
    return { contextos, monedas, tipos: TIPOS_OP };
  }

  async crear(body: unknown, key: string, actor: OrdenPagoActor) {
    validarActorOp(actor);
    const input = validarOrdenPago(body, key);
    key = key.toLowerCase();
    const hash = createHash('sha256').update(JSON.stringify({ input, actorId: actor.id,
      workspaceId: actor.workspaceId, empresa: actor.empresaCodigo, cliente: actor.clienteDestinoId })).digest('hex');
    return sql.begin(async tx => {
      // Serializa reintentos, incluso simultáneos. La unicidad física es defensa adicional.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const anteriores = await tx`
        SELECT p.id AS "ordenPagoId", p.documento_id AS "documentoId",
          p.contenedor_operativo_id AS "contenedorOperativoId", p.op_payload_hash,
          p.estado, g.id AS "grupoFacturaId"
        FROM documentos.documentos_operativos_principales p
        LEFT JOIN documentos.grupos_factura g ON g.documento_operativo_principal_id = p.id
        WHERE p.op_clave_creacion = ${key}::uuid
      `;
      if (anteriores.length) {
        const row = anteriores[0];
        if (row.op_payload_hash !== hash) throw new ConflictException('OP_IDEMPOTENCY_CONFLICT');
        if (anteriores.length !== 1 || !row.grupoFacturaId || row.estado !== 'activo') throw new ConflictException('OP_REQUIERE_REVISION');
        return { ordenPagoId: Number(row.ordenPagoId), documentoId: Number(row.documentoId),
          contenedorOperativoId: Number(row.contenedorOperativoId), grupoFacturaId: Number(row.grupoFacturaId),
          idempotente: true };
      }
      const contextos = await tx`
        SELECT * FROM documentos.contenedores_operativos
        WHERE id = ${input.contenedorOperativoId} AND estado = 'activo'
          AND empresa_codigo = ${actor.empresaCodigo}
          AND cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
        FOR SHARE
      `;
      if (!contextos.length) throw new NotFoundException('Contexto OP no disponible en este workspace');
      const monedas = await tx`SELECT codigo FROM core.monedas WHERE codigo = ${input.moneda} AND activo = true`;
      if (!monedas.length) throw new ConflictException('Moneda no disponible');
      const metadata = { ordenPago: { tipo: input.tipo, subtipo: input.subtipo, observacion: input.observacion },
        workspaceId: actor.workspaceId, empresaCodigo: actor.empresaCodigo, clienteDestinoId: actor.clienteDestinoId,
        origen: 'FINANZAS_OP_01A' };
      const docs = await tx`
        INSERT INTO documentos.documentos
          (cliente_abreviatura, tipo_documental, fecha_emision, monto_total, moneda,
           estado, clave_documental, metadata, validado_por, validado_en)
        VALUES (${actor.empresaCodigo}, 'ORDEN_PAGO', ${input.fechaEmision}::date,
          ${input.monto}::numeric(14,2), ${input.moneda}, 'confirmado', ${'OP|' + key},
          ${JSON.stringify(metadata)}::jsonb, ${actor.id}, now()) RETURNING id, creado_en
      `;
      const documentoId = Number(docs[0].id);
      const principales = await tx`
        INSERT INTO documentos.documentos_operativos_principales
          (contenedor_operativo_id, documento_id, tipo_principal, es_principal_activo,
           estado, metadata, creado_por, op_clave_creacion, op_payload_hash)
        VALUES (${input.contenedorOperativoId}, ${documentoId}, 'ORDEN_PAGO', true,
          'activo', ${JSON.stringify(metadata)}::jsonb, ${actor.id}, ${key}::uuid, ${hash}) RETURNING id
      `;
      const ordenPagoId = Number(principales[0].id);
      const grupos = await tx`
        INSERT INTO documentos.grupos_factura
          (documento_operativo_principal_id, factura_documento_id, origen_obligacion, estado, metadata, creado_por)
        VALUES (${ordenPagoId}, NULL, 'ORDEN_PAGO', 'pendiente_revision',
          ${JSON.stringify({ origen: 'FINANZAS_OP_01A', workspaceId: actor.workspaceId })}::jsonb, ${actor.id}) RETURNING id
      `;
      const grupoFacturaId = Number(grupos[0].id);
      const ids = { documentoId, ordenPagoId, grupoFacturaId, contenedorOperativoId: input.contenedorOperativoId };
      await this.auditoria.registrarCreacion({ accion: 'ASOCIAR_DOCUMENTO_PRINCIPAL',
        entidad: 'documento_operativo_principal', entidadId: ordenPagoId,
        descripcion: 'Orden de Pago acreditada en Finanzas con grupo económico único.',
        empresaCodigo: actor.empresaCodigo, usuario: { ...actor, origen: 'finanzas-op' },
        despues: { ...ids, tipoPrincipal: 'ORDEN_PAGO', fechaEmision: input.fechaEmision,
          creadoEn: docs[0].creado_en, monto: input.monto, moneda: input.moneda,
          workspaceId: actor.workspaceId, empresaCodigo: actor.empresaCodigo,
          requestId: actor.requestId, correlationId: actor.correlationId },
      }, tx);
      return { ...ids, idempotente: false };
    });
  }
}
