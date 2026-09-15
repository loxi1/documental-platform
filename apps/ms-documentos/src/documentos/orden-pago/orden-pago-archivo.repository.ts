import { ConflictException, Injectable } from '@nestjs/common';
import { AuditoriaOperativaV2Repository } from '../../documental-v2/auditoria-operativa-v2.repository';
import type { OrdenPagoActor } from '../../documental-v2/finanzas/orden-pago.dto';
import type { TmpConnection, TmpRow } from '../tmp/tmp.repository';

export const OP_INITIAL_FILE = 'OP_INITIAL_FILE';
export type OpIds = { ordenPagoId: number; documentoId: number; grupoFacturaId: number; contenedorOperativoId: number; idempotente: boolean };

@Injectable()
export class OrdenPagoArchivoRepository {
  constructor(private readonly auditoria: AuditoriaOperativaV2Repository) {}

  assertClaim(row: TmpRow, identity: string, ids?: OpIds) {
    const claim = row.metadata?.integration;
    if (!claim || claim.consumer !== OP_INITIAL_FILE || claim.identity !== identity ||
        (ids && Number(row.documento_id) !== ids.documentoId)) throw new ConflictException('OP_TEMP_ALREADY_RESERVED');
  }

  async reserve(tx: TmpConnection, row: TmpRow, ids: OpIds, identity: string, destination: string) {
    if (row.metadata?.integration) { this.assertClaim(row, identity, ids); return; }
    const metadata = { ...row.metadata, destinoReservado: destination, promocionIdentity: identity,
      integration: { consumer: OP_INITIAL_FILE, identity, completed: false } };
    await tx`UPDATE documentos.carga_operaciones SET documento_id=${ids.documentoId},
      metadata=${JSON.stringify(metadata)}::jsonb, actualizado_en=now() WHERE id=${row.id}`;
    await this.integrationState(tx, ids, Number(row.id), 'PENDING');
  }

  async complete(tx: TmpConnection, row: TmpRow, ids: OpIds, identity: string, destination: string, actor: OrdenPagoActor) {
    this.assertClaim(row, identity, ids);
    if (row.metadata.destinoReservado !== destination || row.metadata.promocionIdentity !== identity ||
        Number(row.actor_id) !== actor.id || Number(row.workspace_id) !== actor.workspaceId ||
        row.empresa_codigo !== actor.empresaCodigo || Number(row.cliente_destino_id) !== actor.clienteDestinoId) {
      throw new ConflictException('OP_TEMP_CLAIM_CONFLICT');
    }
    const [principal] = await tx`SELECT p.id, c.expediente_v1_id FROM documentos.documentos_operativos_principales p
      JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
      JOIN documentos.documentos d ON d.id=p.documento_id
      JOIN documentos.grupos_factura g ON g.documento_operativo_principal_id=p.id
      WHERE p.id=${ids.ordenPagoId} AND p.documento_id=${ids.documentoId} AND p.tipo_principal='ORDEN_PAGO'
        AND p.op_clave_creacion=${identity}::uuid AND p.estado='activo' AND p.es_principal_activo=true
        AND d.tipo_documental='ORDEN_PAGO' AND d.estado='confirmado' AND c.estado='activo'
        AND c.id=${ids.contenedorOperativoId} AND c.empresa_codigo=${actor.empresaCodigo}
        AND c.cliente_destino_id=${actor.clienteDestinoId} AND g.id=${ids.grupoFacturaId}
        AND g.origen_obligacion='ORDEN_PAGO' AND g.factura_documento_id IS NULL FOR SHARE OF p,c,d,g`;
    if (!principal) throw new ConflictException('OP_REQUIERE_REVISION');
    const [existing] = await tx`SELECT * FROM documentos.documentos_archivos
      WHERE carga_operacion_id=${row.id} AND origen_archivo='OP_INICIAL'`;
    let archivoId: number;
    if (existing) {
      if (Number(existing.documento_id) !== ids.documentoId || existing.storage_key !== destination ||
          existing.hash_sha256 !== row.hash_sha256 || existing.storage_bucket !== row.storage_bucket ||
          Number(existing.metadata?.tamanoBytes) !== Number(row.tamano_bytes)) throw new ConflictException('OP_FILE_CONFLICT');
      archivoId = Number(existing.id);
    } else {
      const metadata = { rol: 'ARCHIVO_INICIAL_OP', tipoPrincipal: 'ORDEN_PAGO', tempId: Number(row.id),
        contentType: row.content_type, tamanoBytes: Number(row.tamano_bytes), ocrRequerido: false };
      const [file] = await tx`INSERT INTO documentos.documentos_archivos
        (documento_id,carga_operacion_id,nombre_archivo,ruta_archivo,storage_provider,storage_bucket,storage_key,
         hash_sha256,metadata,creado_por,workspace_id,empresa_codigo,cliente_destino_id,expediente_id,
         tipo_version,version,es_version_actual,estado,area_origen,origen_archivo)
        VALUES (${ids.documentoId},${row.id},${row.nombre_archivo_original},${destination},'r2',${row.storage_bucket},${destination},
          ${row.hash_sha256},${JSON.stringify(metadata)}::jsonb,${actor.id},${actor.workspaceId},${actor.empresaCodigo},
          ${actor.clienteDestinoId},${principal.expediente_v1_id ?? null},'original',1,true,'subido','FINANZAS','OP_INICIAL')
        RETURNING id,creado_en`;
      archivoId = Number(file.id);
      await this.auditoria.registrarCreacion({ accion: 'ASOCIAR_ARCHIVO_INICIAL_OP', entidad: 'documento_archivo', entidadId: archivoId,
        descripcion: 'Archivo inicial asociado a Orden de Pago sin OCR.', empresaCodigo: actor.empresaCodigo,
        usuario: { ...actor, origen: 'finanzas-op' }, despues: { ...ids, tempId: Number(row.id), archivoId,
          creadoEn: file.creado_en, workspaceId: actor.workspaceId, empresaCodigo: actor.empresaCodigo,
          clienteDestinoId: actor.clienteDestinoId, destinoStorageKey: destination, hashSha256: row.hash_sha256,
          tamanoBytes: Number(row.tamano_bytes) } }, tx);
    }
    await tx`UPDATE documentos.carga_operaciones SET archivo_id=${archivoId} WHERE id=${row.id}`;
    await this.integrationState(tx, ids, Number(row.id), 'COMPLETE', archivoId);
  }

  private async integrationState(tx: TmpConnection, ids: OpIds, tempId: number, estado: string, archivoId?: number) {
    await tx`UPDATE documentos.documentos_operativos_principales SET
      metadata=jsonb_set(metadata,'{archivoInicial}',${JSON.stringify({ tempId, estado, ...(archivoId ? { archivoId } : {}) })}::jsonb)
      WHERE id=${ids.ordenPagoId}`;
  }
}
