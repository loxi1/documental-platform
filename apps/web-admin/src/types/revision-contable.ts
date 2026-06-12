export interface RevisionContableParams {
  empresa: string;
  anio: number | string;
  mes: number | string;
}

export interface RevisionContablePeriodo {
  empresa?: string;
  anio?: number | string;
  mes?: number | string;
  diaCierreContable?: number | string | null;
  dia_cierre_contable?: number | string | null;
  fechaLimite?: string | null;
  fecha_limite?: string | null;
}

export interface RevisionContableItem {
  expediente_id?: number | string;
  expedienteId?: number | string;
  correlativo?: string;
  expediente_correlativo?: string;
  expedienteCorrelativo?: string;
  expediente_estado?: string;
  expedienteEstado?: string;
  tipo_expediente?: string | null;
  tipoExpediente?: string | null;
  codigo_op?: string | null;
  codigoOp?: string | null;
  codigo_pr?: string | null;
  codigoPr?: string | null;
  codigo_centro_costo?: string | null;
  codigoCentroCosto?: string | null;

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

  documento_principal?: Record<string, unknown> | null;
  documentoPrincipal?: Record<string, unknown> | null;
  documentos_adjuntos?: unknown[];
  documentosAdjuntos?: unknown[];
  estado_documental?: Record<string, unknown> | null;
  estadoDocumental?: Record<string, unknown> | null;
  documentos?: unknown[];

  [key: string]: unknown;
}

export interface RevisionContableResponse extends RevisionContablePeriodo {
  items: RevisionContableItem[];
  total?: number | string;
  totalFacturas?: number | string;
  totalMonto?: number | string;
  totalAlertas?: number | string;
}
