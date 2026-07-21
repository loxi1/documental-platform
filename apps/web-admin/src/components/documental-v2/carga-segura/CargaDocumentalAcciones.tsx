import { Button } from "@/components/ui/button";
import type { CargaSeguraUxResult, SecureUploadIntent } from "@/types/documental-v2-carga-segura";

export function CargaDocumentalAcciones({
  intent,
  result,
  processing,
  onSubmit,
  onManualRetry,
  onClear,
}: {
  intent: SecureUploadIntent | null;
  result: CargaSeguraUxResult | null;
  processing: boolean;
  onSubmit: () => void;
  onManualRetry: () => void;
  onClear: () => void;
}) {
  const canSubmit = Boolean(intent) && !processing && !result;
  const canManualRetry = result?.retryPolicy === "manual_same_intent" && !processing;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
        {processing ? "Procesando..." : "Simular carga segura"}
      </Button>

      {canManualRetry ? (
        <Button type="button" variant="outline" onClick={onManualRetry}>
          Reintentar manualmente
        </Button>
      ) : null}

      <Button type="button" variant="outline" onClick={onClear} disabled={processing}>
        Retirar selección local
      </Button>
    </div>
  );
}
