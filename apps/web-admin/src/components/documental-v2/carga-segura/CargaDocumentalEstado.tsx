import type { CargaSeguraUxState } from "@/types/documental-v2-carga-segura";

const LABELS: Record<CargaSeguraUxState, string> = {
  idle: "En espera",
  dragging: "Arrastrando archivo",
  file_selected: "Archivo seleccionado",
  validating: "Validando",
  ready: "Listo para simular",
  uploading: "Procesando",
  created: "Registrado",
  replayed: "Recuperado",
  duplicate: "Duplicado",
  idempotency_conflict: "Conflicto",
  operation_in_progress: "En curso",
  reconciliation_required: "Revisión técnica",
  payload_too_large: "Supera límite",
  unsupported_media: "Tipo no permitido",
  validation_error: "Validación",
  feature_disabled: "No disponible",
  dependency_unavailable: "Dependencia",
  unknown_error: "Error no reconocido",
};

export function CargaDocumentalEstado({ state }: { state: CargaSeguraUxState }) {
  return (
    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
      {LABELS[state]}
    </span>
  );
}
