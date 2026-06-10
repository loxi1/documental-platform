export interface Documento {
  id: number;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  cliente_abreviatura?: string | null;
  clienteAbreviatura?: string | null;
  anio?: number | string | null;
  mes?: number | string | null;
  periodo_anio?: number | string | null;
  periodo_mes?: number | string | null;
  ruc_emisor?: string | null;
  rucEmisor?: string | null;
  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;
  serie?: string | null;
  numero?: string | null;
  clave_documental?: string | null;
  claveDocumental?: string | null;
  estado?: string | null;
  monto_total?: number | string | null;
  montoTotal?: number | string | null;
  fecha_emision?: string | null;
  fechaEmision?: string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  expediente_id?: number | string | null;
  expedienteId?: number | string | null;
  expediente_correlativo?: string | null;
  expedienteCorrelativo?: string | null;
  alertas_activas?: number | string | null;
  alertasActivas?: number | string | null;
  [key: string]: unknown;
}

export interface DocumentosListadoResponse {
  total: number;
  limit: number;
  offset: number;
  data: Documento[];
}

export interface DocumentosQueryParams {
  limit?: number;
  offset?: number;
  empresa?: string;
  tipo?: string;
  estado?: string;
  search?: string;
}
