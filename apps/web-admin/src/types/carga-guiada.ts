export type AreaOrigen = "COMPRAS" | "ALMACEN" | "FINANZAS" | "RRHH";

export type TipoEsperado =
  | "OC"
  | "OS"
  | "FACTURA"
  | "GUIA_REMISION"
  | "NOTA_INGRESO"
  | "PAGO_TRANSFERENCIA"
  | "PAGO_DETRACCION"
  | "RECIBO_HONORARIO"
  | "OTRO";

export type TipoRelacionSugerida =
  | "principal_oc"
  | "principal_os"
  | "principal_factura"
  | "adjunto_factura"
  | "adjunto_guia"
  | "adjunto_nota_ingreso"
  | "adjunto_transferencia"
  | "adjunto_detraccion"
  | "adjunto_recibo_honorario"
  | "adjunto_otro";

export interface ClienteDestinoOption {
  abreviatura: string;
  nombreOficial: string;
  ruc: string;
}

export interface CargaGuiadaAccion {
  id: string;
  area: AreaOrigen;
  titulo: string;
  descripcion: string;
  tipoEsperado: TipoEsperado;
  tipoRelacionSugerida: TipoRelacionSugerida;
  documentoBaseLabel?: string;
  requiereDocumentoBase?: boolean;
}

export interface CargaGuiadaPayloadPreview {
  areaOrigen: AreaOrigen;
  clienteAbreviatura: string;
  tipoEsperado: TipoEsperado;
  expedienteId?: string | number | null;
  documentoBaseId?: string | number | null;
  tipoRelacionSugerida: TipoRelacionSugerida;
  canalIngreso: "WEB_ADMIN_GUIADO" | "COMPRAS_EDITAR_UPLOAD" | string;
  observacion?: string;
}

export interface CargaGuiadaResponse {
  id?: number | string;
  ocrResultadoId?: number | string;
  estado?: string;
  tipoDocumental?: string;
  claveDocumental?: string | null;
  metadata?: Record<string, unknown>;
  metadataSource?: Record<string, unknown>;
  mensaje?: string;
  [key: string]: unknown;
}
