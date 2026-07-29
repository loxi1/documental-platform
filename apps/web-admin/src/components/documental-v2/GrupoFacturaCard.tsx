import { ReceiptText } from "lucide-react";

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
}: {
  grupo: WorkspaceV2GrupoFactura;
  index: number;
  onWorkspaceRefresh?: () => Promise<unknown> | unknown;
}) {
  const adjuntos = getAdjuntosGrupo(grupo);
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const label = getGrupoFacturaLabel(grupo);

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
            {grupoFacturaId ? (
              <>
                <AsociarDocumentoGrupoFacturaPanel grupoFacturaId={grupoFacturaId} onAssociated={onWorkspaceRefresh} />
                <RevertirEntidadDialog
                  title="Anular Grupo de Factura"
                  description="Esta acción desactiva el Grupo de Factura. No elimina documentos ni archivos."
                  entityLabel={label}
                  triggerLabel="Anular grupo"
                  confirmLabel="Anular grupo"
                  onConfirm={async (motivo) => {
                    await anularGrupoFacturaV2(grupoFacturaId, { motivo });
                    await onWorkspaceRefresh?.();
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Documentos del grupo</h3>
            <span className="text-xs text-muted-foreground">Guías, notas de ingreso, transferencias y detracciones</span>
          </div>
          <AdjuntosList
            documentos={adjuntos}
            emptyLabel="Sin documentos asociados todavía."
            onWorkspaceRefresh={onWorkspaceRefresh}
            permitirReversionGrupo
          />
        </div>
      </CardContent>
    </Card>
  );
}
