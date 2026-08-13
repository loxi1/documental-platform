"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  ReceiptText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DocumentoPreviewModal } from "@/components/revision-contable/DocumentoPreviewModal";
import { ContabilidadDocumentoPrincipalOperativoCard } from "@/components/revision-contable/ContabilidadDocumentoPrincipalOperativoCard";
import { ContabilidadGrupoFacturaSoloLecturaPanel } from "@/components/revision-contable/ContabilidadGrupoFacturaSoloLecturaPanel";
import { getContexto } from "@/lib/auth-storage";
import {
  useExpediente,
  useExpedienteAlertas,
  useExpedienteDocumentos,
} from "@/hooks/useExpedientes";
import type { DocumentoAlerta } from "@/types/alerta";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

type Props = {
  expedienteId: string | number;
  anio?: string | null;
  mes?: string | null;
  facturaDocumentoId?: string | null;
};


function formatDateOnlyLocal(value: unknown) {
  if (!value) return "-";

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function asRecord<T extends object>(value: T | null | undefined) {
  return value as unknown as Record<string, unknown> | null | undefined;
}

function pickFromRecord(
  value: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown {
  if (!value) return undefined;

  for (const key of keys) {
    const current = value[key];
    if (current !== null && current !== undefined && current !== "") {
      return current;
    }
  }

  return undefined;
}

function pickDocumento(documento: ExpedienteDocumento | null | undefined, keys: string[]) {
  return pickFromRecord(asRecord(documento), keys);
}

function asText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: unknown) {
  return formatDateOnlyLocal(value);
}

function formatMoney(moneda: unknown, monto: unknown) {
  if (monto === null || monto === undefined || monto === "") return "-";

  const value = Number(monto);
  const monedaText = String(moneda ?? "").toUpperCase();

  if (Number.isNaN(value)) {
    return [asText(moneda, ""), String(monto)].filter(Boolean).join(" ") || "-";
  }

  if (monedaText.includes("DOLAR") || monedaText === "USD") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  if (monedaText.includes("SOL") || monedaText === "PEN") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  return [asText(moneda, ""), value.toFixed(2)].filter(Boolean).join(" ");
}

function normalizeArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.documentos)) return record.documentos as T[];
    if (Array.isArray(record.alertas)) return record.alertas as T[];
    if (Array.isArray(record.results)) return record.results as T[];
  }

  return [];
}

function documentoTipo(documento: ExpedienteDocumento) {
  return asText(pickDocumento(documento, ["tipoDocumental", "tipo_documental"]), "Documento");
}

function documentoRelacion(documento: ExpedienteDocumento) {
  return asText(pickDocumento(documento, ["tipoRelacion", "tipo_relacion"]), "-");
}

function documentoSerieNumero(documento: ExpedienteDocumento) {
  const serie = asText(pickDocumento(documento, ["serie"]), "");
  const numero = asText(pickDocumento(documento, ["numero"]), "");
  const label = [serie, numero].filter(Boolean).join("-").trim();
  return label || asText(pickDocumento(documento, ["numero"]), "Sin número");
}

function documentoFecha(documento: ExpedienteDocumento) {
  return formatDate(pickDocumento(documento, ["fechaEmision", "fecha_emision"]));
}

function documentoProveedor(documento: ExpedienteDocumento) {
  return asText(
    pickDocumento(documento, [
      "razonSocialEmisor",
      "razon_social_emisor",
      "proveedor",
      "razonSocial",
      "razon_social",
      "rucEmisor",
      "ruc_emisor",
    ]),
    "-",
  );
}

function documentoEstado(documento: ExpedienteDocumento) {
  return asText(pickDocumento(documento, ["estado"]), "-");
}

function documentoMonto(documento: ExpedienteDocumento) {
  return formatMoney(
    pickDocumento(documento, ["moneda"]),
    pickDocumento(documento, ["montoTotal", "monto_total"]),
  );
}

function isPrincipal(documento: ExpedienteDocumento) {
  const relacion = documentoRelacion(documento).toLowerCase();
  const esPrincipal = pickDocumento(documento, ["esPrincipal", "es_principal"]);

  return esPrincipal === true || relacion.startsWith("principal_");
}

function getExpedienteCodigo(expediente: Expediente | undefined) {
  return asText(
    expediente?.codigoExpediente ??
      expediente?.codigo_expediente ??
      expediente?.codigoCentroCosto ??
      expediente?.codigo_centro_costo ??
      expediente?.codigoOp ??
      expediente?.codigo_op,
    String(expediente?.id ?? "-"),
  );
}

