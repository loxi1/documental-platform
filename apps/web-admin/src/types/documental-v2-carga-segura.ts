export const CARGA_SEGURA_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const CARGA_SEGURA_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type CargaSeguraAcceptedMimeType = (typeof CARGA_SEGURA_ACCEPTED_MIME_TYPES)[number];

export type CargaSeguraBackendCode =
  | "CREATED"
  | "REPLAYED"
  | "DUPLICATE"
  | "IDEMPOTENCY_CONFLICT"
  | "RECONCILIATION_REQUIRED"
  | "CARGA_SEGURA_OPERACION_EN_PROGRESO"
  | "CARGA_SEGURA_SOLICITUD_INVALIDA"
  | "CARGA_SEGURA_DESHABILITADA"
  | "CARGA_SEGURA_STORAGE_FAILED"
  | "CARGA_SEGURA_PERSISTENCE_FAILED";

export type CargaSeguraUxState =
  | "idle"
  | "dragging"
  | "file_selected"
  | "validating"
  | "ready"
  | "uploading"
  | "created"
  | "replayed"
  | "duplicate"
  | "idempotency_conflict"
  | "operation_in_progress"
  | "reconciliation_required"
  | "payload_too_large"
  | "unsupported_media"
  | "validation_error"
  | "feature_disabled"
  | "dependency_unavailable"
  | "unknown_error";

export type CargaSeguraFieldError = {
  field: string;
  message: string;
};

export type CargaSeguraApiEnvelope<TData = unknown> =
  | {
      success: true;
      requestId?: string;
      timestamp: string;
      data: TData;
    }
  | {
      success: false;
      requestId?: string;
      timestamp: string;
      path?: string;
      error: {
        code?: string;
        message: string;
        details?: unknown;
      };
    };

export type CargaSeguraApiResultData = {
  code: CargaSeguraBackendCode;
  documentoId?: number | string;
  operacionId?: string;
  message?: string;
};

export type SecureUploadContext = {
  empresa: string;
  contextoLabel: string;
  expedienteLabel: string;
  documentoPrincipalLabel: string;
  tipoDocumentalEsperado: string;
  canalIngreso: string;
};

export type SecureUploadIntent = {
  idempotencyKey: string;
  payloadFingerprintLocal: string;
  createdAt: string;
  context: SecureUploadContext;
  file: {
    name: string;
    size: number;
    type: string;
  };
};

export type CargaSeguraUxResult = {
  state: CargaSeguraUxState;
  title: string;
  message: string;
  backendCode?: CargaSeguraBackendCode | string;
  requestId?: string;
  operacionId?: string;
  documentoId?: number | string;
  fieldErrors?: CargaSeguraFieldError[];
  retryPolicy:
    | "none"
    | "manual_same_intent"
    | "new_intent_required";
};
