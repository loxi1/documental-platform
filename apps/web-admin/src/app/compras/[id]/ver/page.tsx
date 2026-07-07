"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getExpedienteAlertas,
  getExpedienteDocumentos,
  getExpedienteResumen,
} from "@/services/expedientes";
import {
  getDocumentoArchivos,
  type DocumentoArchivoVersion,
} from "@/services/documentos";
import { getDocumentoArchivoPreviewUrl } from "@/services/documentos-preview";

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
  cliente_abreviatura?: string | null;
  clienteAbreviatura?: string | null;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  ruc_emisor?: string | null;
  rucEmisor?: string | null;
  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;
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
  storage_provider?: string | null;
  storageProvider?: string | null;
  archivo_estado?: string | null;
  archivoEstado?: string | null;
  area_origen?: string | null;
  areaOrigen?: string | null;
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

type VersionesModalState = {
  documentoId: string;
  titulo: string;
  archivos: DocumentoArchivoVersion[];
};

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fecha(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("es-PE");
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

function isPrincipal(doc: ExpedienteDocumento360) {
  return Boolean(
    doc.es_principal ||
      doc.esPrincipal ||
      String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith("principal_"),
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

function badgeTone(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("pendiente")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (text.includes("validado") || text.includes("confirmado")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (text.includes("rechaz")) return "border-red-200 bg-red-50 text-red-700";
  if (text.includes("abierto")) return "border-slate-200 bg-slate-100 text-slate-700";
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
        {texto(value)}
      </p>
    </div>
  );
}

function getDocumentoId(doc?: ExpedienteDocumento360) {
  return doc?.documento_id ?? doc?.documentoId;
}

function getArchivoId(doc?: ExpedienteDocumento360) {
  return doc?.archivo_id ?? doc?.archivoId;
}

function getDocTitle(doc?: ExpedienteDocumento360) {
  if (!doc) return "Documento";
  return texto(
    doc.nombre_archivo ??
      doc.nombreArchivo ??
      [doc.serie, doc.numero].filter(Boolean).join("-") ??
      doc.tipo_documental ??
      doc.tipoDocumental,
    "Documento",
  );
}

function getDocumentNumber(doc?: ExpedienteDocumento360) {
  if (!doc) return "—";
  const metadata = nestedMetadata(doc);
  const numero = doc.numero ?? metadata.numero;
  const serie = doc.serie;
  return [serie, numero].filter(Boolean).join("-") || texto(numero);
}

function safeReturnTo(value: string | null) {
  if (!value) return "/compras";
  return value.startsWith("/compras") ? value : "/compras";
}

function DocumentoActions({
  doc,
  onPreview,
  onVersiones,
}: {
  doc?: ExpedienteDocumento360;
  onPreview: (doc: ExpedienteDocumento360) => void;
  onVersiones: (doc: ExpedienteDocumento360) => void;
}) {
  if (!doc) return null;

  const archivoId = getArchivoId(doc);
  const documentoId = getDocumentoId(doc);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!archivoId}
        onClick={() => onPreview(doc)}
      >
        <Eye className="h-4 w-4" />
        Ver
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!documentoId}
        onClick={() => onVersiones(doc)}
      >
        <History className="h-4 w-4" />
        Ver versiones
      </Button>
    </div>
  );
}

