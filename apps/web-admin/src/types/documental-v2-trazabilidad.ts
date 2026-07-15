export type TrazabilidadCategoriaV2 = "AUDITORIA" | "DOCUMENTO" | "OCR" | "WORKFLOW" | "SISTEMA" | string;

export type TrazabilidadTipoV2 =
  | "ASOCIAR_DOCUMENTO_PRINCIPAL"
  | "GRUPO_FACTURA_CREADO"
  | "DOCUMENTO_GRUPO_FACTURA_ASOCIADO"
  | string;

export type TrazabilidadResultadoV2 = "CREADO" | "PENDIENTE_REVISION" | "ACTIVO" | string | null;

export type TrazabilidadAdvertenciaCodigoV2 =
  | "TRAZABILIDAD_PARCIAL"
  | "SIN_EVENTOS_DOCUMENTALES"
  | string;

export interface TrazabilidadActorV2 {
  usuarioId?: number | string | null;
  email?: string | null;
}

export interface TrazabilidadEntidadV2 {
  tipo?: string | null;
  id?: string | number | null;
}

export interface TrazabilidadItemV2 {
  id: string;
  fecha: string;
  categoria: TrazabilidadCategoriaV2;
  tipo: TrazabilidadTipoV2;
  descripcion?: string | null;
  actor?: TrazabilidadActorV2 | null;
  entidad?: TrazabilidadEntidadV2 | null;
  resultado?: TrazabilidadResultadoV2;
  origen?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
}

export interface TrazabilidadCoberturaV2 {
  auditoria: boolean;
  documentoEventos: boolean;
  parcial: boolean;
}

export interface TrazabilidadContenedorV2 {
  version: number;
  contenedorOperativoId: number | string;
  items: TrazabilidadItemV2[];
  cobertura: TrazabilidadCoberturaV2;
  advertencias: TrazabilidadAdvertenciaCodigoV2[];
}

export interface ApiEnvelope<T> {
  data?: T;
  success?: boolean;
  error?: unknown;
  message?: string;
}
