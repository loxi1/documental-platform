import type {
  CargaSeguraApiEnvelope,
  CargaSeguraApiResultData,
  SecureUploadContext,
} from "@/types/documental-v2-carga-segura";

export const secureUploadContextFixture: SecureUploadContext = {
  empresa: "BBTI SAC",
  contextoLabel: "Centro de costo: PRODUCCION C X DISTRIBUIR",
  expedienteLabel: "Expediente operativo de compras",
  documentoPrincipalLabel: "OC 007950",
  tipoDocumentalEsperado: "Factura / Guía / Nota de ingreso / Transferencia / Detracción",
  canalIngreso: "WEB_ADMIN_CARGA_SEGURA_MOCK",
};

export const cargaSeguraEnvelopeFixtures = {
  created: {
    success: true,
    requestId: "req_go_ux_created_001",
    timestamp: "2026-07-21T10:00:00.000Z",
    data: {
      code: "CREATED",
      documentoId: 910101,
      operacionId: "op_go_ux_created_001",
      message: "Carga nueva registrada.",
    },
  },

  replayed: {
    success: true,
    requestId: "req_go_ux_replayed_001",
    timestamp: "2026-07-21T10:01:00.000Z",
    data: {
      code: "REPLAYED",
      documentoId: 910101,
      operacionId: "op_go_ux_created_001",
      message: "Resultado anterior recuperado.",
    },
  },

  duplicate: {
    success: true,
    requestId: "req_go_ux_duplicate_001",
    timestamp: "2026-07-21T10:02:00.000Z",
    data: {
      code: "DUPLICATE",
      documentoId: 910099,
      message: "Archivo ya registrado.",
    },
  },

  idempotencyConflict: {
    success: false,
    requestId: "req_go_ux_conflict_001",
    timestamp: "2026-07-21T10:03:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "IDEMPOTENCY_CONFLICT",
      message: "La misma operación fue utilizada con información diferente.",
    },
  },

  operationInProgress: {
    success: false,
    requestId: "req_go_ux_progress_001",
    timestamp: "2026-07-21T10:04:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "CARGA_SEGURA_OPERACION_EN_PROGRESO",
      message: "La operación concurrente aún está en curso.",
    },
  },

  reconciliationRequired: {
    success: true,
    requestId: "req_go_ux_reconciliation_001",
    timestamp: "2026-07-21T10:05:00.000Z",
    data: {
      code: "RECONCILIATION_REQUIRED",
      operacionId: "op_go_ux_reconciliation_001",
      message: "La carga requiere revisión técnica.",
    },
  },

  featureDisabled: {
    success: false,
    requestId: "req_go_ux_disabled_001",
    timestamp: "2026-07-21T10:06:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "CARGA_SEGURA_DESHABILITADA",
      message: "La función de carga segura está temporalmente no disponible.",
    },
  },

  dependencyUnavailable: {
    success: false,
    requestId: "req_go_ux_dependency_001",
    timestamp: "2026-07-21T10:07:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "CARGA_SEGURA_STORAGE_FAILED",
      message: "No se pudo completar la operación por dependencia no disponible.",
    },
  },

  validationError: {
    success: false,
    requestId: "req_go_ux_validation_001",
    timestamp: "2026-07-21T10:08:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "CARGA_SEGURA_SOLICITUD_INVALIDA",
      message: "La solicitud no superó la validación documental.",
      details: {
        fieldErrors: [
          {
            field: "tipoDocumentalEsperado",
            message: "El tipo documental no es compatible con el contexto operativo.",
          },
        ],
      },
    },
  },

  unknownError: {
    success: false,
    requestId: "req_go_ux_unknown_001",
    timestamp: "2026-07-21T10:09:00.000Z",
    path: "/documental-v2/carga-segura/mock",
    error: {
      code: "CARGA_SEGURA_PERSISTENCE_FAILED",
      message: "No se pudo registrar la operación.",
      details: {
        unexpected: true,
      },
    },
  },
} as const satisfies Record<string, CargaSeguraApiEnvelope<CargaSeguraApiResultData>>;
