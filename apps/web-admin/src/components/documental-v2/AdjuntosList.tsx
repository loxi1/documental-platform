import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceV2Documento } from "@/types/documental-v2-workspace";
import {
  documentoLabel,
  getDocumentoArchivo,
  getDocumentoId,
  getDocumentoTipo,
  getEstado,
  getFechaDocumento,
  getMontoDocumento,
} from "./workspace-v2-utils";

export function AdjuntosList({
  documentos,
  emptyLabel = "Sin adjuntos informados por el Workspace V2.",
}: {
  documentos: WorkspaceV2Documento[];
  emptyLabel?: string;
}) {
  if (!documentos.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documentos.map((documento, index) => (
        <div
          key={`${getDocumentoId(documento) ?? "adjunto"}-${index}`}
          className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{documentoLabel(documento)}</p>
                <Badge variant="outline">{getDocumentoTipo(documento)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Fecha: {getFechaDocumento(documento)} · Monto: {getMontoDocumento(documento)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">Archivo: {getDocumentoArchivo(documento)}</p>
            </div>
          </div>
          <Badge variant="secondary">{getEstado(documento)}</Badge>
        </div>
      ))}
    </div>
  );
}
