import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { anularGrupoFacturaDocumentoV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2Documento } from "@/types/documental-v2-workspace";
import { RevertirEntidadDialog } from "./RevertirEntidadDialog";
import {
  documentoLabel,
  getDocumentoArchivo,
  getDocumentoId,
  getDocumentoTipo,
  getEstado,
  getFechaDocumento,
  getGrupoFacturaDocumentoPersistidoId,
  getMontoDocumento,
} from "./workspace-v2-utils";


function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getDocumentoMetadata(documento: WorkspaceV2Documento) {
  const record = asRecord(documento);
  const vista = asRecord(record.vista);
  return asRecord(record.metadata ?? vista.metadata);
}

function isTruthyFlag(value: unknown) {
  return value === true || String(value).trim().toLowerCase() === "true";
}

function isPruebaControlada(documento: WorkspaceV2Documento) {
  const metadata = getDocumentoMetadata(documento);
  return isTruthyFlag(metadata.pruebaControlada ?? metadata.prueba_controlada);
}

function isDocumentoNoRelacionado(documento: WorkspaceV2Documento) {
  const metadata = getDocumentoMetadata(documento);
  return isTruthyFlag(metadata.documentoNoRelacionado ?? metadata.documento_no_relacionado);
}

type AdjuntosListProps = {
  documentos: WorkspaceV2Documento[];
  emptyLabel?: string;
  onWorkspaceRefresh?: () => Promise<unknown> | unknown;
  permitirReversionGrupo?: boolean;
  canRemoveGroupDocument?: boolean;
};

export function AdjuntosList({
  documentos,
  emptyLabel = "Sin adjuntos informados por el Workspace V2.",
  onWorkspaceRefresh,
  permitirReversionGrupo = false,
  canRemoveGroupDocument = false,
}: AdjuntosListProps) {
  if (!documentos.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documentos.map((documento, index) => {
        const documentoGrupoFacturaId = permitirReversionGrupo
          ? getGrupoFacturaDocumentoPersistidoId(documento, { permitirIdGenerico: true })
          : null;
        const label = documentoLabel(documento);
        const pruebaControlada = isPruebaControlada(documento);
        const documentoNoRelacionado = isDocumentoNoRelacionado(documento);

        return (
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
                  <p className="font-medium text-foreground">{label}</p>
                  <Badge variant="outline">{getDocumentoTipo(documento)}</Badge>
                  {documentoGrupoFacturaId ? (
                    <Badge variant="outline">Persistido en grupo</Badge>
                  ) : (
                    <Badge variant="outline">Solo expediente</Badge>
                  )}
                  {pruebaControlada ? <Badge variant="secondary">Prueba controlada</Badge> : null}
                  {documentoNoRelacionado ? <Badge variant="destructive">Documento no relacionado</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fecha: {getFechaDocumento(documento)} · Monto: {getMontoDocumento(documento)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground" title={getDocumentoArchivo(documento)}>
                  Archivo: {getDocumentoArchivo(documento)}
                </p>
                {pruebaControlada || documentoNoRelacionado ? (
                  <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    Prueba controlada. Documento no relacionado con la factura. No debe utilizarse para validar correspondencia.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge variant="secondary">{getEstado(documento)}</Badge>
              {documentoGrupoFacturaId && canRemoveGroupDocument ? (
                <RevertirEntidadDialog
                  title="Anular documento asociado"
                  description="Esta acción desactiva la relación del documento con el Grupo de Factura. No elimina el documento ni sus archivos."
                  entityLabel={label}
                  triggerLabel="Quitar"
                  confirmLabel="Quitar documento"
                  onConfirm={async (motivo) => {
                    if (!canRemoveGroupDocument) return;
                    await anularGrupoFacturaDocumentoV2(documentoGrupoFacturaId, { motivo });
                    await onWorkspaceRefresh?.();
                  }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
