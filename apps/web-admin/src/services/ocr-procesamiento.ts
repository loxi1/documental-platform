import { api } from "./api";

export type ProcesarOcrPayload = {
  tipoEsperado?: string;
  areaOrigen?: string;
  clienteAbreviatura?: string;
  expedienteId?: number | string;
  documentoBaseId?: number | string | null;
  tipoRelacionSugerida?: string;
  canalIngreso?: string;
  reprocesar?: boolean;
};

export type ProcesarOcrResultado = {
  ok?: boolean;
  documentoId?: number | string | null;
  documento_id?: number | string | null;
  archivoId?: number | string | null;
  archivo_id?: number | string | null;
  tipoDocumental?: string | null;
  tipo_documental?: string | null;
  confidence?: number | string | null;
  estado?: string | null;
  claveDocumental?: string | null;
  clave_documental?: string | null;
  expedienteId?: number | string | null;
  expediente_id?: number | string | null;
  expedienteVinculado?: Record<string, unknown> | null;
  expediente_vinculado?: Record<string, unknown> | null;
  contextoCarga?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | string | null;
  metadataSource?: Record<string, unknown> | null;
  ocrResultadoId?: number | string | null;
  ocr_resultado_id?: number | string | null;
  id?: number | string | null;
  [key: string]: unknown;
};

export type EditarOcrResultadoPayload = {
  tipoPropuesto?: string;
  metadata?: Record<string, unknown>;
  observacion?: string;
};

export type VincularOcrExpedientePayload = {
  expedienteId: number | string;
  tipoRelacion: string;
  esPrincipal?: boolean;
  orden?: number;
};

export type ConfirmarOcrConExpedientePayload = {
  expedienteId: number | string;
  tipoRelacion: string;
  esPrincipal?: boolean;
  orden?: number;
  metadata?: Record<string, unknown>;
  observacion?: string;
};



export type DocumentoDuplicadoEnExpedienteDetails = {
  code?: string;
  message?: string;
  suggestedAction?: string;
  claveDocumental?: string;
  documentoIdExistente?: number | string;
  documentoIdActual?: number | string;
  archivoIdActual?: number | string;
  archivoIdExistente?: number | string;
  tipoRelacion?: string;
  [key: string]: unknown;
};

export class OcrApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; details?: unknown }) {
    super(message);
    this.name = "OcrApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function findDocumentoDuplicadoDetails(value: unknown, depth = 0): DocumentoDuplicadoEnExpedienteDetails | null {
  if (!isRecord(value) || depth > 8) return null;

  const code = value.code;
  const suggestedAction = value.suggestedAction;

  if (code === "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE" || suggestedAction === "AGREGAR_VERSION") {
    const nested = isRecord(value.details) ? value.details : {};
    return {
      ...(value as DocumentoDuplicadoEnExpedienteDetails),
      ...(nested as DocumentoDuplicadoEnExpedienteDetails),
      code: "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE",
      suggestedAction: String((nested as any).suggestedAction ?? value.suggestedAction ?? "AGREGAR_VERSION"),
    };
  }

  for (const key of ["error", "details", "data", "payload", "response"]) {
    const found = findDocumentoDuplicadoDetails(value[key], depth + 1);
    if (found) return found;
  }

  return null;
}

export function getDocumentoDuplicadoDetailsFromError(error: unknown): DocumentoDuplicadoEnExpedienteDetails | null {
  if (error instanceof OcrApiError) {
    return findDocumentoDuplicadoDetails(error.details) ?? null;
  }

  return findDocumentoDuplicadoDetails((error as any)?.response?.data) ??
    findDocumentoDuplicadoDetails((error as any)?.details) ??
    findDocumentoDuplicadoDetails(error);
}

function getApiErrorPayload(error: unknown): any {
  if (!error || typeof error !== "object") return null;
  const response = (error as any).response;
  return response?.data ?? null;
}

function buildApiErrorMessage(error: unknown, fallback: string) {
  const payload = getApiErrorPayload(error);
  const apiError = payload?.error;
  const details = apiError?.details?.details ?? apiError?.details ?? payload?.details;

  const message =
    apiError?.message ??
    payload?.message ??
    (error instanceof Error ? error.message : fallback);

  const duplicateDetails = details?.details ?? details;
  if (
    details?.code === "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE" ||
    duplicateDetails?.code === "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE"
  ) {
    const info = duplicateDetails?.details ?? duplicateDetails;
    return [
      message,
      info?.claveDocumental ? `Clave: ${info.claveDocumental}` : null,
      info?.documentoIdExistente ? `Documento existente: ${info.documentoIdExistente}` : null,
      info?.documentoIdActual ? `Documento actual: ${info.documentoIdActual}` : null,
    ].filter(Boolean).join("\n");
  }

  return message || fallback;
}

function unwrapDeep<T = unknown>(payload: unknown): T {
  let current = payload as { data?: unknown } | unknown;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    (current as { data?: unknown }).data !== current
  ) {
    current = (current as { data?: unknown }).data;
  }

  return current as T;
}

export async function procesarArchivoOcr(
  archivoId: number | string,
  payload: ProcesarOcrPayload,
): Promise<ProcesarOcrResultado> {
  const { data } = await api.post(
    `/documentos/archivos/${archivoId}/procesar-ocr`,
    payload,
  );

  return unwrapDeep<ProcesarOcrResultado>(data);
}

export async function editarOcrResultado(
  id: number | string,
  payload: EditarOcrResultadoPayload,
) {
  const { data } = await api.put(`/documentos/ocr-resultados/${id}/editar`, payload);
  return unwrapDeep(data);
}

export async function confirmarOcrResultado(id: number | string) {
  const { data } = await api.post(`/documentos/ocr-resultados/${id}/confirmar`, {});
  return unwrapDeep(data);
}

export async function rechazarOcrResultado(id: number | string, motivo?: string) {
  const { data } = await api.post(`/documentos/ocr-resultados/${id}/rechazar`, {
    motivo: motivo?.trim() || "Rechazado por usuario",
  });
  return unwrapDeep(data);
}

export async function vincularOcrAExpediente(
  id: number | string,
  payload: VincularOcrExpedientePayload,
) {
  const { data } = await api.post(`/documentos/ocr-resultados/${id}/vincular-expediente`, payload);
  return unwrapDeep(data);
}


export async function confirmarOcrConExpediente(
  id: number | string,
  payload: ConfirmarOcrConExpedientePayload,
) {
  try {
    const { data } = await api.post(
      `/documentos/ocr-resultados/${id}/confirmar-con-expediente`,
      payload,
    );
    return unwrapDeep(data);
  } catch (error) {
    const payload = getApiErrorPayload(error);
    const apiError = payload?.error;
    const duplicateDetails = getDocumentoDuplicadoDetailsFromError(error);
    const message = buildApiErrorMessage(
      error,
      "No se pudo confirmar el OCR con expediente.",
    );

    throw new OcrApiError(message, {
      code: duplicateDetails?.code ?? apiError?.code,
      status: (error as any)?.response?.status,
      details: duplicateDetails ?? apiError?.details ?? payload,
    });
  }
}
