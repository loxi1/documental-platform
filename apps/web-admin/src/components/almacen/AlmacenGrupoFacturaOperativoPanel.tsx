"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FileCheck2, Link2 } from "lucide-react";

import { AsociarDocumentoGrupoFacturaPanel } from "@/components/documental-v2/AsociarDocumentoGrupoFacturaPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  entityPersistencia,
  getContexto,
  getContextoEmpresaCodigo,
  getEstado,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaId,
  getGrupoFacturaLabel,
  getGrupoFacturaPersistidoId,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
  getGruposFactura,
  textValue,
} from "@/components/documental-v2/workspace-v2-utils";

export function AlmacenGrupoFacturaOperativoPanel({
  expedienteId,
  modo = "ver",
}: {
  expedienteId: string | number;
  modo?: "ver" | "editar";
}) {
  const workspaceQuery = useQuery({
    queryKey: ["almacen-workspace-v2", String(expedienteId)],
    enabled: Boolean(expedienteId),
    queryFn: () => getWorkspaceDocumentalV2(expedienteId),
  });

  const workspace = workspaceQuery.data;
  const contexto = workspace ? getContexto(workspace) : null;
  const grupos = useMemo(() => (workspace ? getGruposFactura(workspace) : []), [workspace]);
  const gruposPersistidos = useMemo(
    () => grupos.filter((grupo) => Boolean(getGrupoFacturaPersistidoId(grupo))),
    [grupos],
  );

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Grupos documentales para recepción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (workspaceQuery.isError || !workspace) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle>Grupos documentales para recepción</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No se pudo consultar Workspace V2. Almacén mantiene la consulta legacy, pero no debe asociar documentos sin grupo persistido.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Grupos documentales para recepción</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista de Almacén sobre el mismo núcleo documental V2. Solo permite recepción cuando existe grupoFacturaId persistido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getContextoEmpresaCodigo(contexto) || "Empresa"}</Badge>
            <Badge variant="secondary">{gruposPersistidos.length} grupo(s) persistido(s)</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gruposPersistidos.length ? (
          gruposPersistidos.map((grupo, index) => {
            const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
            const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo) ?? getGrupoFacturaId(grupo);
            const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
            const estadoPersistencia = entityPersistencia(grupo) ?? "persistido";

            return (
              <div key={String(grupoFacturaId ?? index)} className="rounded-xl border bg-muted/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{getGrupoFacturaLabel(grupo)}</h3>
                      <Badge variant="secondary">Listo para Almacén</Badge>
                      <Badge variant="outline">grupoFacturaId {String(grupoFacturaId)}</Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="block text-xs font-medium uppercase">Proveedor</span>
                        <span className="text-foreground">{getGrupoProveedor(grupo)}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium uppercase">RUC</span>
                        <span className="text-foreground">{getGrupoRucProveedor(grupo)}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium uppercase">Fecha</span>
                        <span className="text-foreground">{getGrupoFecha(grupo)}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium uppercase">Importe</span>
                        <span className="text-foreground">{getGrupoImporte(grupo)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">Principal documento {textValue(principalDocumentoId, "—")}</Badge>
                      <Badge variant="outline">Factura documento {textValue(facturaDocumentoId, "—")}</Badge>
                      <Badge variant="outline">Estado documental {getEstado(grupo)}</Badge>
                      <Badge variant="outline">Persistencia {estadoPersistencia}</Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/workspace/expedientes-v1/${expedienteId}`}>
                        <Link2 className="h-4 w-4" />
                        Ver Workspace
                      </Link>
                    </Button>
                    {modo === "editar" ? (
                      <AsociarDocumentoGrupoFacturaPanel
                        grupoFacturaId={grupoFacturaId}
                        modo="almacen"
                        onAssociated={() => workspaceQuery.refetch()}
                      />
                    ) : (
                      <Button asChild size="sm">
                        <Link href={`/almacen/${expedienteId}/editar?grupoFacturaId=${String(grupoFacturaId)}`}>
                          <FileCheck2 className="h-4 w-4" />
                          Adjuntar Guía/NI
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay grupos de factura persistidos para recepción. Almacén solo debe consultar; no debe asociar Guía o Nota de ingreso sin grupoFacturaId real.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
