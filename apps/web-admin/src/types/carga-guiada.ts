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
  esPrincipal?: boolean;
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


export type CargaGuiadaAccionSugerida =
  | "cargar_nuevo"
  | "bloquear"
  | "abrir_existente"
  | "vincular_existente"
  | "requiere_confirmacion"
  | string;

export interface CargaGuiadaDuplicadoArchivo {
  archivoId?: number | string | null;
  documentoId?: number | string | null;
  nombreArchivo?: string | null;
  storageKey?: string | null;
  expedienteId?: number | string | null;
  tipoRelacion?: string | null;
  esPrincipal?: boolean | null;
  [key: string]: unknown;
}

export interface CargaGuiadaPrevalidacionResponse {
  hashSha256?: string | null;
  filename?: string | null;
  contentType?: string | null;
  clienteAbreviatura?: string | null;
  tipoEsperado?: string | null;
  expedienteId?: number | string | null;
  documentoId?: number | string | null;
  claveDocumental?: string | null;
  documentoExistente?: Record<string, unknown> | null;
  documentoYaVinculado?: Record<string, unknown> | null;
  expedienteTienePrincipal?: boolean | null;
  principalActivo?: Record<string, unknown> | null;
  codigoExpedienteCoincide?: boolean | null;
  codigoExpedienteSeleccionado?: string | null;
  codigoExpedienteDetectado?: string | null;
  duplicadoArchivo?: boolean | null;
  duplicados?: CargaGuiadaDuplicadoArchivo[];
  accionSugerida?: CargaGuiadaAccionSugerida | null;
  motivo?: string | null;
  persistido?: boolean | null;
  storageProvider?: string | null;
  [key: string]: unknown;
}
