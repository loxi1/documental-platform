import { api } from "./api";
import type {
  CargaGuiadaPayloadPreview,
  CargaGuiadaPrevalidacionResponse,
  CargaGuiadaResponse,
} from "@/types/carga-guiada";

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

function buildCargaGuiadaFormData(
  payload: CargaGuiadaPayloadPreview,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("areaOrigen", payload.areaOrigen);
  formData.append("clienteAbreviatura", payload.clienteAbreviatura);
  formData.append("tipoEsperado", payload.tipoEsperado);
  formData.append("tipoRelacionSugerida", payload.tipoRelacionSugerida);
  formData.append("canalIngreso", payload.canalIngreso);

  if (payload.esPrincipal !== undefined) {
    formData.append("esPrincipal", String(payload.esPrincipal));
  }

  if (payload.expedienteId !== undefined && payload.expedienteId !== null) {
    formData.append("expedienteId", String(payload.expedienteId));
  }

  if (payload.documentoBaseId !== undefined && payload.documentoBaseId !== null) {
    formData.append("documentoBaseId", String(payload.documentoBaseId));
  }

  if (payload.observacion?.trim()) {
    formData.append("observacion", payload.observacion.trim());
  }

  return formData;
}

export async function prevalidarDocumentoGuiado(
  payload: CargaGuiadaPayloadPreview,
  file: File,
) {
  const formData = buildCargaGuiadaFormData(payload, file);

  const { data } = await api.post<
    ApiEnvelope<CargaGuiadaPrevalidacionResponse> | CargaGuiadaPrevalidacionResponse
  >("/documentos/carga-guiada/prevalidar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrap<CargaGuiadaPrevalidacionResponse>(data);
}

export async function subirDocumentoGuiado(
  payload: CargaGuiadaPayloadPreview,
  file: File,
) {
  const formData = buildCargaGuiadaFormData(payload, file);

  const { data } = await api.post<
    ApiEnvelope<CargaGuiadaResponse> | CargaGuiadaResponse
  >("/documentos/carga-guiada", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrap<CargaGuiadaResponse>(data);
}
