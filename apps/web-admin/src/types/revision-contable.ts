export interface RevisionContableParams {
  empresa: string;
  anio: number | string;
  mes: number | string;
}

export interface RevisionContableItem {
  expediente_id?: number | string;
  expedienteId?: number | string;
  correlativo?: string;
  expediente_estado?: string;
  expedienteEstado?: string;
  documento_id?: number | string;
  documentoId?: number | string;
  tipo_documental?: string;
  tipoDocumental?: string;
  fecha_emision?: string | null;
  fechaEmision?: string | null;
  periodo_anio?: number | string | null;
  periodoAnio?: number | string | null;
  periodo_mes?: number | string | null;
  periodoMes?: number | string | null;
  serie?: string | null;
  numero?: string | null;
  ruc_emisor?: string | null;
  rucEmisor?: string | null;
  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;
  monto_total?: number | string | null;
  montoTotal?: number | string | null;
  documento_estado?: string | null;
  documentoEstado?: string | null;
  alerta_contable?: boolean | string | null;
  alertaContable?: boolean | string | null;
  observacion_contable?: string | null;
  observacionContable?: string | null;
  alertas_activas?: number | string;
  alertasActivas?: number | string;
  [key: string]: unknown;
}
