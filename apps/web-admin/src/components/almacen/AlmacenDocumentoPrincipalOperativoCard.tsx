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
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaPersistidoId,
  getGruposFactura,
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

function recordId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const record = value as Record<string, unknown>;
  return String(
    record.documentoId ??
      record.documento_id ??
      record.id ??
      "",
  ).trim();
}

function findDocumentoById(
  source: unknown,
  documentoId: string,
): WorkspaceV2Documento | null {
  if (!documentoId) return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findDocumentoById(item, documentoId);
      if (found) return found;
    }
    return null;
  }

  if (!source || typeof source !== "object") return null;

  if (recordId(source) === documentoId) {
    return source as WorkspaceV2Documento;
  }

  for (const value of Object.values(source as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const found = findDocumentoById(value, documentoId);
    if (found) return found;
  }

  return null;
}

export function AlmacenDocumentoPrincipalOperativoCard({
  expedienteId,
  grupoFacturaId = null,
  fallbackTitle,
  fallbackDescription,
  fallbackActive = false,
  emptyMessage = "Sin documento principal.",
}: {
  expedienteId: string | number;
  grupoFacturaId?: string | number | null;
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

  const grupoSolicitado =
    grupoFacturaId === null || grupoFacturaId === undefined
      ? null
      : String(grupoFacturaId);

  const grupo =
    workspaceQuery.data && grupoSolicitado
      ? getGruposFactura(workspaceQuery.data).find(
          (item) =>
            String(getGrupoFacturaPersistidoId(item) ?? "") ===
            grupoSolicitado,
        ) ?? null
      : null;

  const principalDocumentoId =
    grupo && grupoSolicitado
      ? getGrupoDocumentoPrincipalDocumentoId(grupo)
      : null;

  const documentoV2 =
    workspaceQuery.data && grupoSolicitado
      ? principalDocumentoId !== null && principalDocumentoId !== undefined
        ? findDocumentoById(
            workspaceQuery.data,
            String(principalDocumentoId),
          )
        : null
      : workspaceQuery.data
        ? getWorkspaceDocumentoPrincipal(workspaceQuery.data)
        : null;

  const grupoNoResuelto = Boolean(
    grupoSolicitado && workspaceQuery.data && !grupo,
  );

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
            {!mostrarV2 && fallbackActive ? <Badge variant="outline">Legacy de consulta</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {grupoNoResuelto ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo resolver el documento principal del grupo solicitado.
            No se mostrará el principal de otro grupo.
          </div>
        ) : workspaceQuery.isLoading && !title ? (
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
