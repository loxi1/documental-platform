import { FileCheck2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceV2Documento } from "@/types/documental-v2-workspace";
import {
  documentoLabel,
  getDocumentoArchivo,
  getDocumentoId,
  getDocumentoTipo,
  getEstado,
  getFechaDocumento,
  getMontoDocumento,
  getNumeroDocumento,
  getProveedor,
  getRucProveedor,
  isPrincipal,
  textValue,
} from "./workspace-v2-utils";

export function DocumentoOperativoPrincipalCard({ documento }: { documento?: WorkspaceV2Documento | null }) {
  if (!documento) {
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
            El Workspace no devolvió un Documento Operativo Principal para este contexto.
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <p className="text-sm text-muted-foreground">{documentoLabel(documento)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isPrincipal(documento) ? "default" : "outline"}>
              {isPrincipal(documento) ? "Principal activo" : "No marcado como principal"}
            </Badge>
            <Badge variant="secondary">{getEstado(documento)}</Badge>
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
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Documento ID</dt>
            <dd className="mt-1 font-medium text-muted-foreground">{textValue(getDocumentoId(documento))}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Archivo</dt>
            <dd className="mt-1 truncate font-medium">{getDocumentoArchivo(documento)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
