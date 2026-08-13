"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Link2, ReceiptText } from "lucide-react";

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

function findAdjunto(grupo: WorkspaceV2GrupoFactura, aliases: string[]) {
  const normalized = aliases.map((alias) => alias.toUpperCase());

  return (
    getAdjuntosGrupo(grupo).find((documento: WorkspaceV2Documento) => {
      const vista = entityVista<Record<string, unknown>>(documento);
      const tipo = String(
        vista.tipoDocumental ?? vista.tipo_documental ?? "",
      ).toUpperCase();
      const relacion = String(
        vista.tipoRelacion ?? vista.tipo_relacion ?? "",
      ).toUpperCase();

      return normalized.some(
        (alias) => tipo.includes(alias) || relacion.includes(alias),
      );
    }) ?? null
  );
}

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

function msiiPersistedMetadata(
  documento: Record<string, unknown> | null,
) {
  if (!documento) return null;

  const metadata = msiiRecord(documento.metadata);
  const ocr = msiiRecord(metadata?.ocr);
  const ocrMetadata = msiiRecord(ocr?.metadata);

  return ocrMetadata ?? metadata;
}

function msiiPersistedGrupoFacturaId(
  documento: Record<string, unknown>,
) {
  const metadata = msiiPersistedMetadata(documento);

  return msiiText(
    documento.grupoFacturaId ??
      documento.grupo_factura_id ??
      metadata?.grupoFacturaId ??
      metadata?.grupo_factura_id,
  );
}

function msiiMatchesAlias(
  documento: Record<string, unknown>,
  aliases: string[],
) {
  const normalized = aliases.map((alias) => alias.toUpperCase());
  const metadata = msiiPersistedMetadata(documento);

  const tipo = msiiTipoOperativo(
    documento.tipoDocumental ??
      documento.tipo_documental ??
      metadata?.tipoDocumental ??
      metadata?.tipo_documental,
  );

  const relacion = msiiTipoOperativo(
    documento.tipoRelacion ??
      documento.tipo_relacion ??
      metadata?.tipoRelacion ??
      metadata?.tipo_relacion,
  );

  return normalized.some(
    (alias) =>
      tipo.includes(alias.toUpperCase()) ||
      relacion.includes(alias.toUpperCase()),
  );
}

function msiiResolvePersistedDocument({
  workspaceDocumento,
  aliases,
  grupoFacturaId,
  documentos,
}: {
  workspaceDocumento: WorkspaceV2Documento | null;
  aliases: string[];
  grupoFacturaId: unknown;
  documentos: Array<Record<string, unknown>>;
}) {
  const workspaceVista = workspaceDocumento
    ? entityVista<Record<string, unknown>>(workspaceDocumento)
    : null;

  const workspaceId = msiiText(
    workspaceVista?.documentoId ??
      workspaceVista?.documento_id ??
      workspaceVista?.id ??
      msiiRecordId(workspaceDocumento),
  );

  // Regla contractual UX:
  // si Workspace entrega documentoId explícito, esa identidad manda.
  // No degradar a búsqueda por tipo documental.
  if (workspaceId) {
    return (
      documentos.find((documento) => {
        const persistedId = msiiText(
          documento.documentoId ??
            documento.documento_id ??
            documento.id ??
            msiiRecordId(documento),
        );

        return persistedId === workspaceId;
      }) ?? null
    );
  }

  // Fallback únicamente para payloads antiguos que realmente no traen ID.
  const candidatos = documentos.filter((documento) =>
    msiiMatchesAlias(documento, aliases),
  );

  const grupoId = msiiText(grupoFacturaId);

  if (grupoId) {
    const porGrupo = candidatos.filter(
      (documento) =>
        msiiPersistedGrupoFacturaId(documento) === grupoId,
    );

    if (porGrupo.length === 1) return porGrupo[0];
  }

  return candidatos.length === 1 ? candidatos[0] : null;
}