function DocumentoPrincipalCard({
  doc,
  onPreview,
  onVersiones,
}: {
  doc?: ExpedienteDocumento360;
  onPreview: (doc: ExpedienteDocumento360) => void;
  onVersiones: (doc: ExpedienteDocumento360) => void;
}) {
  const metadata = nestedMetadata(doc);
  const proveedor =
    doc?.razon_social_emisor ?? doc?.razonSocialEmisor ?? metadata.proveedor;
  const rucProveedor = doc?.ruc_emisor ?? doc?.rucEmisor ?? metadata.rucProveedor;
  const fechaEmision = doc?.fecha_emision ?? doc?.fechaEmision ?? metadata.fechaEmision;
  const monto = doc?.monto_total ?? doc?.montoTotal ?? metadata.montoTotal;
  const monedaDoc = doc?.moneda ?? metadata.moneda;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Documento principal
          </p>
          <h2 className="mt-2 break-words text-xl font-bold text-slate-950 dark:text-slate-100">
            {doc ? getDocTitle(doc) : "Sin documento principal"}
          </h2>
        </div>
        {doc ? <RelationBadge value={doc.tipo_relacion ?? doc.tipoRelacion} /> : null}
      </div>

      {doc ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Tipo" value={doc.tipo_documental ?? doc.tipoDocumental} />
            <DetailItem label="Número" value={getDocumentNumber(doc)} />
            <DetailItem label="Fecha" value={fechaEmision} />
            <DetailItem label="Proveedor" value={proveedor} />
            <DetailItem label="RUC" value={rucProveedor} />
            <DetailItem label="Monto" value={moneda(monto, texto(monedaDoc, ""))} />
          </div>
          <div className="mt-5">
            <DocumentoActions doc={doc} onPreview={onPreview} onVersiones={onVersiones} />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Este expediente todavía no tiene un documento principal vinculado.
        </p>
      )}
    </section>
  );
}

function ResumenExpedienteCard({
  expediente,
  id,
}: {
  expediente?: Record<string, unknown>;
  id: string;
}) {
  const codigo = expediente?.codigo_expediente ?? expediente?.codigoExpediente ?? id;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        Expediente
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">
        {texto(codigo)}
      </h2>
      <p className="mt-2 text-sm font-medium uppercase leading-relaxed text-slate-500 dark:text-slate-400">
        {texto(expediente?.descripcion)}
      </p>
      <div className="mt-5 grid gap-3">
        <DetailItem label="Estado" value={expediente?.estado} />
      </div>
    </section>
  );
}

