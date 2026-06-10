export interface OcrResultado {
  id: number;
  archivo_id: number;
  documento_id: number | null;
  expediente_id?: number | null;

  tipo_propuesto: string;

  estado: string;

  confidence: number;

  clave_documental: string;

  metadata?: Record<string, unknown> | null;

  creado_en: string;

  vinculado_en?: string | null;

  nombre_archivo: string;

  storage_provider: string;

  storage_key: string;
}

export interface ExpedienteSugerido {
  id: number;
  correlativo: string;
  empresa_codigo: string;
  tipo_expediente: string;
  codigo_centro_costo?: string | null;
  codigo_op?: string | null;
  descripcion?: string | null;
  estado?: string;
  clave_principal?: string | null;
}

export interface SugerenciaExpediente {
  accion: "USAR_EXPEDIENTE_EXISTENTE" | "CREAR_EXPEDIENTE" | "SIN_SUGERENCIA" | string;
  expediente?: ExpedienteSugerido;
  motivo: string;
  confidence: number;
}

export interface CrearExpedienteDesdeOcrPayload {
  correlativo: string;
  empresaCodigo: string;
  tipoExpediente: string;
  descripcion?: string | null;
  codigoCentroCosto?: string | null;
  codigoOp?: string | null;
  tipoRelacionPrincipal?: string;
}

export interface VincularExpedientePayload {
  expedienteId: number;
  tipoRelacion: string;
  esPrincipal?: boolean;
  orden?: number;
}
