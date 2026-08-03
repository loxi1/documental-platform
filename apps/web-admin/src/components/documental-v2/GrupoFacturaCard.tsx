import { CheckCircle2, Link2, Lock, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { anularGrupoFacturaV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import { AdjuntosList } from "./AdjuntosList";
import { AsociarDocumentoGrupoFacturaPanel } from "./AsociarDocumentoGrupoFacturaPanel";
import { RevertirEntidadDialog } from "./RevertirEntidadDialog";
import {
  getAdjuntosGrupo,
  getEstado,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaLabel,
  getGrupoFacturaPersistidoId,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
} from "./workspace-v2-utils";

export function GrupoFacturaCard({
  grupo,
  index,
  onWorkspaceRefresh,
  canAssociateGroupDocument = false,
  canCancelGroup = false,
  canRemoveGroupDocument = false,
}: {
  grupo: WorkspaceV2GrupoFactura;
  index: number;
  onWorkspaceRefresh?: () => Promise<unknown> | unknown;
  canAssociateGroupDocument?: boolean;
  canCancelGroup?: boolean;
  canRemoveGroupDocument?: boolean;
}) {
  const adjuntos = getAdjuntosGrupo(grupo);
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const label = getGrupoFacturaLabel(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const grupoPersistido = Boolean(grupoFacturaId);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Grupo de Factura {index + 1}</CardTitle>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getEstado(grupo)}</Badge>
            <Badge variant={grupoPersistido ? "default" : "outline"}>
              {grupoPersistido ? "Grupo documental persistido" : "Vista de compatibilidad V1"}
            </Badge>
            {grupoPersistido ? <Badge variant="outline">Listo para Almacén</Badge> : null}
            {grupoFacturaId ? (
              <>
                {canAssociateGroupDocument ? (
                  <AsociarDocumentoGrupoFacturaPanel
                    grupoFacturaId={grupoFacturaId}
                    authorized={canAssociateGroupDocument}
                    onAssociated={onWorkspaceRefresh}
                  />
                ) : null}
                {canCancelGroup ? (
                  <RevertirEntidadDialog
                    title="Anular Grupo de Factura"
                    description="Esta acción desactiva el Grupo de Factura. No elimina documentos ni archivos."
                    entityLabel={label}
                    triggerLabel="Anular grupo"
                    confirmLabel="Anular grupo"
                    onConfirm={async (motivo) => {
                      if (!canCancelGroup) return;
                      await anularGrupoFacturaV2(grupoFacturaId, { motivo });
                      await onWorkspaceRefresh?.();
                    }}
                  />
                ) : null}
              </>
            ) : (
              <div className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Asociación no persistida
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex gap-2 rounded-lg border p-3 text-sm ${
          grupoPersistido
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
        }`}>
          {grupoPersistido ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Link2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p className="font-medium">
              {grupoPersistido
                ? "Grupo documental persistido — listo para asociación de documentos"
                : "Vista de compatibilidad V1 — asociación no persistida"}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {grupoPersistido
                ? `grupoFacturaId: ${grupoFacturaId}. Las acciones de Almacén deben usar este identificador.`
                : "No use este grupo derivado como destino de escritura para Guía, Nota de ingreso, Transferencia o Detracción."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Factura</p>
            <p className="mt-1 font-medium">{label}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Proveedor</p>
            <p className="mt-1 font-medium">{getGrupoProveedor(grupo)}</p>
            <p className="text-xs text-muted-foreground">RUC: {getGrupoRucProveedor(grupo)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Fecha</p>
            <p className="mt-1 font-medium">{getGrupoFecha(grupo)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Importe</p>
            <p className="mt-1 font-medium">{getGrupoImporte(grupo)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Principal V2</p>
            <p className="mt-1 font-medium">{principalDocumentoId ? `Documento ${principalDocumentoId}` : "No informado"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Factura documento</p>
            <p className="mt-1 font-medium">{facturaDocumentoId ? `Documento ${facturaDocumentoId}` : "No informado"}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Documentos asociados al grupo</h3>
            <span className="text-xs text-muted-foreground">Guías, notas de ingreso, transferencias y detracciones asociadas al grupo persistido</span>
          </div>
          <AdjuntosList
            documentos={adjuntos}
            emptyLabel="Sin documentos asociados todavía."
            onWorkspaceRefresh={onWorkspaceRefresh}
            permitirReversionGrupo
            canRemoveGroupDocument={canRemoveGroupDocument}
          />
        </div>
      </CardContent>
    </Card>
  );
}
