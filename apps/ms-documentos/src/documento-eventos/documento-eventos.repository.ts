import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import type {
  DocumentoEventoRow,
  RegistrarDocumentoEventoInput,
} from './documento-eventos.types';

@Injectable()
export class DocumentoEventosRepository {
  async crear(input: RegistrarDocumentoEventoInput): Promise<DocumentoEventoRow> {
    const rows = await sql`
      INSERT INTO documentos.documento_eventos (
        documento_id,
        archivo_id,
        tipo_evento,
        entidad_tipo,
        entidad_id,
        expediente_id,
        descripcion,
        metadata,
        usuario_id,
        origen,
        request_id,
        correlation_id,
        evento_version
      )
      VALUES (
        ${input.documentoId ?? null}::bigint,
        ${input.archivoId ?? null}::bigint,
        ${input.tipoEvento}::text,
        ${input.entidadTipo ?? null}::text,
        ${input.entidadId ?? null}::bigint,
        ${input.expedienteId ?? null}::bigint,
        ${input.descripcion ?? null}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        ${input.usuarioId ?? null}::bigint,
        ${input.origen ?? 'sistema'}::text,
        ${input.requestId ?? null}::uuid,
        ${input.correlationId ?? input.requestId ?? null}::uuid,
        ${input.eventoVersion ?? 1}::int
      )
      RETURNING
        id,
        documento_id,
        archivo_id,
        tipo_evento,
        entidad_tipo,
        entidad_id,
        expediente_id,
        descripcion,
        metadata,
        usuario_id,
        origen,
        request_id,
        correlation_id,
        evento_version,
        creado_en
    `;

    return rows[0] as unknown as DocumentoEventoRow;
  }

  async listarPorDocumento(documentoId: number): Promise<DocumentoEventoRow[]> {
    const rows = await sql`
      SELECT
        id,
        documento_id,
        archivo_id,
        tipo_evento,
        entidad_tipo,
        entidad_id,
        expediente_id,
        descripcion,
        metadata,
        usuario_id,
        origen,
        request_id,
        correlation_id,
        evento_version,
        creado_en
      FROM documentos.documento_eventos
      WHERE documento_id = ${documentoId}::bigint
      ORDER BY creado_en DESC, id DESC
    `;

    return rows as unknown as DocumentoEventoRow[];
  }
}
