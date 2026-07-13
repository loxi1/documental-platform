import { ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AsociarDocumentoGrupoFacturaV2Result, WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import { AdjuntosList } from "./AdjuntosList";
import { AsociarDocumentoGrupoFacturaPanel } from "./AsociarDocumentoGrupoFacturaPanel";
import {
  asRecord,
  getAdjuntosGrupo,
  getEstado,
  getGrupoFacturaLabel,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
} from "./workspace-v2-utils";

function getGrupoFacturaPersistidoId(grupo: WorkspaceV2GrupoFactura) {
  const persistido = asRecord(grupo.persistido);
  const id = persistido.id ?? persistido.grupoFacturaId ?? persistido.grupo_factura_id;

  if (typeof id === "string" || typeof id === "number") return id;

  return null;
}

export function GrupoFacturaCard({
  grupo,
  index,
  onWorkspaceRefresh,
}: {
  grupo: WorkspaceV2GrupoFactura;
  index: number;
  onWorkspaceRefresh?: (result: AsociarDocumentoGrupoFacturaV2Result) => Promise<unknown> | unknown;
}) {
  const adjuntos = getAdjuntosGrupo(grupo);
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const puedeOperar = Boolean(grupoFacturaId);

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
              <p className="text-sm text-muted-foreground">{getGrupoFacturaLabel(grupo)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getEstado(grupo)}</Badge>
            {puedeOperar ? (
              <AsociarDocumentoGrupoFacturaPanel grupoFacturaId={grupoFacturaId} onAssociated={onWorkspaceRefresh} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 rounded-lg bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Factura</p>
            <p className="mt-1 font-medium">{getGrupoFacturaLabel(grupo)}</p>
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
          <AdjuntosList documentos={adjuntos} emptyLabel="Sin documentos asociados todavía." />
        </div>
      </CardContent>
    </Card>
  );
}
