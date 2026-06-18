export type DocumentoArchivo = {
  id?: number;
  documento_id?: number | null;
  documentoId?: number | null;
  filename?: string | null;
  nombre_archivo?: string | null;
  nombreArchivo?: string | null;
  storage_key?: string | null;
  storageKey?: string | null;
  storage_provider?: string | null;
  storageProvider?: string | null;
  extension?: string | null;
  mime_type?: string | null;
  mimeType?: string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  [key: string]: unknown;
};

export type Documento = {
  id: number;

  expediente_id?: number | string | null;
  expedienteId?: number | string | null;

  cliente_abreviatura?: string;
  clienteAbreviatura?: string;

  anio?: number | string | null;
  mes?: number | string | null;
  periodo_anio?: number | string | null;
  periodoAnio?: number | string | null;
  periodo_mes?: number | string | null;
  periodoMes?: number | string | null;

  tipo_documental?: string;
  tipoDocumental?: string;

  ruc_emisor?: string | null;
  rucEmisor?: string | null;

  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;

  serie?: string | null;
  numero?: string | null;

  clave_documental?: string | null;
  claveDocumental?: string | null;

  estado?: string | null;

  creado_en?: string | null;
  creadoEn?: string | null;

  actualizado_en?: string | null;
  actualizadoEn?: string | null;

  fecha_emision?: string | null;
  fechaEmision?: string | null;

  moneda?: string | null;

  monto_total?: number | string | null;
  montoTotal?: number | string | null;

  alerta_contable?: string | null;
  alertaContable?: string | null;

  observacion_contable?: string | null;
  observacionContable?: string | null;

  validado_en?: string | null;
  validadoEn?: string | null;

  validado_por?: number | string | null;
  validadoPor?: number | string | null;

  metadata?: Record<string, unknown>;
  archivos?: DocumentoArchivo[];

  [key: string]: unknown;
};

export type DocumentosQueryParams = {
  empresa?: string;
  tipo?: string;
  estado?: string;
  search?: string;

  limit?: number;
  offset?: number;
};

export type DocumentosListadoResponse = {
  total: number;
  limit: number;
  offset: number;
  data: Documento[];
};