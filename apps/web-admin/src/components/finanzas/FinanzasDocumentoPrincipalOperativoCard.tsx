"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  documentoLabel,
  getDocumentoId,
  getDocumentoPrincipal,
  getDocumentoTipo,
  getFechaDocumento,
  getMontoDocumento,
  getProveedor,
  getRucProveedor,
} from "@/components/documental-v2/workspace-v2-utils";

export function FinanzasDocumentoPrincipalOperativoCard({
  id,
  onVer,
}: {
  id: string | number;
  onVer?: (documentoId: string | number) => void;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["finanzas-v2-principal", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card className="w-full lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle>Documento principal</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-36 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Card className="w-full lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle>Documento principal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar el Principal V2 desde Workspace. Finanzas no debe operar con fuente legacy como principal vigente.
          </div>
        </CardContent>
      </Card>
    );
  }

  const principal = getDocumentoPrincipal(workspaceQuery.data);
  const principalDocumentoId = principal
    ? String(getDocumentoId(principal) ?? "").trim()
    : "";

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Documento principal
      </p>
      {principal ? (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="truncate font-semibold">{documentoLabel(principal)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">{getDocumentoTipo(principal)}</Badge>
              {onVer && principalDocumentoId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => onVer(principalDocumentoId)}
                >
                  Ver
                </Button>
              ) : null}
            </div>
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)]">
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
              <dd className="mt-1 font-medium">{getProveedor(principal)}</dd>
              <dd className="text-xs text-muted-foreground">RUC {getRucProveedor(principal)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
              <dd className="mt-1 font-medium">{getFechaDocumento(principal)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Monto</dt>
              <dd className="mt-1 font-medium">{getMontoDocumento(principal)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Este expediente no tiene Principal V2 persistido. Finanzas no puede adjuntar pagos.
        </div>
      )}
    </div>
  );
}
