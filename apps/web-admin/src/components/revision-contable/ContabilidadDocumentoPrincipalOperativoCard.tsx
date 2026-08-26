"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, FileText } from "lucide-react";

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
  getGruposFactura,
  getGrupoFacturaDocumentoId,
  getGrupoDocumentoPrincipalDocumentoId,
} from "@/components/documental-v2/workspace-v2-utils";


function contabilidadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function contabilidadMetadata(value: unknown): Record<string, unknown> {
  const record = contabilidadRecord(value);
  const metadata = record.metadata;

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

function pickPersistedDocumentoValue(
  documento: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown {
  if (!documento) return undefined;

  const metadata = contabilidadMetadata(documento);

  for (const key of keys) {
    const direct = documento[key];
    if (direct !== null && direct !== undefined && direct !== "") return direct;

    const nested = metadata[key];
    if (nested !== null && nested !== undefined && nested !== "") return nested;
  }

  return undefined;
}

function persistedText(value: unknown, fallback = "No informado") {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }

  return String(value).trim();
}

function persistedDocumentoId(
  documento: Record<string, unknown> | null | undefined,
) {
  return pickPersistedDocumentoValue(documento, [
    "documentoId",
    "documento_id",
    "id",
  ]);
}

function persistedDocumentoTipo(
  documento: Record<string, unknown> | null | undefined,
) {
  return persistedText(
    pickPersistedDocumentoValue(documento, [
      "tipoDocumental",
      "tipo_documental",
    ]),
    "Documento",
  );
}

function persistedDocumentoLabel(
  documento: Record<string, unknown> | null | undefined,
) {
  const tipo = persistedDocumentoTipo(documento);
  const serie = persistedText(
    pickPersistedDocumentoValue(documento, ["serie"]),
    "",
  );
  const numero = persistedText(
    pickPersistedDocumentoValue(documento, ["numero"]),
    "",
  );
  const identificador = [serie, numero].filter(Boolean).join(" ").trim();

  return identificador ? `${tipo} ${identificador}` : tipo;
}

function persistedProveedor(
  documento: Record<string, unknown> | null | undefined,
) {
  return persistedText(
    pickPersistedDocumentoValue(documento, [
      "razonSocialEmisor",
      "razon_social_emisor",
      "proveedor",
      "razonSocial",
      "razon_social",
    ]),
  );
}

function persistedRuc(
  documento: Record<string, unknown> | null | undefined,
) {
  return persistedText(
    pickPersistedDocumentoValue(documento, [
      "rucEmisor",
      "ruc_emisor",
      "rucProveedor",
      "ruc_proveedor",
    ]),
  );
}

function persistedFecha(
  documento: Record<string, unknown> | null | undefined,
) {
  const raw = pickPersistedDocumentoValue(documento, [
    "fechaEmision",
    "fecha_emision",
  ]);

  if (!raw) return "No informado";

  const text = String(raw).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function persistedMonto(
  documento: Record<string, unknown> | null | undefined,
) {
  const rawMonto = pickPersistedDocumentoValue(documento, [
    "montoTotal",
    "monto_total",
  ]);
  const moneda = persistedText(
    pickPersistedDocumentoValue(documento, ["moneda"]),
    "",
  ).toUpperCase();

  if (rawMonto === null || rawMonto === undefined || rawMonto === "") {
    return "No informado";
  }

  const monto = Number(rawMonto);
  if (Number.isNaN(monto)) {
    return [moneda, String(rawMonto)].filter(Boolean).join(" ");
  }

  if (moneda === "USD" || moneda.includes("DOLAR")) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(monto);
  }

  if (moneda === "PEN" || moneda.includes("SOL")) {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(monto);
  }

  return [moneda, monto.toFixed(2)].filter(Boolean).join(" ");
}

export function ContabilidadDocumentoPrincipalOperativoCard({
  id,
  facturaDocumentoId,
  documentos,
  onVer,
}: {
  id: string | number;
  facturaDocumentoId?: string | number | null;
  documentos?: Array<Record<string, unknown>>;
  onVer?: (documentoId: string | number) => void;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["contabilidad-v2-principal", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card>
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Documento principal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar el documento principal desde Workspace.
          </div>
        </CardContent>
      </Card>
    );
  }

  const gruposFactura = getGruposFactura(workspaceQuery.data);
  const grupoFacturaSeleccionado =
    facturaDocumentoId !== null && facturaDocumentoId !== undefined && String(facturaDocumentoId).trim()
      ? gruposFactura.find(
          (grupo) =>
            String(getGrupoFacturaDocumentoId(grupo) ?? "") ===
            String(facturaDocumentoId),
        ) ?? null
      : null;

  const principalRamaDocumentoId = grupoFacturaSeleccionado
    ? getGrupoDocumentoPrincipalDocumentoId(grupoFacturaSeleccionado)
    : null;

  const principalDesdeRama =
    principalRamaDocumentoId !== null && principalRamaDocumentoId !== undefined
      ? (documentos ?? []).find(
          (documento) =>
            String(persistedDocumentoId(documento) ?? "") ===
            String(principalRamaDocumentoId),
        ) ?? null
      : null;

  const usaPrincipalPersistido =
    facturaDocumentoId !== null &&
    facturaDocumentoId !== undefined &&
    Boolean(String(facturaDocumentoId).trim());

  // Con factura seleccionada: principal exacto de la rama y shape ExpedienteDocumento.
  // Sin factura seleccionada: conservar el principal Workspace histórico y sus helpers originales.
  const principal = usaPrincipalPersistido
    ? principalDesdeRama
    : getDocumentoPrincipal(workspaceQuery.data);

  const documentoId = principal
    ? String(
        usaPrincipalPersistido
          ? persistedDocumentoId(principal as Record<string, unknown>)
          : getDocumentoId(principal),
      ).trim()
    : "";

  const principalLabel = principal
    ? usaPrincipalPersistido
      ? persistedDocumentoLabel(principal as Record<string, unknown>)
      : documentoLabel(principal)
    : "";

  const principalTipo = principal
    ? usaPrincipalPersistido
      ? persistedDocumentoTipo(principal as Record<string, unknown>)
      : getDocumentoTipo(principal)
    : "Documento";

  const principalProveedor = principal
    ? usaPrincipalPersistido
      ? persistedProveedor(principal as Record<string, unknown>)
      : getProveedor(principal)
    : "No informado";

  const principalRuc = principal
    ? usaPrincipalPersistido
      ? persistedRuc(principal as Record<string, unknown>)
      : getRucProveedor(principal)
    : "No informado";

  const principalFecha = principal
    ? usaPrincipalPersistido
      ? persistedFecha(principal as Record<string, unknown>)
      : getFechaDocumento(principal)
    : "No informado";

  const principalMonto = principal
    ? usaPrincipalPersistido
      ? persistedMonto(principal as Record<string, unknown>)
      : getMontoDocumento(principal)
    : "No informado";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Documento principal</CardTitle>
      </CardHeader>
      <CardContent>
        {principal ? (
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-lg font-semibold">{principalLabel}</div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{principalTipo}</Badge>
                    {onVer && documentoId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => onVer(documentoId)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Ver
                      </Button>
                    ) : null}
                  </div>
                </div>

                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)]">
                  <div className="min-w-0">
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
                    <dd className="mt-1 font-medium">{principalProveedor}</dd>
                    <dd className="text-xs text-muted-foreground">RUC {principalRuc}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
                    <dd className="mt-1 font-medium">{principalFecha}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Monto</dt>
                    <dd className="mt-1 font-medium">{principalMonto}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se encontró un documento principal para este contexto.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
