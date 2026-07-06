export type DocumentoEventoTipo =
  | 'documento.creado'
  | 'archivo.subido'
  | 'ocr.procesado'
  | 'ocr.confirmado'
  | 'ocr.rechazado'
  | 'expediente.vinculado'
  | 'version.agregada';

export type DocumentoEventoOrigen =
  | 'web'
  | 'api'
  | 'ocr'
  | 'n8n'
  | 'sistema'
  | 'migracion';

export interface RegistrarDocumentoEventoInput {
  documentoId?: number | null;
  archivoId?: number | null;
  tipoEvento: DocumentoEventoTipo;
  entidadTipo?: string | null;
  entidadId?: number | null;
  expedienteId?: number | null;
  descripcion?: string | null;
  metadata?: Record<string, unknown>;
  usuarioId?: number | null;
  origen?: DocumentoEventoOrigen;
  requestId?: string | null;
  correlationId?: string | null;
  eventoVersion?: number;
}

export interface DocumentoEventoRow {
  id: number;
  documento_id: number | null;
  archivo_id: number | null;
  tipo_evento: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  expediente_id: number | null;
  descripcion: string | null;
  metadata: Record<string, unknown>;
  usuario_id: number | null;
  origen: string;
  request_id: string | null;
  correlation_id: string | null;
  evento_version: number;
  creado_en: Date;
}

export interface DocumentoEventoDto {
  id: number;
  documentoId: number | null;
  archivoId: number | null;
  tipoEvento: string;
  entidadTipo: string | null;
  entidadId: number | null;
  expedienteId: number | null;
  descripcion: string | null;
  metadata: Record<string, unknown>;
  usuarioId: number | null;
  origen: string;
  requestId: string | null;
  correlationId: string | null;
  eventoVersion: number;
  creadoEn: string;
}
