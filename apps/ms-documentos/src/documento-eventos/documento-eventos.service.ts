import { Injectable, Logger } from '@nestjs/common';

import { DocumentoEventosRepository } from './documento-eventos.repository';
import type {
  DocumentoEventoDto,
  DocumentoEventoRow,
  DocumentoEventoTipo,
  RegistrarDocumentoEventoInput,
} from './documento-eventos.types';

const defaultDescriptions: Record<DocumentoEventoTipo, string> = {
  'documento.creado': 'Documento creado.',
  'archivo.subido': 'Archivo subido.',
  'ocr.procesado': 'OCR procesado.',
  'ocr.confirmado': 'OCR confirmado.',
  'ocr.rechazado': 'OCR rechazado.',
  'expediente.vinculado': 'Documento vinculado a expediente.',
  'version.agregada': 'Versión documental agregada.',
};

@Injectable()
export class DocumentoEventosService {
  private readonly logger = new Logger(DocumentoEventosService.name);

  constructor(private readonly repo: DocumentoEventosRepository) {}

  async registrarEvento(input: RegistrarDocumentoEventoInput): Promise<void> {
    try {
      await this.repo.crear({
        ...input,
        descripcion:
          input.descripcion ??
          defaultDescriptions[input.tipoEvento] ??
          'Evento documental registrado.',
        metadata: input.metadata ?? {},
        origen: input.origen ?? 'sistema',
        correlationId: input.correlationId ?? input.requestId ?? null,
        eventoVersion: input.eventoVersion ?? 1,
      });
    } catch (error) {
      this.logger.warn({
        message: 'No se pudo registrar evento documental',
        tipoEvento: input.tipoEvento,
        documentoId: input.documentoId ?? null,
        expedienteId: input.expedienteId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listarPorDocumento(documentoId: number): Promise<DocumentoEventoDto[]> {
    const rows = await this.repo.listarPorDocumento(documentoId);
    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: DocumentoEventoRow): DocumentoEventoDto {
    return {
      id: Number(row.id),
      documentoId: row.documento_id === null ? null : Number(row.documento_id),
      archivoId: row.archivo_id === null ? null : Number(row.archivo_id),
      tipoEvento: row.tipo_evento,
      entidadTipo: row.entidad_tipo,
      entidadId: row.entidad_id === null ? null : Number(row.entidad_id),
      expedienteId: row.expediente_id === null ? null : Number(row.expediente_id),
      descripcion: row.descripcion,
      metadata: row.metadata ?? {},
      usuarioId: row.usuario_id === null ? null : Number(row.usuario_id),
      origen: row.origen,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      eventoVersion: Number(row.evento_version ?? 1),
      creadoEn:
        row.creado_en instanceof Date
          ? row.creado_en.toISOString()
          : new Date(row.creado_en).toISOString(),
    };
  }
}
