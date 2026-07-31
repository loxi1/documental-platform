"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2Documento } from "@/types/documental-v2-workspace";
import {
  documentoLabel as workspaceDocumentoLabel,
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
  getDocumentoPrincipal as getWorkspaceDocumentoPrincipal,
  textValue,
} from "@/components/documental-v2/workspace-v2-utils";

function documentoTituloV2(documento?: WorkspaceV2Documento | null) {
  if (!documento) return "Sin documento";

  const label = workspaceDocumentoLabel(documento);
  if (label && label !== "Documento no informado") return label;

  const tipo = getDocumentoTipo(documento);
  const numero = getNumeroDocumento(documento);
  return [tipo !== "Documento" ? tipo : "Documento", numero !== "No informado" ? numero : null].filter(Boolean).join(" ");
}

function documentoDescripcionV2(documento?: WorkspaceV2Documento | null) {
  if (!documento) return "—";

  const proveedor = getProveedor(documento);
  const fecha = getFechaDocumento(documento);
  const monto = getMontoDocumento(documento);

  return [
    proveedor !== "No informado" ? proveedor : null,
    fecha !== "—" ? fecha : null,
    monto !== "—" ? `Monto ${monto}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";
}

export function AlmacenDocumentoPrincipalOperativoCard({
  expedienteId,
  fallbackTitle,
  fallbackDescription,
  fallbackActive = false,
  emptyMessage = "Sin documento principal.",
}: {
  expedienteId: string | number;
  fallbackTitle?: string | null;
  fallbackDescription?: string | null;
  fallbackActive?: boolean;
  emptyMessage?: string;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["almacen-documento-principal-v2", String(expedienteId)],
    enabled: Boolean(expedienteId),
    queryFn: () => getWorkspaceDocumentalV2(expedienteId),
  });

  const documentoV2 = workspaceQuery.data ? getWorkspaceDocumentoPrincipal(workspaceQuery.data) : null;
  const documentoOperativoPrincipalId = getDocumentoOperativoPrincipalPersistidoId(documentoV2);
  const documentoId = getDocumentoId(documentoV2);
  const mostrarV2 = Boolean(documentoV2);
  const title = mostrarV2 ? documentoTituloV2(documentoV2) : fallbackTitle;
  const description = mostrarV2 ? documentoDescripcionV2(documentoV2) : fallbackDescription;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Documento principal</CardTitle>
          <div className="flex flex-wrap gap-2">
            {documentoOperativoPrincipalId ? <Badge variant="secondary">Principal V2 {String(documentoOperativoPrincipalId)}</Badge> : null}
            {documentoId ? <Badge variant="outline">Documento {String(documentoId)}</Badge> : null}
            {mostrarV2 ? <Badge variant="outline">{getEstado(documentoV2)}</Badge> : null}
            {!mostrarV2 && fallbackActive ? <Badge variant="outline">Legacy de consulta</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {workspaceQuery.isLoading && !title ? (
          <div className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : title ? (
          <div className="rounded-xl border bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{description || "—"}</div>

                {mostrarV2 ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Tipo</dt>
                      <dd className="mt-1 font-medium">{getDocumentoTipo(documentoV2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Número</dt>
                      <dd className="mt-1 font-medium">{getNumeroDocumento(documentoV2)}</dd>
                    </div>
                    <div className="lg:col-span-2">
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
                      <dd className="mt-1 font-medium">{getProveedor(documentoV2)}</dd>
                      <dd className="text-xs text-muted-foreground">RUC: {getRucProveedor(documentoV2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
                      <dd className="mt-1 font-medium">{getFechaDocumento(documentoV2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Monto</dt>
                      <dd className="mt-1 font-medium">{getMontoDocumento(documentoV2)}</dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2">
                      <dt className="text-xs font-medium uppercase text-muted-foreground">Archivo</dt>
                      <dd className="mt-1 truncate font-medium">{getDocumentoArchivo(documentoV2)}</dd>
                    </div>
                  </dl>
                ) : workspaceQuery.isError ? (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                    No se pudo validar el principal V2. Mostrando referencia legacy solo para consulta.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{textValue(emptyMessage)}</div>
        )}
      </CardContent>
    </Card>
  );
}
