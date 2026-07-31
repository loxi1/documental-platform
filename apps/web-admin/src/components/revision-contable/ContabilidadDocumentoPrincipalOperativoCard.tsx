"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  documentoLabel,
  getDocumentoArchivo,
  getDocumentoId,
  getDocumentoOperativoPrincipalPersistidoId,
  getDocumentoPrincipal,
  getDocumentoTipo,
  getEstado,
  getFechaDocumento,
  getMontoDocumento,
  getNumeroDocumento,
  getProveedor,
  getRucProveedor,
} from "@/components/documental-v2/workspace-v2-utils";

export function ContabilidadDocumentoPrincipalOperativoCard({ id }: { id: string | number }) {
  const workspaceQuery = useQuery({
    queryKey: ["contabilidad-v2-principal", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Documento principal V2</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-36 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Documento principal V2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar el Principal V2 desde Workspace. Contabilidad conserva esta vista en solo lectura y no debe usar fuente legacy como principal vigente.
          </div>
        </CardContent>
      </Card>
    );
  }

  const principal = getDocumentoPrincipal(workspaceQuery.data);
  const principalV2Id = getDocumentoOperativoPrincipalPersistidoId(principal);
  const documentoId = getDocumentoId(principal);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Documento principal V2</CardTitle>
          <div className="flex flex-wrap gap-2">
            {principalV2Id ? <Badge variant="outline">Principal V2 {String(principalV2Id)}</Badge> : null}
            {documentoId ? <Badge variant="outline">Documento {String(documentoId)}</Badge> : null}
            {principal ? <Badge variant="outline">{getEstado(principal)}</Badge> : <Badge variant="outline">Sin principal</Badge>}
            <Badge variant="secondary">Solo lectura</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {principal ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <div className="text-lg font-semibold">{documentoLabel(principal)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {getProveedor(principal)} · {getFechaDocumento(principal)} · Monto {getMontoDocumento(principal)}
                  </div>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Tipo</dt>
                    <dd className="mt-1 font-medium">{getDocumentoTipo(principal)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Número</dt>
                    <dd className="mt-1 font-medium">{getNumeroDocumento(principal)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
                    <dd className="mt-1 font-medium">{getProveedor(principal)}</dd>
                    <dd className="text-xs text-muted-foreground">RUC: {getRucProveedor(principal)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha / monto</dt>
                    <dd className="mt-1 font-medium">{getFechaDocumento(principal)}</dd>
                    <dd className="text-xs text-muted-foreground">{getMontoDocumento(principal)}</dd>
                  </div>
                </dl>

                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Archivo</div>
                  <div className="mt-1 text-sm font-medium">{getDocumentoArchivo(principal)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Este expediente no tiene Principal V2 persistido. Contabilidad mantiene la revisión en solo lectura.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