function getExpedienteEmpresa(expediente: Expediente | undefined, fallback?: string | null) {
  return asText(expediente?.empresaCodigo ?? expediente?.empresa_codigo ?? fallback, "-");
}

function normalizeAlertas(value: unknown): DocumentoAlerta[] {
  return normalizeArray<DocumentoAlerta>(value);
}

function alertaEstado(alerta: DocumentoAlerta) {
  return asText(alerta.estado, "activa");
}

function alertaTipo(alerta: DocumentoAlerta) {
  return asText(alerta.tipoAlerta ?? alerta.tipo_alerta, "Alerta");
}

function alertaFecha(value: unknown) {
  return formatDate(value);
}

function buildBackHref(anio?: string | null, mes?: string | null) {
  const params = new URLSearchParams();

  if (anio) params.set("anio", anio);
  if (mes) params.set("mes", mes);

  const query = params.toString();
  return query ? `/revision-contable?${query}` : "/revision-contable";
}

function getFacturaAncla(documentos: ExpedienteDocumento[]) {
  return documentos.find(
    (documento) => documentoTipo(documento).toUpperCase() === "FACTURA",
  );
}

function DocumentoCard({
  documento,
  principal = false,
  compact = false,
  onVer,
}: {
  documento: ExpedienteDocumento;
  principal?: boolean;
  compact?: boolean;
  onVer: (documento: ExpedienteDocumento) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border bg-card p-4 shadow-sm">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={principal ? "secondary" : "outline"}>
            {principal ? "Principal legacy" : "Adjunto legacy"}
          </Badge>
          <Badge variant="outline">{documentoEstado(documento)}</Badge>
        </div>

        <div>
          <div className="line-clamp-2 font-semibold">
            {documentoTipo(documento)} {documentoSerieNumero(documento)}
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {documentoProveedor(documento)}
          </div>
        </div>

        <div className={compact ? "grid gap-1 text-xs text-muted-foreground" : "grid gap-1 text-sm text-muted-foreground"}>
          <span>Relación: {documentoRelacion(documento)}</span>
          <span>Fecha: {documentoFecha(documento)}</span>
          <span>Monto: {documentoMonto(documento)}</span>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-4 w-full"
        onClick={() => onVer(documento)}
      >
        <Eye className="mr-1 h-4 w-4" />
        Ver evidencia
      </Button>
    </div>
  );
}

