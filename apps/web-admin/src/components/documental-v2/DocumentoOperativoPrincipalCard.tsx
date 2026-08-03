import { FileCheck2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { anularDocumentoOperativoPrincipalV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2ContextoOperativo, WorkspaceV2Documento } from "@/types/documental-v2-workspace";
import { AsociarDocumentoPrincipalPanel } from "./AsociarDocumentoPrincipalPanel";
import { RevertirEntidadDialog } from "./RevertirEntidadDialog";
import {
  documentoLabel,
  getContextoEmpresaCodigo,
  getContextoOperativoId,
  getDocumentoArchivo,
  getDocumentoId,
  getDocumentoOperativoPrincipalPersistidoId,
  getDocumentoTipo,
  getEstado,
  getFechaDocumento,
  getMontoDocumento,
  getNumeroDocumento,
  getProveedor,
  getRucProveedor,
  isPrincipal,
} from "./workspace-v2-utils";

export function DocumentoOperativoPrincipalCard({
  documento,
  contexto,
  onWorkspaceRefresh,
  canAssociatePrincipal = false,
  canCancelPrincipal = false,
}: {
  documento?: WorkspaceV2Documento | null;
  contexto?: WorkspaceV2ContextoOperativo | null;
  onWorkspaceRefresh?: () => Promise<unknown> | unknown;
  canAssociatePrincipal?: boolean;
  canCancelPrincipal?: boolean;
}) {
  if (!documento) {
    const contenedorOperativoId = getContextoOperativoId(contexto);
    const empresaCodigo = getContextoEmpresaCodigo(contexto);

    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Info className="h-4 w-4" />
            </div>
            <CardTitle>Documento Operativo Principal</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sin Documento Operativo Principal</p>
            <p className="mt-1">
              {canAssociatePrincipal
                ? "Asocia un documento existente como Documento Operativo Principal de este contexto."
                : "No se ha informado un Documento Operativo Principal para este contexto."}
            </p>
            {canAssociatePrincipal ? (
              <div className="mt-4">
                <AsociarDocumentoPrincipalPanel
                  contenedorOperativoId={contenedorOperativoId}
                  empresaCodigo={empresaCodigo}
                  authorized={canAssociatePrincipal}
                  onAssociated={onWorkspaceRefresh}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const documentoOperativoPrincipalId = getDocumentoOperativoPrincipalPersistidoId(documento);
  const documentoId = getDocumentoId(documento);
  const label = documentoLabel(documento);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Documento Operativo Principal</CardTitle>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPrincipal(documento) ? "default" : "outline"}>
              {isPrincipal(documento) ? "Principal activo" : "No marcado como principal"}
            </Badge>
            <Badge variant="secondary">{getEstado(documento)}</Badge>
            {documentoOperativoPrincipalId ? <Badge variant="outline">Principal V2 {String(documentoOperativoPrincipalId)}</Badge> : null}
            {documentoId ? <Badge variant="outline">Documento {String(documentoId)}</Badge> : null}
            {documentoOperativoPrincipalId && canCancelPrincipal ? (
              <RevertirEntidadDialog
                title="Anular documento principal"
                description="Esta acción desactiva la relación del Documento Operativo Principal. No elimina el documento ni sus archivos."
                entityLabel={label}
                triggerLabel="Anular"
                confirmLabel="Anular principal"
                onConfirm={async (motivo) => {
                  if (!canCancelPrincipal) return;
                  await anularDocumentoOperativoPrincipalV2(documentoOperativoPrincipalId, { motivo });
                  await onWorkspaceRefresh?.();
                }}
              />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Tipo</dt>
            <dd className="mt-1 font-medium">{getDocumentoTipo(documento)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Número</dt>
            <dd className="mt-1 font-medium">{getNumeroDocumento(documento)}</dd>
          </div>
          <div className="lg:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
            <dd className="mt-1 font-medium">{getProveedor(documento)}</dd>
            <dd className="text-xs text-muted-foreground">RUC: {getRucProveedor(documento)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
            <dd className="mt-1 font-medium">{getFechaDocumento(documento)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Monto</dt>
            <dd className="mt-1 font-medium">{getMontoDocumento(documento)}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Archivo</dt>
            <dd className="mt-1 truncate font-medium">{getDocumentoArchivo(documento)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