function DocumentoAdjuntoCard({
  doc,
  onPreview,
  onVersiones,
}: {
  doc: ExpedienteDocumento360;
  onPreview: (doc: ExpedienteDocumento360) => void;
  onVersiones: (doc: ExpedienteDocumento360) => void;
}) {
  return (
    <article className="flex min-h-[210px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {texto(doc.tipo_documental ?? doc.tipoDocumental, "Documento")}
          </p>
          <h3 className="mt-2 line-clamp-2 break-words text-base font-bold text-slate-950 dark:text-slate-100">
            {getDocTitle(doc)}
          </h3>
        </div>
        <StatusBadge value={doc.estado} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Relación</span>
          <RelationBadge value={doc.tipo_relacion ?? doc.tipoRelacion} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Número</span>
          <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
            {getDocumentNumber(doc)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">Fecha</span>
          <span className="text-right text-slate-600 dark:text-slate-300">
            {fecha(doc.creado_en ?? doc.creadoEn)}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <DocumentoActions doc={doc} onPreview={onPreview} onVersiones={onVersiones} />
      </div>
    </article>
  );
}

function VersionesModal({
  state,
  loading,
  error,
  onClose,
  onPreview,
}: {
  state: VersionesModalState | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onPreview: (archivoId: number | string) => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Historial
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
              Ver versiones
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {state.titulo} · Documento {state.documentoId}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando versiones...
          </div>
        ) : state.archivos.length ? (
          <div className="mt-5 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-2 text-left">Versión</th>
                  <th className="px-3 py-2 text-left">Archivo</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.archivos.map((archivo) => {
                  const actual =
                    archivo.es_version_actual === true ||
                    String(archivo.es_version_actual).toLowerCase() === "t";
                  return (
                    <tr key={archivo.id}>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold">v{archivo.version ?? "—"}</div>
                        {actual ? (
                          <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Actual
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[300px] px-3 py-3 align-top">
                        <div className="truncate font-semibold">
                          {archivo.nombre_archivo ?? "Archivo"}
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {archivo.storage_key ?? archivo.ruta_archivo ?? "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">{archivo.tipo_version ?? "—"}</td>
                      <td className="px-3 py-3 align-top">
                        <StatusBadge value={archivo.estado} />
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-500">
                        {fecha(archivo.creado_en)}
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onPreview(archivo.id)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
            No hay versiones registradas para este documento.
          </div>
        )}
      </section>
    </div>
  );
}

export default function CompraExpedienteVerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId ?? "");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const [versionesModal, setVersionesModal] = useState<VersionesModalState | null>(null);
  const [versionesLoading, setVersionesLoading] = useState(false);
  const [versionesError, setVersionesError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const documentosPrincipales = documentos.filter(isPrincipal);
  const documentosAdjuntos = documentos.filter((doc) => !isPrincipal(doc));
  const totalDocumentos =
    (resumen?.totales as Record<string, unknown> | undefined)?.documentos ??
    documentos.length;

  const alertas = getArray<Alerta360>(alertasQuery.data, "alertas");

  const principal =
    documentosPrincipales[0] ??
    documentos.find((doc) => doc.es_principal || doc.esPrincipal) ??
    documentos.find((doc) =>
      String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
        "principal_",
      ),
    ) ??
    documentos[0];

  const cargando = resumenQuery.isLoading || documentosQuery.isLoading || alertasQuery.isLoading;

  async function abrirPreview(doc: ExpedienteDocumento360) {
    const archivoId = getArchivoId(doc);
    if (!archivoId) return;

    setPreviewError(null);
    try {
      const preview = await getDocumentoArchivoPreviewUrl(archivoId);
      if (!preview?.signedUrl) {
        throw new Error("No se recibió URL temporal para previsualizar el archivo.");
      }
      window.open(preview.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "No se pudo abrir el documento.",
      );
    }
  }

  async function abrirVersiones(doc: ExpedienteDocumento360) {
    const documentoId = getDocumentoId(doc);
    if (!documentoId) return;

    setVersionesModal({
      documentoId: String(documentoId),
      titulo: getDocTitle(doc),
      archivos: [],
    });
    setVersionesLoading(true);
    setVersionesError(null);

    try {
      const response = await getDocumentoArchivos(documentoId);
      setVersionesModal({
        documentoId: String(documentoId),
        titulo: getDocTitle(doc),
        archivos: response.data ?? response.archivos ?? [],
      });
    } catch (error) {
      setVersionesError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de versiones.",
      );
    } finally {
      setVersionesLoading(false);
    }
  }

  async function abrirPreviewVersion(archivoId: number | string) {
    setVersionesError(null);
    try {
      const preview = await getDocumentoArchivoPreviewUrl(archivoId);
      if (!preview?.signedUrl) {
        throw new Error("No se recibió URL temporal para previsualizar el archivo.");
      }
      window.open(preview.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setVersionesError(
        error instanceof Error ? error.message : "No se pudo abrir la versión seleccionada.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Compras
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            Expediente {texto(expediente?.codigo_expediente ?? expediente?.codigoExpediente ?? id)}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Consulta simple del documento principal, adjuntos y alertas.
          </p>
        </div>

        <Link
          href={returnTo}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Volver
        </Link>
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

      {previewError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {previewError}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <DocumentoPrincipalCard
          doc={principal}
          onPreview={abrirPreview}
          onVersiones={abrirVersiones}
        />
        <ResumenExpedienteCard expediente={expediente} id={id} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Adjuntos
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
              Documentos adjuntos
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {documentosAdjuntos.length} adjunto(s) · {texto(totalDocumentos)} documento(s)
          </span>
        </div>

        {documentosAdjuntos.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documentosAdjuntos.map((doc, index) => (
              <DocumentoAdjuntoCard
                key={String(getDocumentoId(doc) ?? getArchivoId(doc) ?? index)}
                doc={doc}
                onPreview={abrirPreview}
                onVersiones={abrirVersiones}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No hay documentos adjuntos vinculados.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Alertas
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
            Alertas del expediente
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
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
              No hay alertas activas.
            </p>
          ) : null}
        </div>
      </section>

      <VersionesModal
        state={versionesModal}
        loading={versionesLoading}
        error={versionesError}
        onClose={() => setVersionesModal(null)}
        onPreview={abrirPreviewVersion}
      />
    </div>
  );
}
