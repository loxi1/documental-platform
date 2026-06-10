export type EstadoAlerta = "activa" | "resuelta" | string;

export interface DocumentoAlerta {
  id: number | string;
  documento_id?: number | string;
  documentoId?: number | string;
  tipo_alerta?: string;
  tipoAlerta?: string;
  mensaje?: string;
  estado?: EstadoAlerta;
  creado_en?: string;
  creadoEn?: string;
  resuelto_en?: string | null;
  resueltoEn?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CrearDocumentoAlertaPayload {
  tipoAlerta: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
}
