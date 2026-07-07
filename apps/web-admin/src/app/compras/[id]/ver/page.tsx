"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, Loader2, TriangleAlert } from "lucide-react";

import { DocumentoPreviewModal } from "@/components/revision-contable/DocumentoPreviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  getExpedienteAlertas,
  getExpedienteDocumentos,
  getExpedienteResumen,
} from "@/services/expedientes";
import {
  getDocumentoArchivos,
  type DocumentoArchivoVersion,
} from "@/services/documentos";
import type { ExpedienteDocumento } from "@/types/expediente";

type OcrMetadata360 = {
  numero?: string | number | null;
  fechaEmision?: string | null;
  proveedor?: string | null;
  rucProveedor?: string | null;
  montoTotal?: number | string | null;
  moneda?: string | null;
  codigoExpediente?: string | null;
};

type ExpedienteDocumento360 = {
  expediente_id?: string | number;
  expedienteId?: string | number;
  documento_id?: number | string;
  documentoId?: number | string;
  tipo_relacion?: string | null;
  tipoRelacion?: string | null;
  es_principal?: boolean | null;
  esPrincipal?: boolean | null;
  orden?: number | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  ruc_emisor?: string | null;
  rucEmisor?: string | null;
  rucProveedor?: string | null;
  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;
  proveedor?: string | null;
  serie?: string | null;
  numero?: string | null;
  clave_documental?: string | null;
  claveDocumental?: string | null;
  estado?: string | null;
  fecha_emision?: string | null;
  fechaEmision?: string | null;
  moneda?: string | null;
  monto_total?: number | string | null;
  montoTotal?: number | string | null;
  archivo_id?: number | string | null;
  archivoId?: number | string | null;
  nombre_archivo?: string | null;
  nombreArchivo?: string | null;
  metadata?: (Record<string, unknown> & OcrMetadata360) | string | null;
};

type Alerta360 = {
  id?: string | number;
  titulo?: string | null;
  tipo?: string | null;
  prioridad?: string | null;
  estado?: string | null;
  mensaje?: string | null;
  descripcion?: string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
};

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fecha(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);

  return parsed.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function moneda(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  const code = String(currency ?? "").toUpperCase();
  const currencyCode = code.includes("DOLAR") || code === "USD" ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currencyCode,
  }).format(numericValue);
}

function getArray<T>(value: unknown, key?: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (key && Array.isArray(record[key])) return record[key] as T[];
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.documentos)) return record.documentos as T[];
  if (Array.isArray(record.alertas)) return record.alertas as T[];

  return [];
}

function parseMaybeJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isPrincipal(doc: ExpedienteDocumento360) {
  return Boolean(
    doc.es_principal ||
    doc.esPrincipal ||
    String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
      "principal_",
    ),
  );
}

function isCompraAdjunto(doc: ExpedienteDocumento360) {
  if (isPrincipal(doc)) return false;

  const tipo = normalize(doc.tipo_documental ?? doc.tipoDocumental);
  const relacion = normalize(doc.tipo_relacion ?? doc.tipoRelacion);

  return (
    tipo === "FACTURA" ||
    tipo === "GUIA" ||
    tipo === "GUIA_REMISION" ||
    relacion === "ADJUNTO_FACTURA" ||
    relacion === "ADJUNTO_GUIA"
  );
}

function metadataRecord(doc?: ExpedienteDocumento360) {
  return (parseMaybeJson(doc?.metadata) ?? {}) as Record<string, unknown> &
    OcrMetadata360;
}

function nestedMetadata(doc?: ExpedienteDocumento360) {
  const metadata = metadataRecord(doc);
  const candidates = [
    metadata,
    metadata.ocr,
    metadata.ocrMetadata,
    metadata.resultadoOcr,
    metadata.metadata,
  ];

  for (const candidate of candidates) {
    const parsed = parseMaybeJson(candidate);
    if (parsed) return parsed as Record<string, unknown> & OcrMetadata360;
  }

  return metadata;
}

function getDocumentoId(doc?: ExpedienteDocumento360 | null) {
  return doc?.documento_id ?? doc?.documentoId;
}

function getArchivoId(doc?: ExpedienteDocumento360 | null) {
  return doc?.archivo_id ?? doc?.archivoId;
}

