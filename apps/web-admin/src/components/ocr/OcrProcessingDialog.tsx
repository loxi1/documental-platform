"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type OcrProcessingStep =
  | "idle"
  | "prevalidating"
  | "uploading"
  | "processing_ocr"
  | "preparing_preview"
  | "ready"
  | "error";

type Props = {
  open: boolean;
  step: OcrProcessingStep;
  filename?: string | null;
  documentLabel?: string | null;
  errorMessage?: string | null;
  onClose?: () => void;
};

type StepItem = {
  key: Exclude<OcrProcessingStep, "idle" | "error">;
  label: string;
  description: string;
};

const STEPS: StepItem[] = [
  {
    key: "prevalidating",
    label: "Validando documento",
    description: "Revisando duplicados, hash y reglas del centro de costo antes de subir.",
  },
  {
    key: "uploading",
    label: "Subiendo archivo a R2",
    description: "Registrando el documento en almacenamiento privado.",
  },
  {
    key: "processing_ocr",
    label: "Procesando OCR",
    description: "Extrayendo metadata y clasificando el documento.",
  },
  {
    key: "preparing_preview",
    label: "Preparando validación",
    description: "Listando el documento para abrir la vista previa.",
  },
  {
    key: "ready",
    label: "Validación lista",
    description: "El documento está listo para revisión visual.",
  },
];

const STEP_ORDER: Record<Exclude<OcrProcessingStep, "idle" | "error">, number> = {
  prevalidating: 0,
  uploading: 1,
  processing_ocr: 2,
  preparing_preview: 3,
  ready: 4,
};

function getStepState(step: OcrProcessingStep, item: StepItem) {
  if (step === "error") return "pending";
  if (step === "idle") return "pending";

  const current = STEP_ORDER[step];
  const index = STEP_ORDER[item.key];

  if (index < current) return "done";
  if (index === current) return step === "ready" ? "done" : "active";
  return "pending";
}

export function OcrProcessingDialog({
  open,
  step,
  filename,
  documentLabel,
  errorMessage,
  onClose,
}: Props) {
  if (!open) return null;

  const isError = step === "error";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proceso documental
            </div>
            <h2 className="mt-1 text-xl font-bold">
              {isError ? "No se pudo procesar" : step === "prevalidating" ? "Validando documento" : "Subiendo documento"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {documentLabel ? `${documentLabel} · ` : null}
              {filename || "Documento seleccionado"}
            </p>
          </div>

          {isError ? (
            <AlertCircle className="mt-1 h-6 w-6 text-red-500" />
          ) : (
            <Loader2 className="mt-1 h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="mt-5 space-y-3">
          {STEPS.map((item) => {
            const state = getStepState(step, item);

            return (
              <div
                key={item.key}
                className="flex gap-3 rounded-xl border bg-muted/20 p-3"
              >
                <div className="mt-0.5">
                  {state === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : state === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {isError ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Espera un momento. Esta ventana evita cargas duplicadas mientras se completa el proceso.
          </p>
        )}
      </div>
    </div>
  );
}
