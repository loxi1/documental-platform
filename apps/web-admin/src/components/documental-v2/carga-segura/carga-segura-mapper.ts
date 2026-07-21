import type {
  CargaSeguraApiEnvelope,
  CargaSeguraApiResultData,
  CargaSeguraBackendCode,
  CargaSeguraFieldError,
  CargaSeguraUxResult,
  CargaSeguraUxState,
} from "@/types/documental-v2-carga-segura";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeFieldErrors(details: unknown): CargaSeguraFieldError[] | undefined {
  if (!isRecord(details)) return undefined;

  const rawFieldErrors = details.fieldErrors;

  if (!Array.isArray(rawFieldErrors)) return undefined;

  const fieldErrors = rawFieldErrors
    .map((item) => {
      if (!isRecord(item)) return null;

      const field = typeof item.field === "string" ? item.field : null;
      const message = typeof item.message === "string" ? item.message : null;

      if (!field || !message) return null;

      return { field, message };
    })
    .filter((item): item is CargaSeguraFieldError => Boolean(item));

  return fieldErrors.length ? fieldErrors : undefined;
}

export function mapBackendCodeToUxState(code?: string): CargaSeguraUxState {
  switch (code) {
    case "CREATED":
      return "created";
    case "REPLAYED":
      return "replayed";
    case "DUPLICATE":
      return "duplicate";
    case "IDEMPOTENCY_CONFLICT":
      return "idempotency_conflict";
    case "RECONCILIATION_REQUIRED":
      return "reconciliation_required";
    case "CARGA_SEGURA_OPERACION_EN_PROGRESO":
      return "operation_in_progress";
    case "CARGA_SEGURA_SOLICITUD_INVALIDA":
      return "validation_error";
    case "CARGA_SEGURA_DESHABILITADA":
      return "feature_disabled";
    case "CARGA_SEGURA_STORAGE_FAILED":
    case "CARGA_SEGURA_PERSISTENCE_FAILED":
      return "dependency_unavailable";
    default:
      return "unknown_error";
  }
}

function resultTextForState(state: CargaSeguraUxState, fallbackMessage?: string) {
  switch (state) {
    case "created":
      return {
        title: "Carga registrada",
        message: fallbackMessage ?? "La carga nueva fue registrada correctamente.",
      };
    case "replayed":
      return {
        title: "Resultado anterior recuperado",
        message: fallbackMessage ?? "No se creó una segunda carga.",
      };
    case "duplicate":
      return {
        title: "Archivo ya registrado",
        message: fallbackMessage ?? "El archivo ya existe en el sistema. No se presentará como carga nueva.",
      };
    case "idempotency_conflict":
      return {
        title: "Operación con datos diferentes",
        message: fallbackMessage ?? "La misma operación fue utilizada con información diferente. Revisa los datos antes de continuar.",
      };
    case "operation_in_progress":
      return {
        title: "Operación en curso",
        message: fallbackMessage ?? "La operación concurrente aún está en curso. Retirar el archivo de la pantalla no cancela la operación backend.",
      };
    case "reconciliation_required":
      return {
        title: "Requiere revisión técnica",
        message: fallbackMessage ?? "La carga requiere revisión técnica. No vuelvas a enviarla automáticamente.",
      };
    case "validation_error":
      return {
        title: "Validación no superada",
        message: fallbackMessage ?? "La solicitud no superó la validación documental.",
      };
    case "feature_disabled":
      return {
        title: "Función no disponible",
        message: fallbackMessage ?? "La carga segura está temporalmente no disponible.",
      };
    case "dependency_unavailable":
      return {
        title: "Dependencia no disponible",
        message: fallbackMessage ?? "No se pudo completar la operación por una dependencia no disponible.",
      };
    default:
      return {
        title: "No se pudo determinar el resultado",
        message: fallbackMessage ?? "Ocurrió un error no reconocido.",
      };
  }
}

function retryPolicyForState(state: CargaSeguraUxState): CargaSeguraUxResult["retryPolicy"] {
  switch (state) {
    case "dependency_unavailable":
      return "manual_same_intent";
    case "idempotency_conflict":
      return "new_intent_required";
    default:
      return "none";
  }
}

export function mapCargaSeguraEnvelopeToUxResult(
  envelope: CargaSeguraApiEnvelope<CargaSeguraApiResultData>,
): CargaSeguraUxResult {
  if (envelope.success) {
    const state = mapBackendCodeToUxState(envelope.data.code);
    const text = resultTextForState(state, envelope.data.message);

    return {
      state,
      title: text.title,
      message: text.message,
      backendCode: envelope.data.code,
      requestId: envelope.requestId,
      operacionId: envelope.data.operacionId,
      documentoId: envelope.data.documentoId,
      retryPolicy: retryPolicyForState(state),
    };
  }

  const state = mapBackendCodeToUxState(envelope.error.code);
  const text = resultTextForState(state, envelope.error.message);

  return {
    state,
    title: text.title,
    message: text.message,
    backendCode: envelope.error.code as CargaSeguraBackendCode | string | undefined,
    requestId: envelope.requestId,
    fieldErrors: normalizeFieldErrors(envelope.error.details),
    retryPolicy: retryPolicyForState(state),
  };
}