function badgeTone(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("pendiente"))
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (text.includes("validado") || text.includes("confirmado")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (text.includes("rechaz")) return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatusBadge({ value }: { value: unknown }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badgeTone(
        value,
      )}`}
    >
      {texto(value)}
    </span>
  );
}

function RelationBadge({ value }: { value: unknown }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {texto(value)}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
        {texto(value)}
      </p>
    </div>
  );
}

function toPreviewDocumento(
  doc?: ExpedienteDocumento360 | null,
): ExpedienteDocumento | null {
  if (!doc) return null;

  return {
    ...(doc as unknown as Record<string, unknown>),
    documentoId: Number(getDocumentoId(doc) ?? 0),
    tipoDocumental: doc.tipoDocumental ?? doc.tipo_documental ?? undefined,
    tipoRelacion: doc.tipoRelacion ?? doc.tipo_relacion ?? undefined,
    esPrincipal: doc.esPrincipal ?? doc.es_principal ?? undefined,
    fechaEmision: doc.fechaEmision ?? doc.fecha_emision ?? undefined,
    montoTotal: doc.montoTotal ?? doc.monto_total ?? undefined,
    claveDocumental: doc.claveDocumental ?? doc.clave_documental ?? undefined,
    archivoId: doc.archivoId ?? doc.archivo_id ?? undefined,
    nombreArchivo: doc.nombreArchivo ?? doc.nombre_archivo ?? undefined,
  } as unknown as ExpedienteDocumento;
}

function documentoResumen(doc?: ExpedienteDocumento360 | null) {
  const metadata = nestedMetadata(doc ?? undefined);
  const numero = doc?.numero ?? metadata.numero;
  const fechaEmision =
    doc?.fecha_emision ?? doc?.fechaEmision ?? metadata.fechaEmision;
  const proveedor =
    doc?.razon_social_emisor ??
    doc?.razonSocialEmisor ??
    doc?.proveedor ??
    metadata.proveedor;
  const ruc =
    doc?.ruc_emisor ??
    doc?.rucEmisor ??
    doc?.rucProveedor ??
    metadata.rucProveedor;
  const docMoneda = doc?.moneda ?? metadata.moneda;
  const monto = doc?.monto_total ?? doc?.montoTotal ?? metadata.montoTotal;

  return { numero, fechaEmision, proveedor, ruc, docMoneda, monto };
}

function VersionesModal({
  documento,
  open,
  onClose,
  onPreviewVersion,
}: {
  documento: ExpedienteDocumento360 | null;
  open: boolean;
  onClose: () => void;
  onPreviewVersion: (archivo: DocumentoArchivoVersion) => void;
}) {
  const documentoId = getDocumentoId(documento);
  const versionesQuery = useQuery({
    queryKey: ["compras-documento-versiones", documentoId],
    queryFn: () => getDocumentoArchivos(documentoId as string | number),
    enabled: open && Boolean(documentoId),
  });

  const versiones =
    versionesQuery.data?.data ?? versionesQuery.data?.archivos ?? [];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="max-w-3xl p-0"
      showCloseButton
    >
      <div className="rounded-2xl bg-background p-5 text-foreground">
        <div className="pr-10">
          <h2 className="text-lg font-semibold">Versiones del documento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta las versiones registradas para este documento.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {versionesQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando versiones...
            </div>
          ) : null}

          {versiones.map((archivo, index) => {
            const archivoRecord = archivo as unknown as Record<string, unknown>;
            const archivoId =
              archivo.id ??
              archivoRecord.archivo_id ??
              archivoRecord.archivoId;
            const version = archivo.version ?? archivoRecord.version ?? index + 1;
            const actual =
              archivo.es_version_actual ?? archivoRecord.esVersionActual;

            return (
              <div
                key={String(archivoId ?? index)}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Versión {texto(version)}</p>
                    {actual ? <Badge variant="secondary">Actual</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fecha(archivo.creado_en ?? archivoRecord.creadoEn)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewVersion(archivo)}
                  disabled={!archivoId}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </div>
            );
          })}

          {!versionesQuery.isLoading && !versiones.length ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay versiones registradas.
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export default function CompraExpedienteVerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");
  const returnTo = searchParams.get("returnTo") || "/compras";
  const [previewDocumento, setPreviewDocumento] =
    useState<ExpedienteDocumento | null>(null);
  const [versionesDocumento, setVersionesDocumento] =
    useState<ExpedienteDocumento360 | null>(null);

  const resumenQuery = useQuery({
    queryKey: ["expediente-resumen", id],
    queryFn: () => getExpedienteResumen(id),
    enabled: Boolean(id),
  });

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", id],
    queryFn: () => getExpedienteDocumentos(id),
    enabled: Boolean(id),
  });

  const alertasQuery = useQuery({
    queryKey: ["expediente-alertas", id],
    queryFn: () => getExpedienteAlertas(id),
    enabled: Boolean(id),
  });

  const resumen = resumenQuery.data as Record<string, unknown> | undefined;
  const expediente = resumen?.expediente as Record<string, unknown> | undefined;
  const documentos = Array.isArray(documentosQuery.data)
    ? (documentosQuery.data as ExpedienteDocumento360[])
    : ((resumen?.documentos ?? []) as ExpedienteDocumento360[]);

  const principal = useMemo(() => {
    const principales = documentos.filter(isPrincipal);
    return (
      principales[0] ??
      documentos.find((doc) => doc.es_principal || doc.esPrincipal) ??
      documentos.find((doc) =>
        String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
          "principal_",
        ),
      ) ??
      null
    );
  }, [documentos]);

  const adjuntosCompras = useMemo(
    () => documentos.filter(isCompraAdjunto),
    [documentos],
  );
  const alertas = getArray<Alerta360>(alertasQuery.data, "alertas");
  const principalInfo = documentoResumen(principal);
  const cargando =
    resumenQuery.isLoading ||
    documentosQuery.isLoading ||
    alertasQuery.isLoading;
  const codigoExpediente = texto(
    expediente?.codigo_expediente ?? expediente?.codigoExpediente ?? id,
  );
  const descripcion = texto(
    expediente?.descripcion,
    "Sin descripción registrada",
  );

  function abrirPreview(doc: ExpedienteDocumento360 | null) {
    setPreviewDocumento(toPreviewDocumento(doc));
  }

  function abrirPreviewVersion(archivo: DocumentoArchivoVersion) {
    const archivoRecord = archivo as unknown as Record<string, unknown>;
    const archivoId =
      archivo.id ?? archivoRecord.archivo_id ?? archivoRecord.archivoId;

    setPreviewDocumento({
      ...(toPreviewDocumento(versionesDocumento) as unknown as Record<
        string,
        unknown
      >),
      archivoId,
      archivo_id: archivoId,
      nombreArchivo:
        archivo.nombre_archivo ?? archivoRecord.nombreArchivo ?? undefined,
      nombre_archivo:
        archivo.nombre_archivo ?? archivoRecord.nombreArchivo ?? undefined,
    } as unknown as ExpedienteDocumento);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Compras
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            Expediente {codigoExpediente}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consulta simple del documento principal, adjuntos de compras y
            alertas.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={returnTo}>Volver</Link>
        </Button>
      </header>

      {cargando ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Cargando expediente...
        </section>
      ) : null}

      {resumenQuery.isError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          No se pudo cargar el expediente.
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Documento principal
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">
                {texto(
                  principal?.tipo_documental ?? principal?.tipoDocumental,
                  "Documento",
                )}
                {principalInfo.numero !== undefined &&
                principalInfo.numero !== null
                  ? ` ${principalInfo.numero}`
                  : ""}
              </h2>
            </div>
            {principal ? (
              <RelationBadge
                value={principal.tipo_relacion ?? principal.tipoRelacion}
              />
            ) : null}
          </div>

          {principal ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  label="Tipo"
                  value={principal.tipo_documental ?? principal.tipoDocumental}
                />
                <DetailItem label="Número" value={principalInfo.numero} />
                <DetailItem
                  label="Fecha"
                  value={fecha(principalInfo.fechaEmision)}
                />
                <DetailItem label="Proveedor" value={principalInfo.proveedor} />
                <DetailItem label="RUC" value={principalInfo.ruc} />
                <DetailItem
                  label="Monto"
                  value={moneda(
                    principalInfo.monto,
                    texto(principalInfo.docMoneda, ""),
                  )}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => abrirPreview(principal)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setVersionesDocumento(principal)}
                  disabled={!getDocumentoId(principal)}
                >
                  <History className="mr-2 h-4 w-4" />
                  Ver versiones
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No hay documento principal vinculado.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Expediente
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">
            {codigoExpediente}
          </h2>
          <p className="mt-2 text-sm font-medium uppercase text-slate-500 dark:text-slate-400">
            {descripcion}
          </p>
          <div className="mt-5">
            <DetailItem label="Estado" value={expediente?.estado} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Adjuntos
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">
              Documentos adjuntos
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {adjuntosCompras.length} adjunto(s)
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {adjuntosCompras.map((doc, index) => {
            const info = documentoResumen(doc);
            return (
              <article
                key={String(getDocumentoId(doc) ?? getArchivoId(doc) ?? index)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      {texto(
                        doc.tipo_documental ?? doc.tipoDocumental,
                        "Adjunto",
                      )}
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950 dark:text-slate-100">
                      {texto(info.numero, "Sin número")}
                    </p>
                  </div>
                  <StatusBadge value={doc.estado} />
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Relación</span>
                    <RelationBadge
                      value={doc.tipo_relacion ?? doc.tipoRelacion}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Fecha</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {fecha(
                        info.fechaEmision ?? doc.creado_en ?? doc.creadoEn,
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => abrirPreview(doc)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setVersionesDocumento(doc)}
                    disabled={!getDocumentoId(doc)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Ver versiones
                  </Button>
                </div>
              </article>
            );
          })}

          {!adjuntosCompras.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-400 dark:border-slate-800 lg:col-span-3">
              No hay factura o guía vinculada para compras.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Alertas
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          {alertas.map((alerta, index) => (
            <div
              key={alerta.id ?? index}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {texto(alerta.titulo ?? alerta.tipo ?? "Alerta")}
                </p>
                <StatusBadge value={alerta.prioridad ?? alerta.estado} />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {texto(alerta.mensaje ?? alerta.descripcion)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {fecha(alerta.creado_en ?? alerta.creadoEn)}
              </p>
            </div>
          ))}
          {!alertas.length ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-400">
              No hay alertas activas.
            </p>
          ) : null}
        </div>
      </section>

      <DocumentoPreviewModal
        documento={previewDocumento}
        open={Boolean(previewDocumento)}
        onClose={() => setPreviewDocumento(null)}
      />

      <VersionesModal
        documento={versionesDocumento}
        open={Boolean(versionesDocumento)}
        onClose={() => setVersionesDocumento(null)}
        onPreviewVersion={abrirPreviewVersion}
      />
    </div>
  );
}
