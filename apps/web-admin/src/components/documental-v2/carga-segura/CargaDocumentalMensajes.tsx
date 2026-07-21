import type { CargaSeguraUxResult } from "@/types/documental-v2-carga-segura";

function shouldShowRequestId(result: CargaSeguraUxResult) {
  return [
    "reconciliation_required",
    "dependency_unavailable",
    "unknown_error",
    "feature_disabled",
    "validation_error",
    "idempotency_conflict",
    "operation_in_progress",
  ].includes(result.state);
}

export function CargaDocumentalMensajes({ result }: { result: CargaSeguraUxResult | null }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        La validación del navegador es orientativa. El backend debe verificar tamaño, MIME real, duplicados e idempotencia antes de almacenar.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-semibold">{result.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
      </div>

      {result.documentoId ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">Referencia funcional futura: </span>
          <span className="font-medium">Documento {result.documentoId}</span>
        </div>
      ) : null}

      {shouldShowRequestId(result) && result.requestId ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Referencia técnica para soporte</p>
          <code className="mt-1 block break-all text-xs">{result.requestId}</code>
        </div>
      ) : null}

      {result.operacionId && result.state === "reconciliation_required" ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Operación</p>
          <code className="mt-1 block break-all text-xs">{result.operacionId}</code>
        </div>
      ) : null}

      {result.fieldErrors?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {result.fieldErrors.map((item) => (
            <li key={`${item.field}-${item.message}`}>
              <span className="font-medium">{item.field}:</span> {item.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
