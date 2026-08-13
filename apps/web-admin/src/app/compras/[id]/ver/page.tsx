"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, Loader2 } from "lucide-react";

import { DocumentoPreviewModal } from "@/components/revision-contable/DocumentoPreviewModal";
import {
  entityVista,
  getAdjuntosGrupo,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaLabel,
  getGrupoFacturaPersistidoId,
  getGruposFactura,
} from "@/components/documental-v2/workspace-v2-utils";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import type { WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
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
  documento_base_id?: number | string | null;
  documentoBaseId?: number | string | null;
  documento_principal_id?: number | string | null;
  documentoPrincipalId?: number | string | null;
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
  return [doc.es_principal, doc.esPrincipal].some((value) => {
    if (value === true) return true;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1";
  });
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

function normalizeDocumentoId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function getDocumentoBaseId(doc?: ExpedienteDocumento360 | null): number | null {
  if (!doc) return null;

  const record = doc as unknown as Record<string, unknown>;
  const metadata = metadataRecord(doc);
  const ocr = parseMaybeJson(metadata.ocr);
  const ocrMetadata = parseMaybeJson(ocr?.metadata);
  const contextoCarga = parseMaybeJson(ocr?.contextoCarga);
  const contextoValidacion = parseMaybeJson(ocr?.contextoValidacion);
  const audit = Array.isArray(ocr?.audit) ? ocr.audit : [];
  const ultimoAudit = audit.length
    ? parseMaybeJson(audit[audit.length - 1])
    : null;
  const cambios = parseMaybeJson(ultimoAudit?.cambios);
  const cambiosMetadata = parseMaybeJson(cambios?.metadata);
  const cambiosContextoValidacion = parseMaybeJson(
    cambios?.contextoValidacion,
  );

  const candidatos = [
    record.documentoBaseId,
    record.documento_base_id,
    record.documentoPrincipalId,
    record.documento_principal_id,
    metadata.documentoBaseId,
    ocrMetadata?.documentoBaseId,
    contextoCarga?.documentoBaseId,
    contextoValidacion?.documentoBaseId,
    cambiosMetadata?.documentoBaseId,
    cambiosContextoValidacion?.documentoBaseId,
  ];

  for (const candidato of candidatos) {
    const documentoId = normalizeDocumentoId(candidato);
    if (documentoId !== null) return documentoId;
  }

  return null;
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


function DocumentoLecturaCard({
  documento,
  titulo,
  onPreview,
  onVersiones,
}: {
  documento: ExpedienteDocumento360;
  titulo?: string;
  onPreview: (doc: ExpedienteDocumento360) => void;
  onVersiones: (doc: ExpedienteDocumento360) => void;
}) {
  const info = documentoResumen(documento);
  const tipo = texto(
    documento.tipo_documental ?? documento.tipoDocumental,
    "Documento",
  );
  const numero = texto(info.numero, "Sin número");
  const proveedor = texto(info.proveedor, "");
  const ruc = texto(info.ruc, "");
  const monto = moneda(info.monto, texto(info.docMoneda, ""));
  const fechaTexto = fecha(
    info.fechaEmision ?? documento.creado_en ?? documento.creadoEn,
  );
  const tituloVisible =
    titulo ??
    (normalize(tipo) === "FACTURA" ? numero : `${tipo} ${numero}`.trim());

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950 dark:text-slate-100">
            {tituloVisible}
          </p>
          {proveedor ? (
            <p
              className="mt-1 line-clamp-2 break-words text-sm text-slate-500 dark:text-slate-400"
              title={proveedor}
            >
              {proveedor}
            </p>
          ) : null}
          {ruc ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              RUC {ruc}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[monto !== "—" ? monto : "", fechaTexto !== "—" ? fechaTexto : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <StatusBadge value={documento.estado} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onPreview(documento)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onVersiones(documento)}
          disabled={!getDocumentoId(documento)}
        >
          <History className="mr-2 h-4 w-4" />
          Versiones
        </Button>
      </div>
    </div>
  );
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

  const workspaceQuery = useQuery({
    queryKey: ["compras-workspace-v2", id],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  const resumen = resumenQuery.data as Record<string, unknown> | undefined;
  const expediente = resumen?.expediente as Record<string, unknown> | undefined;
  const documentos = Array.isArray(documentosQuery.data)
    ? (documentosQuery.data as ExpedienteDocumento360[])
    : ((resumen?.documentos ?? []) as ExpedienteDocumento360[]);

  const documentosPrincipales = useMemo(
    () =>
      documentos.filter(isPrincipal).filter((doc) => {
        const tipo = normalize(doc.tipo_documental ?? doc.tipoDocumental);
        return tipo === "OC" || tipo === "OS";
      }),
    [documentos],
  );

  const principalIdParam = normalizeDocumentoId(
    searchParams.get("principalId"),
  );

  const principalPorParametro = useMemo(
    () =>
      documentosPrincipales.find(
        (doc) =>
          normalizeDocumentoId(getDocumentoId(doc)) === principalIdParam,
      ) ?? null,
    [documentosPrincipales, principalIdParam],
  );

  const principal =
    principalPorParametro ??
    (documentosPrincipales.length === 1 ? documentosPrincipales[0] : null);

  const seleccionPrincipalRequerida =
    documentosPrincipales.length > 1 && !principalPorParametro;

  const principalDocumentoId = normalizeDocumentoId(getDocumentoId(principal));

  const gruposFacturaPrincipal = useMemo(() => {
    if (!workspaceQuery.data || principalDocumentoId === null) return [];

    return getGruposFactura(workspaceQuery.data).filter(
      (grupo) =>
        normalizeDocumentoId(getGrupoDocumentoPrincipalDocumentoId(grupo)) ===
        principalDocumentoId,
    );
  }, [principalDocumentoId, workspaceQuery.data]);

  function documentosGrupo(grupo: WorkspaceV2GrupoFactura) {
    const ids = new Set<number>();

    const facturaId = normalizeDocumentoId(getGrupoFacturaDocumentoId(grupo));
    if (facturaId !== null) ids.add(facturaId);

    for (const adjunto of getAdjuntosGrupo(grupo)) {
      const vista = entityVista<Record<string, unknown>>(adjunto);
      const adjuntoId = normalizeDocumentoId(
        vista.documentoId ?? vista.documento_id ?? vista.id,
      );
      if (adjuntoId !== null) ids.add(adjuntoId);
    }

    return documentos.filter((doc) => {
      const idDoc = normalizeDocumentoId(getDocumentoId(doc));
      return idDoc !== null && ids.has(idDoc);
    });
  }

  const adjuntosComprasGlobales = useMemo(
    () => documentos.filter(isCompraAdjunto),
    [documentos],
  );

  const adjuntosCompras = useMemo(() => {
    const principalId = normalizeDocumentoId(getDocumentoId(principal));

    if (principalId !== null) {
      return adjuntosComprasGlobales.filter(
        (doc) => getDocumentoBaseId(doc) === principalId,
      );
    }

    if (documentosPrincipales.length === 0) {
      return adjuntosComprasGlobales.filter(
        (doc) => getDocumentoBaseId(doc) === null,
      );
    }

    return [];
  }, [adjuntosComprasGlobales, documentosPrincipales.length, principal]);
  const principalInfo = documentoResumen(principal);
  const cargando =
    resumenQuery.isLoading ||
    documentosQuery.isLoading ||
    workspaceQuery.isLoading;
  const codigoExpediente = texto(
    expediente?.codigo_expediente ?? expediente?.codigoExpediente ?? id,
  );
  const descripcion = texto(
    expediente?.descripcion,
    "Sin descripción registrada",
  );

  function principalHref(documentoId: string | number) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("principalId", String(documentoId));
    return `/compras/${id}/ver?${nextParams.toString()}`;
  }

  function abrirPreview(doc: ExpedienteDocumento360 | null) {
    setPreviewDocumento(toPreviewDocumento(doc));
  }

  function abrirPreviewVersion(archivo: DocumentoArchivoVersion) {
    const archivoRecord = archivo as unknown as Record<string, unknown>;
    const archivoId =
      archivo.id ?? archivoRecord.archivo_id ?? archivoRecord.archivoId;

    setVersionesDocumento(null);
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
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            {principal
              ? `${texto(principal.tipo_documental ?? principal.tipoDocumental, "OC/OS")} ${
                  texto(principalInfo.numero, "")
                }`.trim()
              : "Compras"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Contexto {codigoExpediente} · {descripcion}
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 px-3">
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

      {documentosPrincipales.length > 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Principal de trabajo
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">
              Selecciona OC / OS de trabajo
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define qué documento principal y qué adjuntos asociados deseas consultar.
            </p>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {documentosPrincipales.map((doc) => {
              const documentoId = getDocumentoId(doc);
              const info = documentoResumen(doc);
              const tipo = texto(
                doc.tipo_documental ?? doc.tipoDocumental,
                "Documento",
              );
              const seleccionado =
                normalizeDocumentoId(documentoId) ===
                normalizeDocumentoId(getDocumentoId(principal));

              if (!documentoId) return null;

              return (
                <Button
                  key={String(documentoId)}
                  asChild
                  variant={seleccionado ? "default" : "outline"}
                  className="h-auto min-h-16 justify-start whitespace-normal px-4 py-3 text-left"
                >
                  <Link href={principalHref(documentoId)}>
                    <span>
                      <span className="block font-semibold">
                        {tipo}
                        {info.numero !== undefined && info.numero !== null
                          ? ` ${info.numero}`
                          : ""}
                      </span>
                      <span className="mt-1 block text-xs opacity-80">
                        {seleccionado
                          ? "Principal seleccionado"
                          : "Seleccionar"}
                      </span>
                    </span>
                  </Link>
                </Button>
              );
            })}
          </div>

          {seleccionPrincipalRequerida ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Este expediente tiene más de una OC / OS principal. Selecciona el documento de trabajo para consultar sus adjuntos sin mezclar otros principales.
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]">
          <div className="p-5 lg:border-r lg:border-slate-200 dark:lg:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Centro de costo
            </p>
            <div className="mt-3 space-y-1">
              <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">
                {codigoExpediente}
              </h2>
              <p
                className="line-clamp-2 break-words text-sm text-slate-500 dark:text-slate-400"
                title={descripcion}
              >
                {descripcion}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 p-5 dark:border-slate-800 lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Documento principal
            </p>

            <div className="mt-3">
              {principal ? (
                <DocumentoLecturaCard
                  documento={principal}
                  onPreview={abrirPreview}
                  onVersiones={setVersionesDocumento}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-slate-800">
                  {seleccionPrincipalRequerida
                    ? "Selecciona una OC / OS de trabajo para consultar sus documentos."
                    : "No hay documento principal vinculado."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Documentos de compra
        </p>

        {workspaceQuery.isError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            No se pudo resolver la agrupación documental de las facturas.
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Facturas
              </h3>
              <span className="text-xs text-slate-400">
                {gruposFacturaPrincipal.length} factura
                {gruposFacturaPrincipal.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {gruposFacturaPrincipal.map((grupo) => {
                const facturaId = normalizeDocumentoId(
                  getGrupoFacturaDocumentoId(grupo),
                );
                const docs = documentosGrupo(grupo);
                const factura =
                  docs.find(
                    (doc) =>
                      normalizeDocumentoId(getDocumentoId(doc)) === facturaId,
                  ) ??
                  docs.find(
                    (doc) =>
                      normalize(doc.tipo_documental ?? doc.tipoDocumental) ===
                      "FACTURA",
                  );

                if (!factura) return null;

                return (
                  <DocumentoLecturaCard
                    key={String(
                      getGrupoFacturaPersistidoId(grupo) ??
                        getDocumentoId(factura),
                    )}
                    documento={factura}
                    titulo={getGrupoFacturaLabel(grupo).replace(
                      /^Factura\s*/i,
                      "",
                    )}
                    onPreview={abrirPreview}
                    onVersiones={setVersionesDocumento}
                  />
                );
              })}

              {!workspaceQuery.isError &&
              principal &&
              !gruposFacturaPrincipal.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-slate-800">
                  Aún no se han adjuntado facturas.
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Guía
            </h3>
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-slate-800">
              Aún no se ha adjuntado una guía.
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Otros sustentos
            </h3>
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 dark:border-slate-800">
              Aún no se han adjuntado otros documentos.
            </div>
          </div>
        </div>

        <span className="sr-only">
          Adjuntos legacy del principal: {adjuntosCompras.length}
        </span>
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
