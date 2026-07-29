"use client";

import { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

function getBackendErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (data && typeof data === "object") {
      const payload = data as {
        error?: string | { message?: string; code?: string };
        message?: string;
      };

      if (payload.error && typeof payload.error === "object" && payload.error.message) {
        return payload.error.message;
      }

      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }

      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
  }

  return "No se pudo completar la anulación. Intenta nuevamente.";
}

export type RevertirEntidadDialogProps = {
  title: string;
  description: string;
  entityLabel: string;
  triggerLabel: string;
  confirmLabel?: string;
  disabled?: boolean;
  onConfirm: (motivo: string) => Promise<void>;
};

export function RevertirEntidadDialog({
  title,
  description,
  entityLabel,
  triggerLabel,
  confirmLabel = "Anular",
  disabled = false,
  onConfirm,
}: RevertirEntidadDialogProps) {
  const titleId = useId();
  const motivoId = useId();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const motivoNormalizado = motivo.trim();
  const confirmDisabled = disabled || submitting || !motivoNormalizado;

  async function handleSubmit() {
    if (confirmDisabled) return;

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm(motivoNormalizado);
      setOpen(false);
      setMotivo("");
    } catch (err) {
      setError(getBackendErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setMotivo("");
      setError(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="xs"
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
      >
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-xl border bg-background p-5 text-sm shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-heading text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-muted-foreground">{description}</p>
                <p className="mt-2 rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground">
                  Entidad: <span className="font-medium text-foreground">{entityLabel}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor={motivoId} className="text-xs font-medium uppercase text-muted-foreground">
                Motivo *
              </label>
              <textarea
                id={motivoId}
                value={motivo}
                disabled={submitting}
                onChange={(event) => setMotivo(event.target.value)}
                rows={4}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                placeholder="Indica el motivo de la anulación"
              />
              {!motivoNormalizado ? (
                <p className="text-xs text-muted-foreground">El motivo es obligatorio para continuar.</p>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirmDisabled}
                onClick={handleSubmit}
              >
                {submitting ? "Anulando..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
