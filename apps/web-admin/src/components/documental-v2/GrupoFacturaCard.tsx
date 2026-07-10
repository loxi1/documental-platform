import { ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import { AdjuntosList } from "./AdjuntosList";
import {
  getAdjuntosGrupo,
  getEstado,
  getGrupoFacturaLabel,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
} from "./workspace-v2-utils";

export function GrupoFacturaCard({ grupo, index }: { grupo: WorkspaceV2GrupoFactura; index: number }) {
  const adjuntos = getAdjuntosGrupo(grupo);

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
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Agrupación visual</Badge>
            <Badge variant="secondary">{getEstado(grupo)}</Badge>
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Adjuntos del grupo</h3>
            <span className="text-xs text-muted-foreground">Guías, notas de ingreso, transferencias, detracciones u otros</span>
          </div>
          <AdjuntosList documentos={adjuntos} />
        </div>
      </CardContent>
    </Card>
  );
}
