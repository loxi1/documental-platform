import type {
  CargaSeguraApiEnvelope,
  CargaSeguraApiResultData,
  CargaSeguraUxResult,
  SecureUploadIntent,
} from "@/types/documental-v2-carga-segura";
import { cargaSeguraEnvelopeFixtures } from "../fixtures/carga-documental-segura.fixtures";
import { mapCargaSeguraEnvelopeToUxResult } from "../carga-segura-mapper";

export type CargaSeguraMockScenario =
  | "created"
  | "replayed"
  | "duplicate"
  | "idempotencyConflict"
  | "operationInProgress"
  | "reconciliationRequired"
  | "featureDisabled"
  | "dependencyUnavailable"
  | "validationError"
  | "unknownError";

export async function simulateSecureDocumentUpload(
  _intent: SecureUploadIntent,
  scenario: CargaSeguraMockScenario = "created",
): Promise<CargaSeguraUxResult> {
  const envelope = cargaSeguraEnvelopeFixtures[scenario] as CargaSeguraApiEnvelope<CargaSeguraApiResultData>;

  await new Promise((resolve) => window.setTimeout(resolve, 350));

  return mapCargaSeguraEnvelopeToUxResult(envelope);
}
