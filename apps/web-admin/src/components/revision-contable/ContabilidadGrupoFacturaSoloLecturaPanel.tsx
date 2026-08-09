"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Link2, ReceiptText } from "lucide-react";

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

function msiiRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function msiiText(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized && normalized !== "null" && normalized !== "undefined"
    ? normalized
    : "";
}

function msiiTipoOperativo(value: unknown) {
  return msiiText(value)
    .replace(/^PRINCIPAL_/i, "")
    .replace(/^ADJUNTO_/i, "")
    .replaceAll("_", " ")
    .trim()
    .toUpperCase();
}

function msiiRecordId(value: unknown) {
  const record = msiiRecord(value);
  if (!record) return "";

  return (
    msiiText(record.id) ||
    msiiText(record.documentoId) ||
    msiiText(record.documento_id)
  );
}

function msiiDocumentoLabel(source: unknown, fallback: string) {
  const record = msiiRecord(source);
  if (!record) return fallback;

  const tipo = msiiTipoOperativo(
    record.tipoDocumental ??
      record.tipo_documental ??
      record.tipo ??
      record.tipoDocumento ??
      record.tipo_documento,
  );
  const serie = msiiText(
    record.serie ?? record.serieDocumento ?? record.serie_documento,
  );
  const numero = msiiText(
    record.numero ?? record.numeroDocumento ?? record.numero_documento,
  );
  const numeroCompleto = [serie, numero].filter(Boolean).join("-");

  if (tipo && numeroCompleto) return `${tipo} ${numeroCompleto}`;
  if (numeroCompleto) return numeroCompleto;
  return fallback;
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

  if (msiiRecordId(record) == expected) return record;

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
  if (!principal) return `OC/OS documento ${documentoId}`;

  return msiiDocumentoLabel(principal, `OC/OS documento ${documentoId}`);
}

function EstadoContableBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className={active ? "gap-1" : "gap-1 text-muted-foreground"}>
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function GrupoRevisionCard({
  workspace,
  grupo,
  expedienteId,
}: {
  workspace: unknown;
  grupo: WorkspaceV2GrupoFactura;
  expedienteId: string | number;
}) {
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const principalOperativo = msiiPrincipalGrupoLabel(workspace, principalDocumentoId);
  const guia = hasAdjunto(grupo, ["GUIA_REMISION", "GUIA", "GUÍA", "ADJUNTO_GUIA"]);
  const notaIngreso = hasAdjunto(grupo, ["NOTA_INGRESO", "NOTA INGRESO", "ADJUNTO_NOTA_INGRESO"]);
  const transferencia = hasAdjunto(grupo, ["TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA", "PAGO_TRANSFERENCIA"]);
  const detraccion = hasAdjunto(grupo, ["DETRACCION", "DETRACCIÓN", "ADJUNTO_DETRACCION", "PAGO_DETRACCION"]);
  const recepcionConEvidencia = guia || notaIngreso;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{getGrupoFacturaLabel(grupo)}</h3>
            <Badge variant="secondary">Grupo documental persistido</Badge>
            <Badge variant="outline">Solo lectura</Badge>
            <Badge variant="outline">OC / OS: {principalOperativo}</Badge>
            <span className="sr-only">
              grupoFacturaId {String(grupoFacturaId ?? "")} · principalDocumentoId {String(principalDocumentoId ?? "")} · facturaDocumentoId {String(facturaDocumentoId ?? "")}
            </span>
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
            <Badge variant="outline">
              Estado documental {textValue(entityVista<Record<string, unknown>>(grupo).estadoRevisionLabel ?? entityVista<Record<string, unknown>>(grupo).estado_revision_label ?? entityVista<Record<string, unknown>>(grupo).estado, "Sin estado")}
            </Badge>
            <Badge variant="outline">Grupo persistido</Badge>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap gap-2">
              <EstadoContableBadge label="Factura" active />
              <EstadoContableBadge label="Recepción" active={recepcionConEvidencia} />
              <EstadoContableBadge label="Transferencia" active={transferencia} />
              <EstadoContableBadge label="Detracción" active={detraccion} />
            </div>
            {!recepcionConEvidencia ? (
              <p className="text-xs text-muted-foreground">
                Recepción sin evidencia asociada en el grupo. Contabilidad no infiere recepción completa solo por existir factura o grupo persistido.
              </p>
            ) : null}
            {!transferencia && !detraccion ? (
              <p className="text-xs text-muted-foreground">
                Documentos de pago sin evidencia asociada. Contabilidad no interpreta archivo adjunto como pago conciliado.
              </p>
            ) : null}
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/workspace/expedientes-v1/${expedienteId}`}>
            <Link2 className="h-4 w-4" />
            Ver Workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ContabilidadGrupoFacturaSoloLecturaPanel({
  id,
  facturaDocumentoId,
}: {
  id: string | number;
  facturaDocumentoId?: string | null;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["contabilidad-v2-grupos-revision", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Facturas documentales para revisión contable</CardTitle>
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
          <CardTitle>Facturas documentales para revisión contable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar el Workspace V2. Contabilidad mantiene esta vista en solo lectura y no debe inferir relaciones desde legacy.
          </div>
        </CardContent>
      </Card>
    );
  }

  const workspace = workspaceQuery.data;
  const gruposPersistidos = getGruposFactura(workspace).filter((grupo) =>
    Boolean(getGrupoFacturaPersistidoId(grupo)),
  );
  const grupoSeleccionado = facturaDocumentoId
    ? gruposPersistidos.find(
        (grupo) =>
          String(getGrupoFacturaDocumentoId(grupo) ?? "") ===
          String(facturaDocumentoId),
      ) ?? null
    : null;
  const gruposVisibles = facturaDocumentoId
    ? grupoSeleccionado
      ? [grupoSeleccionado]
      : []
    : gruposPersistidos;
  const grupoSolicitadoNoLocalizado =
    Boolean(facturaDocumentoId) && !grupoSeleccionado;
  const contexto = getContexto(workspace);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Facturas documentales para revisión contable</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista de solo lectura por factura sobre el núcleo documental V2. No permite adjuntar, asociar, anular ni corregir documentos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getContextoEmpresaCodigo(contexto) || "Empresa"}</Badge>
            <Badge variant="outline">{gruposVisibles.length} grupo(s) en vista</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {grupoSolicitadoNoLocalizado ? (
          <div className="rounded-xl border border-dashed p-4 text-sm">
            <p className="font-medium">
              No se pudo localizar el grupo documental de esta factura.
            </p>
            <p className="mt-1 text-muted-foreground">
              Vuelve a la bandeja o usa “Ver Workspace” para revisar el expediente completo.
            </p>
          </div>
        ) : gruposVisibles.length ? (
          gruposVisibles.map((grupo, index) => (
            <GrupoRevisionCard
              key={String(getGrupoFacturaPersistidoId(grupo) ?? index)}
              workspace={workspace}
              grupo={grupo}
              expedienteId={id}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay facturas con grupo persistido para revisión contable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
