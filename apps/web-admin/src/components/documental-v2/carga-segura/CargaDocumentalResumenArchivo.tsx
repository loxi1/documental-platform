import type { SecureUploadIntent } from "@/types/documental-v2-carga-segura";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function CargaDocumentalResumenArchivo({ intent }: { intent: SecureUploadIntent | null }) {
  if (!intent) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Aún no se seleccionó archivo.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Archivo seleccionado</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="break-all font-medium">{intent.file.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tamaño</dt>
          <dd>{formatBytes(intent.file.size)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipo declarado por navegador</dt>
          <dd>{intent.file.type || "No informado"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Intención local</dt>
          <dd className="break-all font-mono text-xs">{intent.payloadFingerprintLocal}</dd>
        </div>
      </dl>
    </div>
  );
}