function ExpedienteResumenCard({
  expediente,
  empresa,
  periodo,
  facturaAncla,
}: {
  expediente: Expediente;
  empresa?: string | null;
  periodo: string;
  facturaAncla: ExpedienteDocumento | undefined;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Detalles del contexto operativo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Empresa</div>
          <div className="font-semibold">{getExpedienteEmpresa(expediente, empresa)}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Contexto operativo / Centro de costo</div>
          <div className="font-semibold">{getExpedienteCodigo(expediente)}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Periodo contable</div>
          <div className="font-semibold">{periodo}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">Factura ancla</div>
          <div className="font-semibold">
            {facturaAncla
              ? `${asText(pickDocumento(facturaAncla, ["serie"]), "")} ${asText(
                  pickDocumento(facturaAncla, ["numero"]),
                  "",
                )}`.trim()
              : "-"}
          </div>
          <div className="text-xs text-muted-foreground">
            Fecha factura: {facturaAncla ? documentoFecha(facturaAncla) : "-"}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">Descripción</div>
          <div className="font-semibold">{asText(expediente.descripcion, "Sin descripción")}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertasExpediente({
  alertas,
  isLoading,
}: {
  alertas: DocumentoAlerta[];
  isLoading: boolean;
}) {
  return null;
}

export function RevisionContableDetalle({
  expedienteId,
  anio,
  mes,
  facturaDocumentoId,
}: Props) {
  const [documentoSeleccionado, setDocumentoSeleccionado] =
    useState<ExpedienteDocumento | null>(null);
  const contexto = getContexto();
  const workspaceEmpresa = asText(contexto?.empresa, "-");

  const expedienteQuery = useExpediente(expedienteId);
  const documentosQuery = useExpedienteDocumentos(expedienteId);
  const alertasQuery = useExpedienteAlertas(expedienteId);

  const expediente = expedienteQuery.data;
  const documentos = useMemo(() => {
    const desdeEndpoint = normalizeArray<ExpedienteDocumento>(documentosQuery.data);

    if (desdeEndpoint.length) {
      return desdeEndpoint;
    }

    return normalizeArray<ExpedienteDocumento>(
      (expediente as unknown as Record<string, unknown> | undefined)?.documentos,
    );
  }, [documentosQuery.data, expediente]);
  const alertas = useMemo(
    () => normalizeAlertas(alertasQuery.data),
    [alertasQuery.data],
  );

  const principal = useMemo(
    () => documentos.find((documento) => isPrincipal(documento)) ?? null,
    [documentos],
  );
  const adjuntos = useMemo(
    () => documentos.filter((documento) => !isPrincipal(documento)),
    [documentos],
  );
  const facturaAncla = useMemo(() => getFacturaAncla(documentos), [documentos]);
  const backHref = buildBackHref(anio, mes);
  const periodo = useMemo(() => {
    const fechaFactura = facturaAncla
      ? pickDocumento(facturaAncla, ["fechaEmision", "fecha_emision"])
      : null;

    const fechaTexto = fechaFactura ? String(fechaFactura).trim() : "";
    const fechaSolo = fechaTexto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (fechaSolo) {
      const [, year, month] = fechaSolo;
      return `${year}-${month}`;
    }

    return anio && mes ? `${anio}-${String(mes).padStart(2, "0")}` : "-";
  }, [anio, mes, facturaAncla]);

  if (expedienteQuery.isLoading || (documentosQuery.isLoading && !expediente)) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando revisión documental...</div>;
  }

  if (expedienteQuery.error || !expediente) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a Revisión Documental
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-red-600">
            No se pudo cargar el contexto operativo para revisión documental.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Revisión contable</h1>
            <Badge variant="secondary">Solo lectura</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {getExpedienteCodigo(expediente)} · {getExpedienteEmpresa(expediente, workspaceEmpresa)} · {periodo}
          </p>
          <p className="text-sm text-muted-foreground">
            {asText(expediente.descripcion, "Sin descripción")}
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-3">
          <Link href={backHref}>Volver</Link>
        </Button>
      </div>

      <section>
        <ContabilidadDocumentoPrincipalOperativoCard
          id={expedienteId}
          onVer={(documentoId) => {
            const documentoPrincipal = documentos.find(
              (documento) =>
                String(
                  pickDocumento(documento, ["documentoId", "documento_id", "id"]) ?? "",
                ) === String(documentoId),
            );

            if (documentoPrincipal) {
              setDocumentoSeleccionado(documentoPrincipal);
            }
          }}
        />
      </section>

      <section>
        <ContabilidadGrupoFacturaSoloLecturaPanel
          id={expedienteId}
          facturaDocumentoId={facturaDocumentoId}
          documentos={
            documentos as unknown as Array<Record<string, unknown>>
          }
          onVer={(documentoId) => {
            const documento = documentos.find(
              (item) =>
                String(
                  pickDocumento(item, ["documentoId", "documento_id", "id"]) ?? "",
                ) === String(documentoId),
            );

            if (documento) {
              setDocumentoSeleccionado(documento);
            }
          }}
        />
      </section>

      <div className="hidden" aria-hidden="true">
        Vista técnica auxiliar.
      </div>

      <section className="hidden" aria-hidden="true">
        <Card className="h-full">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Documento principal legacy / diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {principal ? (
              <DocumentoCard documento={principal} principal onVer={setDocumentoSeleccionado} />
            ) : (
              <Empty className="py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin documento principal</EmptyTitle>
                  <EmptyDescription>
                    No se encontró OC, OS o factura directa marcada como principal.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <ExpedienteResumenCard
          expediente={expediente}
          empresa={workspaceEmpresa}
          periodo={periodo}
          facturaAncla={facturaAncla}
        />
      </section>

      <Card className="hidden" aria-hidden="true">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Información técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {adjuntos.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {adjuntos.map((documento, index) => (
                <DocumentoCard
                  key={asText(pickDocumento(documento, ["documentoId", "documento_id"]), String(index))}
                  documento={documento}
                  compact
                  onVer={setDocumentoSeleccionado}
                />
              ))}
            </div>
          ) : (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Sin documentos adjuntos</EmptyTitle>
                <EmptyDescription>
                  No se encontraron documentos adjuntos para este contexto operativo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <AlertasExpediente alertas={alertas} isLoading={alertasQuery.isLoading} />

      <DocumentoPreviewModal
        documento={documentoSeleccionado}
        open={Boolean(documentoSeleccionado)}
        onClose={() => setDocumentoSeleccionado(null)}
      />
    </main>
  );
}
