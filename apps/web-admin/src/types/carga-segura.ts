import type {
  AreaOrigen,
  TipoEsperado,
  TipoRelacionSugerida,
} from "@/types/carga-guiada";

export type CargaSeguraOrigen = "nuevo" | "editar" | string;

export interface CargaSeguraUploadPayload {
  areaOrigen: AreaOrigen;
  tipoDocumental: TipoEsperado | string;
  expedienteId: string | number;
  documentoBaseId?: string | number | null;
  grupoFacturaId?: string | number | null;
  tipoRelacion?: TipoRelacionSugerida | string | null;
  esPrincipal: boolean;
  canalIngreso: string;
  observacion?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CargaSeguraUploadOptions {
  idempotencyKey: string;
}

export interface CargaSeguraUploadResponse {
  kind?: string;
  operacionId?: string | number | null;
  cargaOperacionId?: string | number | null;
  documentoId?: string | number | null;
  archivoId?: string | number | null;
  hashSha256?: string | null;
  estado?: string | null;
  storageProvider?: string | null;
  storageBucket?: string | null;
  storageKey?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}
