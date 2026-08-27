"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FileCheck2 } from "lucide-react";

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


function msiiRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function msiiText(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized && normalized !== "null" && normalized !== "undefined" ? normalized : "";
}

function msiiTipoOperativo(value: unknown) {
  return msiiText(value)
    .replace(/^PRINCIPAL_/i, "")
    .replace(/^ADJUNTO_/i, "")
    .replaceAll("_", " ")
    .toUpperCase();
}

function msiiDeepValue(
  source: unknown,
  keys: string[],
  seen = new Set<object>(),
): string {
  if (!source || typeof source !== "object") return "";

  const objectSource = source as object;
  if (seen.has(objectSource)) return "";
  seen.add(objectSource);

  if (Array.isArray(source)) {
    for (const item of source) {
      const value = msiiDeepValue(item, keys, seen);
      if (value) return value;
    }
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = msiiText(record[key]);
    if (value) return value;
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") continue;
    const nested = msiiDeepValue(value, keys, seen);
    if (nested) return nested;
  }

  return "";
}

function msiiTipoPresentacion(value: unknown) {
  const tipo = msiiTipoOperativo(value);

  if (tipo === "ORDEN DE SERVICIO" || tipo === "OS") return "OS";
  if (tipo === "ORDEN DE COMPRA" || tipo === "OC") return "OC";
  if (tipo === "FACTURA") return "Factura";

  return tipo;
}

function msiiDocumentoLabel(record: Record<string, unknown> | null, fallback: string) {
  if (!record) return fallback;

  const tipo = msiiTipoPresentacion(
    msiiDeepValue(record, [
      "tipoDocumental",
      "tipo_documental",
      "tipoDocumento",
      "tipo_documento",
      "tipoRelacion",
      "tipo_relacion",
    ]),
  );

  const serie = msiiDeepValue(record, [
    "serie",
    "serieDocumento",
    "serie_documento",
  ]);

  const numero = msiiDeepValue(record, [
    "numero",
    "numeroDocumento",
    "numero_documento",
  ]);

  if (!tipo && !serie && !numero) return fallback;

  const correlativo = [serie, numero].filter(Boolean).join("-");
  return [tipo || fallback, correlativo].filter(Boolean).join(" ");
}



function msiiRecordId(value: unknown) {
  const record = msiiRecord(value);
  if (!record) return "";

  return (
    msiiText(record.id) ||
    msiiText(record.documentoId) ||
    msiiText(record.documento_id) ||
    msiiText(record.documentoPrincipalId) ||
    msiiText(record.documento_principal_id)
  );
}

function msiiFindRecordById(source: unknown, targetId: unknown): Record<string, unknown> | null {
  const expected = msiiText(targetId);
  if (!expected) return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = msiiFindRecordById(item, expected);
      if (found) return found;
    }
    return null;
  }

  const record = msiiRecord(source);
  if (!record) return null;

  if (msiiRecordId(record) === expected) return record;

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") continue;
    const found = msiiFindRecordById(value, expected);
    if (found) return found;
  }

  return null;
}

function msiiPrincipalGrupoLabel(source: unknown, documentoBaseId: unknown) {
  const documentoId = msiiText(documentoBaseId);
  const principal = msiiFindRecordById(source, documentoId);

  if (!documentoId) return "OC/OS asociado";
  if (!principal) return "OC/OS asociado";

  return msiiDocumentoLabel(principal, "OC/OS asociado");
}

function msiiFacturaGrupoLabel(source: unknown, facturaDocumentoId: unknown, fallback: string) {
  const facturaId = msiiText(facturaDocumentoId);
  const factura = msiiFindRecordById(source, facturaId);

  if (!facturaId) return fallback;
  if (!factura) return fallback;

  return msiiDocumentoLabel(factura, fallback);
}

export function AlmacenGrupoFacturaOperativoPanel({
  expedienteId,
  grupoFacturaId = null,
  modo = "ver",
}: {
  expedienteId: string | number;
  grupoFacturaId?: string | number | null;
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

  const grupoSolicitado =
    grupoFacturaId === null || grupoFacturaId === undefined
      ? null
      : String(grupoFacturaId);

  const gruposVisibles = useMemo(
    () =>
      grupoSolicitado
        ? gruposPersistidos.filter(
            (grupo) =>
              String(getGrupoFacturaPersistidoId(grupo) ?? "") ===
              grupoSolicitado,
          )
        : gruposPersistidos,
    [grupoSolicitado, gruposPersistidos],
  );

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Recepción documentaria</CardTitle>
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
          <CardTitle>Recepción documentaria</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No se pudo consultar la trazabilidad documental. Vuelva a intentar antes de adjuntar Guía o Nota de ingreso.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recepción documentaria</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta OC/OS y factura para adjuntar Guía o Nota de ingreso.
            </p>
          </div>
          <Badge variant="outline">
            {getContextoEmpresaCodigo(contexto) || "Empresa"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {grupoSolicitado && !gruposVisibles.length ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo resolver la factura solicitada. No se mostrarán otros
            grupos del expediente.
          </div>
        ) : gruposVisibles.length ? (
          gruposVisibles.map((grupo, index) => {
            const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
            const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo) ?? getGrupoFacturaId(grupo);
            const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
            const estadoPersistencia = entityPersistencia(grupo) ?? "persistido";
            const principalOperativo = msiiPrincipalGrupoLabel(workspace, principalDocumentoId);
            const facturaOperativa = msiiFacturaGrupoLabel(workspace, facturaDocumentoId, getGrupoFacturaLabel(grupo));

            return (
              <div key={String(grupoFacturaId ?? index)} className="rounded-xl border bg-muted/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{facturaOperativa}</h3>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="block text-xs font-medium uppercase">OC / OS</span>
                        <span className="text-foreground">{principalOperativo}</span>
                      </div>
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
                    </div>

                    <span className="sr-only">
                      grupoFacturaId {String(grupoFacturaId)} · principal {textValue(principalDocumentoId, "—")} · factura {textValue(facturaDocumentoId, "—")} · estado {getEstado(grupo)} · persistencia {estadoPersistencia}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {modo === "ver" ? (
                      <Button asChild size="sm">
                        <Link
                          href={`/almacen/${expedienteId}/editar?grupoFacturaId=${String(
                            grupoFacturaId,
                          )}#adjuntar-guia-ni`}
                        >
                          <FileCheck2 className="h-4 w-4" />
                          Adjuntar Guía / NI
                        </Link>
                      </Button>
                    ) : modo === "editar" && !grupoSolicitado ? (
                      <Button asChild size="sm">
                        <Link
                          href={`/almacen/${expedienteId}/editar?grupoFacturaId=${String(
                            grupoFacturaId,
                          )}#adjuntar-guia-ni`}
                        >
                          <FileCheck2 className="h-4 w-4" />
                          Gestionar recepción
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay facturas listas para recepción. Almacén puede consultar el contexto, pero todavía no debe adjuntar Guía o Nota de ingreso.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
