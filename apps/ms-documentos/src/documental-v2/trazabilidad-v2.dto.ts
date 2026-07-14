export type TrazabilidadCategoriaV2 = 'AUDITORIA' | 'DOCUMENTO' | 'OCR' | 'WORKFLOW' | 'SISTEMA';

export type TrazabilidadTipoV2 =
  | 'ASOCIAR_DOCUMENTO_PRINCIPAL'
  | 'GRUPO_FACTURA_CREADO'
  | 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO';

export type TrazabilidadResultadoV2 = 'CREADO' | 'ACTUALIZADO' | 'ANULADO' | 'RECHAZADO' | null;

export type TrazabilidadAdvertenciaCodigoV2 =
  | 'TRAZABILIDAD_PARCIAL'
  | 'SIN_EVENTOS_DOCUMENTALES'
  | 'SIN_TRAZABILIDAD_OPERATIVA'
  | 'FUENTE_COMPLEMENTARIA_NO_DISPONIBLE';

export interface TrazabilidadActorV2Dto {
  usuarioId: number | null;
  email: string | null;
}

export interface TrazabilidadEntidadV2Dto {
  tipo: string;
  id: string;
}

export interface TrazabilidadItemV2Dto {
  id: string;
  fecha: string;
  categoria: TrazabilidadCategoriaV2;
  tipo: TrazabilidadTipoV2;
  descripcion: string | null;
  actor: TrazabilidadActorV2Dto;
  entidad: TrazabilidadEntidadV2Dto;
  resultado: TrazabilidadResultadoV2;
  origen: string | null;
  requestId: string | null;
  correlationId: string | null;
}

export interface TrazabilidadCoberturaV2Dto {
  auditoria: boolean;
  documentoEventos: boolean;
  parcial: boolean;
}

export interface ConsultarTrazabilidadV2ResponseDto {
  version: 1;
  contenedorOperativoId: number;
  items: TrazabilidadItemV2Dto[];
  cobertura: TrazabilidadCoberturaV2Dto;
  advertencias: TrazabilidadAdvertenciaCodigoV2[];
}
