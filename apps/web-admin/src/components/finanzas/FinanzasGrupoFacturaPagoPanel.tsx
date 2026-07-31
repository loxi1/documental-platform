"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Link2 } from "lucide-react";

import { AsociarDocumentoGrupoFacturaPanel } from "@/components/documental-v2/AsociarDocumentoGrupoFacturaPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2Documento, WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import {
  entityVista,
  getAdjuntosGrupo,
  getContexto,
  getContextoEmpresaCodigo,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaLabel,
  getGrupoFacturaPersistidoId,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
  getGruposFactura,
  textValue,
} from "@/components/documental-v2/workspace-v2-utils";

function hasAdjunto(grupo: WorkspaceV2GrupoFactura, aliases: string[]) {
  const normalized = aliases.map((alias) => alias.toUpperCase());
  return getAdjuntosGrupo(grupo).some((documento: WorkspaceV2Documento) => {
    const vista = entityVista<Record<string, unknown>>(documento);
    const tipo = String(vista.tipoDocumental ?? vista.tipo_documental ?? "").toUpperCase();
    const relacion = String(vista.tipoRelacion ?? vista.tipo_relacion ?? "").toUpperCase();
    return normalized.some((alias) => tipo.includes(alias) || relacion.includes(alias));
  });
}

function EstadoPagoBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className={active ? "gap-1" : "gap-1 text-muted-foreground"}>
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function GrupoPagoCard({
  grupo,
  expedienteId,
  editable,
  onRefresh,
}: {
  grupo: WorkspaceV2GrupoFactura;
  expedienteId: string | number;
  editable: boolean;
  onRefresh: () => Promise<unknown> | unknown;
}) {
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const transferencia = hasAdjunto(grupo, ["TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA", "PAGO_TRANSFERENCIA"]);
  const detraccion = hasAdjunto(grupo, ["DETRACCION", "DETRACCIÓN", "ADJUNTO_DETRACCION", "PAGO_DETRACCION"]);
  const recepcionConEvidencia = hasAdjunto(grupo, [
    "GUIA_REMISION",
    "GUIA",
    "GUÍA",
    "ADJUNTO_GUIA",
    "NOTA_INGRESO",
    "NOTA INGRESO",
    "ADJUNTO_NOTA_INGRESO",
  ]);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{getGrupoFacturaLabel(grupo)}</h3>
            <Badge variant="secondary">Disponible para pago</Badge>
            {grupoFacturaId ? <Badge variant="outline">grupoFacturaId {String(grupoFacturaId)}</Badge> : null}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
              <dd className="mt-1 font-medium">{getGrupoProveedor(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">RUC</dt>
              <dd className="mt-1 font-medium">{getGrupoRucProveedor(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
              <dd className="mt-1 font-medium">{getGrupoFecha(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Importe</dt>
              <dd className="mt-1 font-medium">{getGrupoImporte(grupo)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 text-xs">
            {principalDocumentoId ? <Badge variant="outline">Principal documento {String(principalDocumentoId)}</Badge> : null}
            {facturaDocumentoId ? <Badge variant="outline">Factura documento {String(facturaDocumentoId)}</Badge> : null}
            <Badge variant="outline">Estado documental {textValue(entityVista<Record<string, unknown>>(grupo).estadoRevisionLabel ?? entityVista<Record<string, unknown>>(grupo).estado_revision_label ?? entityVista<Record<string, unknown>>(grupo).estado, "Sin estado")}</Badge>
            <Badge variant="outline">Persistencia persistido</Badge>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap gap-2">
              <EstadoPagoBadge label="Factura" active />
              <EstadoPagoBadge label="Recepción" active={recepcionConEvidencia} />
              <EstadoPagoBadge label="Transferencia" active={transferencia} />
              <EstadoPagoBadge label="Detracción" active={detraccion} />
            </div>
            {!recepcionConEvidencia ? (
              <p className="text-xs text-muted-foreground">
                Recepción sin evidencia asociada en el grupo. Finanzas no infiere recepción completa solo por existir factura o grupo persistido.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/workspace/expedientes-v1/${expedienteId}`}>
              <Link2 className="h-4 w-4" />
              Ver Workspace
            </Link>
          </Button>
          {editable ? (
            <AsociarDocumentoGrupoFacturaPanel grupoFacturaId={grupoFacturaId} modo="finanzas" onAssociated={onRefresh} />
          ) : (
            <Button asChild size="sm">
              <Link href={`/finanzas/${expedienteId}/editar`}>Adjuntar pago</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanzasGrupoFacturaPagoPanel({ id, editable = false }: { id: string | number; editable?: boolean }) {
  const workspaceQuery = useQuery({
    queryKey: ["finanzas-v2-grupos-pago", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Grupos documentales para pago</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Grupos documentales para pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar el Workspace V2. Finanzas no debe operar pagos sin grupoFacturaId persistido.
          </div>
        </CardContent>
      </Card>
    );
  }

  const workspace = workspaceQuery.data;
  const gruposPersistidos = getGruposFactura(workspace).filter((grupo) => Boolean(getGrupoFacturaPersistidoId(grupo)));
  const contexto = getContexto(workspace);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Grupos documentales para pago</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista de Finanzas sobre el mismo núcleo documental V2. Solo permite pagos cuando existe grupoFacturaId persistido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getContextoEmpresaCodigo(contexto) || "Empresa"}</Badge>
            <Badge variant="outline">{gruposPersistidos.length} grupo(s) persistido(s)</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gruposPersistidos.length ? (
          gruposPersistidos.map((grupo, index) => (
            <GrupoPagoCard
              key={String(getGrupoFacturaPersistidoId(grupo) ?? index)}
              grupo={grupo}
              expedienteId={id}
              editable={editable}
              onRefresh={() => workspaceQuery.refetch()}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay grupos de factura persistidos. Finanzas debe esperar la organización documental de Compras.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
