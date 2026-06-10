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
