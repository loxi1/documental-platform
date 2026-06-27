export type ExpedienteEstado =
  | "abierto"
  | "en_proceso"
  | "observado"
  | "completo"
  | "cerrado"
  | string;

export interface ExpedienteDocumento {
  documentoId: number;
  tipoDocumental?: string;
  rucEmisor?: string;
  serie?: string;
  numero?: string;
  estado?: string;
  tipoRelacion?: string;
  esPrincipal?: boolean;
  orden?: number;
  fechaEmision?: string | null;
  fecha_emision?: string | null;
  moneda?: string | null;
  montoTotal?: number | string | null;
  monto_total?: number | string | null;
  claveDocumental?: string;
  archivoId?: number | string | null;
  archivo_id?: number | string | null;
  nombreArchivo?: string;
  nombre_archivo?: string | null;
  archivoEstado?: string | null;
  storageProvider?: string | null;
}

export interface Expediente {
  id: number | string;
  correlativo: string;
  empresa_codigo?: string;
  empresaCodigo?: string;
  tipo_expediente?: string;
  tipoExpediente?: string;
  codigo_expediente?: string | null;
  codigoExpediente?: string | null;
  codigo_centro_costo?: string | null;
  codigoCentroCosto?: string | null;
  codigo_op?: string | null;
  codigoOp?: string | null;
  descripcion?: string | null;
  estado?: ExpedienteEstado;
  clave_principal?: string | null;
  clavePrincipal?: string | null;
  creado_en?: string;
  creadoEn?: string;
  actualizado_en?: string;
  actualizadoEn?: string;
  documentos?: ExpedienteDocumento[];
  documentoPrincipal?: ExpedienteDocumento | null;
  documentosAdjuntos?: ExpedienteDocumento[];
}

export interface ExpedienteResumen {
  expedienteId?: number | string;
  correlativo?: string;
  estado?: string;
  documentoPrincipal?: ExpedienteDocumento | null;
  documentosAdjuntos?: ExpedienteDocumento[];
  totales?: Record<string, number | string>;
  alertasActivas?: number;
  [key: string]: unknown;
}

export interface ExpedienteTimelineItem {
  id?: number | string;
  tipo?: string;
  evento?: string;
  titulo?: string;
  descripcion?: string;
  mensaje?: string;
  fecha?: string;
  creado_en?: string;
  creadoEn?: string;
  metadata?: Record<string, unknown>;
}

export interface ExpedienteEstadoDocumental {
  presentes?: string[];
  faltantes?: string[];
  documentosPresentes?: string[];
  documentosFaltantes?: string[];
  [key: string]: unknown;
}