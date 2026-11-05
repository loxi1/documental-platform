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
  getGruposFactura,
  getGrupoFacturaPersistidoId,
  getGrupoDocumentoPrincipalDocumentoId,
  getDocumentoTipo,
  getFechaDocumento,
  getMontoDocumento,
  getProveedor,
  getRucProveedor,
} from "@/components/documental-v2/workspace-v2-utils";

import type { WorkspaceDocumentalV2, WorkspaceV2Documento } from "@/types/documental-v2-workspace";

export function resolverPrincipalFinanzas(workspace: WorkspaceDocumentalV2, grupoFacturaId?: string | number | null): WorkspaceV2Documento | null {
  if (grupoFacturaId == null) return getDocumentoPrincipal(workspace);
  const grupo = getGruposFactura(workspace).find(item => String(getGrupoFacturaPersistidoId(item)) === String(grupoFacturaId));
  if (!grupo) return null;
  const principalId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  if (principalId == null) return null;
  const record = workspace as unknown as Record<string, unknown>;
  const compat = (record.compatibilidad ?? {}) as Record<string, unknown>;
  const candidates = [record.documentosOperativosPrincipales, record.documentos_operativos_principales, compat.documentosOperativosPrincipales, compat.documentos_operativos_principales]
    .flatMap(value => Array.isArray(value) ? value : []);
  candidates.push(record.documentoOperativoPrincipal, record.documento_operativo_principal, record.documentoPrincipal, record.documento_principal);
  return candidates.find((item): item is WorkspaceV2Documento => Boolean(item) && String(getDocumentoId(item as WorkspaceV2Documento)) === String(principalId)) ?? null;
}

export function FinanzasDocumentoPrincipalOperativoCard({
  id,
  grupoFacturaId = null,
  onVer,
}: {
  id: string | number;
  grupoFacturaId?: string | number | null;
  onVer?: (documentoId: string | number) => void;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["finanzas-v2-principal", String(id), grupoFacturaId ?? null],
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

  const principal = resolverPrincipalFinanzas(workspaceQuery.data, grupoFacturaId);
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
          {grupoFacturaId != null ? "No se pudo resolver el principal del grupo seleccionado. No se mostrará la OC de otro grupo." : "Este expediente no tiene Principal V2 persistido. Finanzas no puede adjuntar pagos."}
        </div>
      )}
    </div>
  );
}
