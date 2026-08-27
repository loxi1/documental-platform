import { api } from "./api";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";
import type {
  CargaSeguraOrigen,
  CargaSeguraUploadOptions,
  CargaSeguraUploadPayload,
  CargaSeguraUploadResponse,
} from "@/types/carga-segura";

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

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function crearCargaSeguraIdempotencyKey(
  origen: CargaSeguraOrigen,
  expedienteId: string | number,
) {
  return `compras:${origen}:${expedienteId}:${randomId()}`;
}

function normalizeCargaSeguraResponse(
  response: CargaSeguraUploadResponse,
): CargaSeguraUploadResponse {
  return {
    ...response,
    cargaOperacionId: response.cargaOperacionId ?? response.operacionId ?? null,
  };
}

export function buildCargaSeguraPayloadDesdeGuiada(
  payload: CargaGuiadaPayloadPreview,
): CargaSeguraUploadPayload {
  if (payload.expedienteId === undefined || payload.expedienteId === null || payload.expedienteId === "") {
    throw new Error("Carga segura requiere expedienteId.");
  }

  const tipoRelacion = payload.tipoRelacionSugerida ?? null;

  return {
    areaOrigen: payload.areaOrigen,
    tipoDocumental: payload.tipoEsperado,
    expedienteId: payload.expedienteId,
    documentoBaseId: payload.documentoBaseId ?? null,
    grupoFacturaId: payload.grupoFacturaId ?? null,
    tipoRelacion,
    esPrincipal: payload.esPrincipal ?? String(tipoRelacion ?? "").startsWith("principal_"),
    canalIngreso: payload.canalIngreso,
    observacion: payload.observacion ?? null,
    metadata: {
      areaOrigen: payload.areaOrigen,
      observacion: payload.observacion ?? null,
      origenFrontend: "web-admin-compras",
      contratoOrigen: "carga-guiada-prevalidacion",
    },
  };
}

function buildCargaSeguraFormData(
  payload: CargaSeguraUploadPayload,
  file: File,
) {
  const formData = new FormData();

  formData.append("archivo", file);
  formData.append("expedienteId", String(payload.expedienteId));

  if (payload.documentoBaseId !== undefined && payload.documentoBaseId !== null) {
    formData.append("documentoBaseId", String(payload.documentoBaseId));
  }

  if (payload.grupoFacturaId !== undefined && payload.grupoFacturaId !== null) {
    formData.append("grupoFacturaId", String(payload.grupoFacturaId));
  }

  formData.append("tipoDocumental", String(payload.tipoDocumental));

  if (payload.tipoRelacion) {
    formData.append("tipoRelacion", String(payload.tipoRelacion));
  }

  formData.append("esPrincipal", String(payload.esPrincipal));
  formData.append("canalIngreso", payload.canalIngreso);

  const metadata = payload.metadata ?? {};
  const metadataSeguro = {
    ...metadata,
    ...(payload.observacion ? { observacion: payload.observacion } : {}),
  };

  if (Object.keys(metadataSeguro).length > 0) {
    formData.append("metadata", JSON.stringify(metadataSeguro));
  }

  return formData;
}

export async function subirDocumentoCargaSegura(
  payload: CargaGuiadaPayloadPreview | CargaSeguraUploadPayload,
  file: File,
  options: CargaSeguraUploadOptions,
) {
  if (!options.idempotencyKey?.trim()) {
    throw new Error("Carga segura requiere idempotency-key.");
  }

  const securePayload =
    "tipoEsperado" in payload
      ? buildCargaSeguraPayloadDesdeGuiada(payload)
      : payload;

  const formData = buildCargaSeguraFormData(securePayload, file);

  const { data } = await api.post<
    ApiEnvelope<CargaSeguraUploadResponse> | CargaSeguraUploadResponse
  >("/documentos/carga-segura", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "idempotency-key": options.idempotencyKey,
    },
  });

  return normalizeCargaSeguraResponse(unwrap<CargaSeguraUploadResponse>(data));
}
