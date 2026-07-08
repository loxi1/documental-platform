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

function findErrorInfo(value: unknown, codes: string[], depth = 0): Record<string, unknown> | null {
  if (!isRecord(value) || depth > 8) return null;

  const code = typeof value.code === "string" ? value.code : undefined;
  if (code && codes.includes(code)) {
    const nested = isRecord(value.details) ? value.details : {};
    return { ...value, ...nested, code };
  }

  for (const key of ["error", "details", "data", "payload", "response"]) {
    const found = findErrorInfo(value[key], codes, depth + 1);
    if (found) return found;
  }

  return null;
}

function firstText(value: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!value) return "";

  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (typeof raw === "number") return String(raw);
  }

  return "";
}

function firstNestedText(value: Record<string, unknown> | null | undefined, paths: string[][]) {
  if (!value) return "";

  for (const path of paths) {
    let current: unknown = value;

    for (const key of path) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }
      current = current[key];
    }

    if (typeof current === "string" && current.trim()) return current.trim();
    if (typeof current === "number") return String(current);
  }

  return "";
}

function buildApiErrorMessage(error: unknown, fallback: string) {
  const payload = getApiErrorPayload(error);
  const apiError = payload?.error;
  const details = apiError?.details?.details ?? apiError?.details ?? payload?.details;

  const message =
    apiError?.message ??
    payload?.message ??
    (error instanceof Error ? error.message : fallback);

  const linkedInfo = findErrorInfo(payload, ["DOCUMENTO_YA_VINCULADO_A_OTRO_EXPEDIENTE"]);
  if (linkedInfo) {
    const codigoActual =
      firstText(linkedInfo, [
        "codigoExpedienteActual",
        "codigo_expediente_actual",
        "codigoExpediente",
        "codigo_expediente",
        "centroCostoActual",
        "centro_costo_actual",
      ]) ||
      firstNestedText(linkedInfo, [
        ["expedienteActual", "codigoExpediente"],
        ["expedienteActual", "codigo_expediente"],
        ["expediente_actual", "codigoExpediente"],
        ["expediente_actual", "codigo_expediente"],
        ["expediente", "codigoExpediente"],
        ["expediente", "codigo_expediente"],
      ]);

    return [
      "Este documento ya está vinculado a otro centro de costo.",
      codigoActual ? `Documento vinculado actualmente al centro de costo ${codigoActual}.` : null,
    ].filter(Boolean).join("\n");
  }

  const principalInfo = findErrorInfo(payload, ["EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL"]);
  if (principalInfo) {
    return [
      "Este centro de costo ya tiene un documento principal activo.",
      "No se reemplazará automáticamente. Puedes cancelar o cerrar esta ventana.",
    ].filter(Boolean).join("\n");
  }

  const archivoDuplicadoInfo = findErrorInfo(payload, ["ARCHIVO_DUPLICADO_EN_CARGA_GUIADA"]);
  if (archivoDuplicadoInfo) {
    const duplicado = Array.isArray(archivoDuplicadoInfo.duplicados)
      ? archivoDuplicadoInfo.duplicados[0] as Record<string, unknown> | undefined
      : undefined;

    return [
      "Este archivo ya fue cargado anteriormente. No se subió nuevamente.",
      duplicado?.documentoId ? `Documento existente: ${duplicado.documentoId}.` : null,
      duplicado?.archivoId ? `Archivo existente: ${duplicado.archivoId}.` : null,
    ].filter(Boolean).join("\n");
  }

  const mismatchInfo = findErrorInfo(payload, ["CODIGO_EXPEDIENTE_NO_COINCIDE"]);
  if (mismatchInfo) {
    const codigoSeleccionado =
      firstText(mismatchInfo, [
        "codigoExpedienteSeleccionado",
        "codigo_expediente_seleccionado",
        "codigoExpedienteSolicitado",
        "codigo_expediente_solicitado",
        "codigoSeleccionado",
        "codigo_solicitado",
      ]) ||
      firstNestedText(mismatchInfo, [
        ["expedienteSeleccionado", "codigoExpediente"],
        ["expedienteSeleccionado", "codigo_expediente"],
        ["expediente_solicitado", "codigoExpediente"],
        ["expediente_solicitado", "codigo_expediente"],
      ]);

    const codigoDetectado =
      firstText(mismatchInfo, [
        "codigoExpedienteDetectado",
        "codigo_expediente_detectado",
        "codigoDetectado",
        "codigo_detectado",
        "codigoDocumento",
        "codigo_documento",
      ]) ||
      firstNestedText(mismatchInfo, [
        ["documento", "codigoExpediente"],
        ["documento", "codigo_expediente"],
        ["metadata", "codigoExpediente"],
        ["metadata", "codigo_expediente"],
      ]);

    return [
      "El código detectado en el documento no coincide con el centro de costo seleccionado.",
      codigoSeleccionado ? `Centro de costo seleccionado: ${codigoSeleccionado}.` : null,
      codigoDetectado ? `Código detectado en documento: ${codigoDetectado}.` : null,
      "Revisa el documento o cambia el centro de costo seleccionado antes de confirmar.",
    ].filter(Boolean).join("\n");
  }

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

    const conflictDetails = findErrorInfo(payload, [
      "DOCUMENTO_YA_VINCULADO_A_OTRO_EXPEDIENTE",
      "CODIGO_EXPEDIENTE_NO_COINCIDE",
      "EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL",
      "ARCHIVO_DUPLICADO_EN_CARGA_GUIADA",
    ]);

    throw new OcrApiError(message, {
      code: String(conflictDetails?.code ?? duplicateDetails?.code ?? apiError?.code ?? ""),
      status: (error as any)?.response?.status,
      details: conflictDetails ?? duplicateDetails ?? apiError?.details ?? payload,
    });
  }
}