function msiiFormatDate(value: unknown) {
  const text = msiiText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return text;

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function msiiFormatMoney(
  monedaValue: unknown,
  montoValue: unknown,
) {
  const rawMonto = msiiText(montoValue);
  if (!rawMonto) return "";

  const monto = Number(rawMonto.replace(/,/g, ""));
  if (!Number.isFinite(monto)) return rawMonto;

  const moneda = msiiText(monedaValue).toUpperCase();
  const currency =
    moneda === "USD" || moneda.includes("DOLAR") ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(monto);
}

function DocumentoAsociadoFila({
  label,
  documento,
  documentoPersistido,
  onVer,
}: {
  label: string;
  documento: WorkspaceV2Documento | null;
  documentoPersistido?: Record<string, unknown> | null;
  onVer?: (documentoId: string | number) => void;
}) {
  if (!documento && !documentoPersistido) {
    return (
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  const source = documentoPersistido ?? documento;
  const documentoId =
    msiiRecordId(documentoPersistido) || msiiRecordId(documento);
  const documentoLabel = msiiDocumentoLabel(source, label);
  const metadata = msiiPersistedMetadata(documentoPersistido ?? null);

  const numeroOperacion = msiiText(
    metadata?.numeroOperacion ??
      metadata?.numeroConstancia ??
      metadata?.numero ??
      documentoPersistido?.numero,
  );

  const banco = msiiText(metadata?.banco);

  const fecha = msiiFormatDate(
    metadata?.fechaPago ??
      metadata?.fechaEmision ??
      documentoPersistido?.fecha_emision ??
      documentoPersistido?.fechaEmision,
  );

  const monto = msiiFormatMoney(
    metadata?.moneda ?? documentoPersistido?.moneda,
    metadata?.montoTotal ??
      documentoPersistido?.monto_total ??
      documentoPersistido?.montoTotal,
  );

  const titulo =
    label.toUpperCase() === "TRANSFERENCIA" && numeroOperacion
      ? `Transferencia ${numeroOperacion}`
      : documentoLabel;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{titulo}</span>

        {onVer && documentoId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5"
            onClick={() => onVer(documentoId)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Ver
          </Button>
        ) : null}
      </div>

      {banco ? (
        <div className="text-xs text-muted-foreground">
          {banco}
        </div>
      ) : null}

      {fecha || monto ? (
        <div className="text-xs text-muted-foreground">
          {[fecha, monto].filter(Boolean).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}


function GrupoRevisionCard({
  workspace,
  grupo,
  expedienteId,
  documentos,
  onVer,
}: {
  workspace: unknown;
  grupo: WorkspaceV2GrupoFactura;
  expedienteId: string | number;
  documentos: Array<Record<string, unknown>>;
  onVer?: (documentoId: string | number) => void;
}) {
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const principalOperativo = msiiPrincipalGrupoLabel(workspace, principalDocumentoId);
  const facturaDocumento = msiiFindRecordById(workspace, facturaDocumentoId);
  const guiaDocumento = findAdjunto(grupo, ["GUIA_REMISION", "GUIA", "GUÍA", "ADJUNTO_GUIA"]);
  const notaIngresoDocumento = findAdjunto(grupo, ["NOTA_INGRESO", "NOTA INGRESO", "ADJUNTO_NOTA_INGRESO"]);
  const transferenciaDocumento = findAdjunto(grupo, ["TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA", "PAGO_TRANSFERENCIA"]);
  const detraccionDocumento = findAdjunto(grupo, ["DETRACCION", "DETRACCIÓN", "ADJUNTO_DETRACCION", "PAGO_DETRACCION"]);

  const guiaPersistida = msiiResolvePersistedDocument({
    workspaceDocumento: guiaDocumento,
    aliases: ["GUIA_REMISION", "GUIA", "GUÍA", "ADJUNTO_GUIA"],
    grupoFacturaId,
    documentos,
  });

  const notaIngresoPersistida = msiiResolvePersistedDocument({
    workspaceDocumento: notaIngresoDocumento,
    aliases: ["NOTA_INGRESO", "NOTA INGRESO", "ADJUNTO_NOTA_INGRESO"],
    grupoFacturaId,
    documentos,
  });

  const transferenciaPersistida = msiiResolvePersistedDocument({
    workspaceDocumento: transferenciaDocumento,
    aliases: ["TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA", "PAGO_TRANSFERENCIA"],
    grupoFacturaId,
    documentos,
  });

  const detraccionPersistida = msiiResolvePersistedDocument({
    workspaceDocumento: detraccionDocumento,
    aliases: ["DETRACCION", "DETRACCIÓN", "ADJUNTO_DETRACCION", "PAGO_DETRACCION"],
    grupoFacturaId,
    documentos,
  });

  return (
    <div className="rounded-xl border p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Factura en revisión
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">{getGrupoFacturaLabel(grupo)}</h3>
              <Badge variant="outline">OC/OS: {principalOperativo}</Badge>
              {onVer && facturaDocumentoId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => onVer(facturaDocumentoId)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Ver
                </Button>
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Estado</span>
          <Badge variant="outline">
            {textValue(
              entityVista<Record<string, unknown>>(grupo).estadoRevisionLabel ??
                entityVista<Record<string, unknown>>(grupo).estado_revision_label ??
                entityVista<Record<string, unknown>>(grupo).estado,
              "Sin estado",
            )}
          </Badge>
          <Badge variant="secondary">Solo lectura</Badge>
        </div>

        <div className="border-t pt-4">
          <div className="mb-3 text-sm font-semibold">Documentos asociados</div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Recepción</div>
              <div className="mt-2 space-y-2 text-sm">
                <DocumentoAsociadoFila
                  label="Guía"
                  documento={guiaDocumento}
                  documentoPersistido={guiaPersistida}
                  onVer={onVer}
                />
                <DocumentoAsociadoFila
                  label="Nota de ingreso"
                  documento={notaIngresoDocumento}
                  documentoPersistido={notaIngresoPersistida}
                  onVer={onVer}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Pago</div>
              <div className="mt-2 text-sm">
                <DocumentoAsociadoFila
                  label="Transferencia"
                  documento={transferenciaDocumento}
                  documentoPersistido={transferenciaPersistida}
                  onVer={onVer}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Detracción</div>
              <div className="mt-2 text-sm">
                <DocumentoAsociadoFila
                  label="Detracción"
                  documento={detraccionDocumento}
                  documentoPersistido={detraccionPersistida}
                  onVer={onVer}
                />
              </div>
            </div>
          </div>
        </div>

        <span className="sr-only">
          grupoFacturaId {String(grupoFacturaId ?? "")} · principalDocumentoId {String(principalDocumentoId ?? "")} · facturaDocumentoId {String(facturaDocumentoId ?? "")}
        </span>
      </div>
    </div>
  );
}

export function ContabilidadGrupoFacturaSoloLecturaPanel({
  id,
  facturaDocumentoId,
  documentos = [],
  onVer,
}: {
  id: string | number;
  facturaDocumentoId?: string | null;
  documentos?: Array<Record<string, unknown>>;
  onVer?: (documentoId: string | number) => void;
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
          <CardTitle>Facturas en revisión</CardTitle>
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
          <CardTitle>Facturas en revisión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar la información documental para revisión contable.
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
            <CardTitle>Facturas en revisión</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista de solo lectura por factura y sus documentos asociados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getContextoEmpresaCodigo(contexto) || "Empresa"}</Badge>
            <Badge variant="outline">{gruposVisibles.length} factura(s) en vista</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {grupoSolicitadoNoLocalizado ? (
          <div className="rounded-xl border border-dashed p-4 text-sm">
            <p className="font-medium">
              No se pudo localizar la factura solicitada.
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
              documentos={documentos}
              onVer={onVer}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay facturas disponibles para revisión contable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
