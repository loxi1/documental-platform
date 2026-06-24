import { api } from "./api";
import type {
  Documento,
  DocumentosListadoResponse,
  DocumentosQueryParams,
} from "@/types/documento";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    }),
  );
}

export async function getDocumentos(params: DocumentosQueryParams = {}) {
  const { data } = await api.get<
    ApiEnvelope<DocumentosListadoResponse> | DocumentosListadoResponse
  >("/documentos", {
    params: cleanParams({
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      // Estos filtros quedan listos para cuando el backend los soporte.
      empresa: params.empresa,
      tipo: params.tipo,
      estado: params.estado,
      search: params.search,
    }),
  });

  return unwrap<DocumentosListadoResponse>(data);
}

export async function getDocumento(id: number | string) {
  const { data } = await api.get<ApiEnvelope<Documento> | Documento>(
    `/documentos/${id}`,
  );

  return unwrap<Documento>(data);
}


export type AgregarArchivoComoVersionPayload = {
  tipoVersion?: string;
  observacion?: string;
  marcarComoActual?: boolean;
};

export async function agregarArchivoComoVersion(
  documentoId: number | string,
  archivoId: number | string,
  payload: AgregarArchivoComoVersionPayload = {},
) {
  const { data } = await api.post(
    `/documentos/${documentoId}/archivos/${archivoId}/agregar-version`,
    {
      tipoVersion: payload.tipoVersion ?? "escaneado",
      observacion: payload.observacion ?? "Archivo agregado como versión desde Compras > Editar",
      marcarComoActual: payload.marcarComoActual ?? true,
    },
  );

  return unwrap(data);
}


export type DocumentoArchivoVersion = {
  id: number;
  documento_id: number;
  nombre_archivo?: string | null;
  ruta_archivo?: string | null;
  hash_sha256?: string | null;
  tipo_version?: string | null;
  area_origen?: string | null;
  estado?: string | null;
  creado_en?: string | null;
  origen_archivo?: string | null;
  observacion?: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  storage_key?: string | null;
  version?: number | null;
  es_version_actual?: boolean | null;
  versionado?: Record<string, unknown> | null;
  ocr_resultado_id?: number | null;
  ocr_estado?: string | null;
  ocr_validado_en?: string | null;
  ocr_versionado?: Record<string, unknown> | null;
};

export type DocumentoArchivosVersionesResponse = {
  documentoId: number | string;
  documento?: Record<string, unknown> | null;
  total: number;
  archivos?: DocumentoArchivoVersion[];
  data: DocumentoArchivoVersion[];
};

export async function getDocumentoArchivos(documentoId: number | string) {
  const { data } = await api.get<
    ApiEnvelope<DocumentoArchivosVersionesResponse> | DocumentoArchivosVersionesResponse
  >(`/documentos/${documentoId}/archivos`);

  return unwrap<DocumentoArchivosVersionesResponse>(data);
}
