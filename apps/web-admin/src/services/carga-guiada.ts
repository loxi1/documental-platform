import { api } from "./api";
import type {
  CargaGuiadaPayloadPreview,
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

export async function subirDocumentoGuiado(
  payload: CargaGuiadaPayloadPreview,
  file: File,
) {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("file", file);
  formData.append("areaOrigen", payload.areaOrigen);
  formData.append("clienteAbreviatura", payload.clienteAbreviatura);
  formData.append("tipoEsperado", payload.tipoEsperado);
  formData.append("tipoRelacionSugerida", payload.tipoRelacionSugerida);
  formData.append("canalIngreso", payload.canalIngreso);

  if (payload.expedienteId !== undefined && payload.expedienteId !== null) {
    formData.append("expedienteId", String(payload.expedienteId));
  }

  if (payload.documentoBaseId !== undefined && payload.documentoBaseId !== null) {
    formData.append("documentoBaseId", String(payload.documentoBaseId));
  }

  if (payload.observacion?.trim()) {
    formData.append("observacion", payload.observacion.trim());
  }

  const { data } = await api.post<
    ApiEnvelope<CargaGuiadaResponse> | CargaGuiadaResponse
  >("/documentos/carga-guiada", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrap<CargaGuiadaResponse>(data);
}
