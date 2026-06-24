"use client";

import Link from "next/link";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { OcrValidationModal, type OcrValidationFormState } from "@/components/ocr/OcrValidationModal";
import { OcrProcessingDialog, type OcrProcessingStep } from "@/components/ocr/OcrProcessingDialog";
import {
  DOCUMENTO_ADJUNTO_OPTIONS,
  DOCUMENTO_PRINCIPAL_OPTIONS,
  getDocumentoSummary,
  getDocumentoVisualState,
  type DocumentoCargaOption,
} from "../../constants/documentos";
import { useExpediente } from "@/hooks/useExpedientes";
import { subirDocumentoGuiado } from "@/services/carga-guiada";
import { api } from "@/services/api";
import {
  agregarArchivoComoVersion,
  getDocumentoArchivos,
  type DocumentoArchivoVersion,
} from "@/services/documentos";
import {
  confirmarOcrConExpediente,
  editarOcrResultado,
  procesarArchivoOcr,
  rechazarOcrResultado,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function descripcionAmigable(expediente: any) {
  const descripcion = text(expediente.descripcion, "");
  const descripcionTecnica = descripcion.toLowerCase();

  if (
    descripcion &&
    !descripcionTecnica.includes("expediente documental de prueba") &&
    !descripcionTecnica.includes("expediente creado desde ocr")
  ) {
    return descripcion;
  }

  const codigo = text(expediente.codigo_expediente ?? expediente.codigoExpediente, "");
  const clave = text(expediente.clave_principal ?? expediente.clavePrincipal, "");

  if (clave && !codigo) return "Factura directa";
  if (codigo.startsWith("05")) return "Orden de Producción";
  if (codigo.startsWith("03")) return "Centro de costo";

  return "";
}

type AccionCargaGuiada = DocumentoCargaOption & {
  grupo: "principal" | "adjunto";
};

type UploadYProcesarArgs = {
  accion: AccionCargaGuiada;
  file: File;
};

type DocumentoVinculado = Record<string, any>;

type ExpedienteDocumentosResponse = {
  success?: boolean;
  data?: DocumentoVinculado[] | { data?: DocumentoVinculado[] };
};

function unwrapDocumentos(payload: ExpedienteDocumentosResponse | DocumentoVinculado[] | any): DocumentoVinculado[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function pickDocValue(doc: DocumentoVinculado | undefined, keys: string[], fallback = "—") {
  if (!doc) return fallback;

  for (const key of keys) {
    const value = doc[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function getRelacion(doc: DocumentoVinculado) {
  return text(doc.tipo_relacion ?? doc.tipoRelacion ?? doc.relacion, "");
}

function ordenarDocumentosPorFecha(documentos: DocumentoVinculado[] = []) {
  return [...documentos].sort((a, b) => getCreatedTime(b) - getCreatedTime(a));
}

function getDocumentosPorRelacion(documentos: DocumentoVinculado[]) {
  const map = new Map<string, DocumentoVinculado[]>();

  for (const doc of documentos) {
    const relacion = getRelacion(doc);
    if (!relacion) continue;
    const current = map.get(relacion) ?? [];
    current.push(doc);
    map.set(relacion, current);
  }

  for (const [relacion, docs] of map.entries()) {
    map.set(relacion, ordenarDocumentosPorFecha(docs));
  }

  return map;
}

function isTipoRelacionPrincipal(relacion: string) {
  return relacion.startsWith("principal_");
}

const ESTADO_VISUAL_PRIORIDAD: Record<string, number> = {
  error: 70,
  rechazado: 60,
  pendiente_validacion: 50,
  validado: 40,
  confirmado: 40,
  pendiente_ocr: 30,
  subido: 20,
  pendiente_carga: 10,
};

function getCreatedTime(doc: DocumentoVinculado) {
  const raw = String(doc.creado_en ?? doc.creadoEn ?? doc.createdAt ?? doc.actualizado_en ?? "");
  const time = raw ? new Date(raw.replace(" ", "T")).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function pickDocumentoPrincipalActual(
  documentosPorRelacion: Map<string, DocumentoVinculado[]>,
) {
  const candidatos = DOCUMENTO_PRINCIPAL_OPTIONS
    .map((option) => {
      const documentos = documentosPorRelacion.get(option.tipoRelacionSugerida) ?? [];
      const doc = documentos[0];
      if (!doc) return null;
      const visual = getDocumentoVisualState(doc);
      const estado = String((visual as any).state ?? doc.estado ?? doc.archivo_estado ?? "");
      return {
        option,
        documentos,
        doc,
        prioridad: ESTADO_VISUAL_PRIORIDAD[estado] ?? 0,
        createdTime: getCreatedTime(doc),
      };
    })
    .filter(Boolean) as Array<{
      option: DocumentoCargaOption;
      documentos: DocumentoVinculado[];
      doc: DocumentoVinculado;
      prioridad: number;
      createdTime: number;
    }>;

  if (!candidatos.length) return null;

  return candidatos.sort((a, b) => {
    if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
    return b.createdTime - a.createdTime;
  })[0];
}

function DocumentoExistenteResumen({
  documentos,
  option,
  onVerValidar,
  onVerVersiones,
  mostrarContenido = true,
}: {
  documentos?: DocumentoVinculado[];
  option: DocumentoCargaOption;
  onVerValidar?: (doc: DocumentoVinculado) => void;
  onVerVersiones?: (doc: DocumentoVinculado) => void;
  mostrarContenido?: boolean;
}) {
  const principal = documentos?.[0];
  const total = documentos?.length ?? 0;

  if (!principal || !mostrarContenido) {
    const visual = getDocumentoVisualState(null);
    return (
      <div className={`mt-3 rounded-lg border border-dashed px-3 py-2 text-xs ${visual.className}`}>
        <div className="font-medium text-muted-foreground">
          {mostrarContenido ? visual.label : "Disponible para carga"}
        </div>
        {!mostrarContenido && total > 0 ? (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Tiene {total} documento{total > 1 ? "s" : ""} histórico{total > 1 ? "s" : ""}. No se muestra como principal activo.
          </div>
        ) : null}
      </div>
    );
  }

  const visual = getDocumentoVisualState(principal);
  const summary = getDocumentoSummary(principal, option);

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${visual.className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{summary.title}</div>
          <div className="mt-1 truncate text-muted-foreground">{summary.providerLine}</div>
          {summary.details ? (
            <div className="mt-1 text-muted-foreground">{summary.details}</div>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${visual.badgeClassName}`}>
          {visual.label}
        </span>
      </div>

      <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
        {summary.archivo ? <div className="truncate">Archivo: {summary.archivo}</div> : null}
        {summary.archivoId ? <div>Archivo ID: {summary.archivoId}</div> : null}
        {total > 1 ? <div>Versiones/cargas: {total}</div> : null}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onVerValidar?.(principal)}
        >
          {isDocumentoConfirmado(principal) ? "Ver" : "Ver / Validar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onVerVersiones?.(principal)}
        >
          <History className="h-3.5 w-3.5" />
          Versiones
        </Button>
      </div>
    </div>
  );
}


function DocumentoAdjuntoRelacionResumen({
  documentos,
  option,
  onVerValidar,
  onVerVersiones,
}: {
  documentos?: DocumentoVinculado[];
  option: DocumentoCargaOption;
  onVerValidar?: (doc: DocumentoVinculado) => void;
  onVerVersiones?: (doc: DocumentoVinculado) => void;
}) {
  const ordenados = ordenarDocumentosPorFecha(documentos ?? []);
  const total = ordenados.length;

  if (!total) {
    const visual = getDocumentoVisualState(null);
    return (
      <div className={`mt-3 rounded-lg border border-dashed px-3 py-2 text-xs ${visual.className}`}>
        <div className="font-medium text-muted-foreground">Pendiente de carga</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Se vinculará como {option.tipoRelacionSugerida}; no reemplaza el documento principal.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {total} adjunto{total > 1 ? "s" : ""} confirmado{total > 1 ? "s" : ""}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-[10px]">
          No principal
        </span>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {ordenados.map((doc) => {
          const visual = getDocumentoVisualState(doc);
          const summary = getDocumentoSummary(doc, option);
          const key = String(doc.documento_id ?? doc.documentoId ?? doc.archivo_id ?? summary.displayName);

          return (
            <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${visual.className}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{summary.title}</div>
                  <div className="mt-1 truncate text-muted-foreground">{summary.providerLine}</div>
                  {summary.details ? (
                    <div className="mt-1 text-muted-foreground">{summary.details}</div>
                  ) : null}
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${visual.badgeClassName}`}>
                  {visual.label}
                </span>
              </div>

              <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                {summary.archivo ? <div className="truncate">Archivo: {summary.archivo}</div> : null}
                {summary.archivoId ? <div>Archivo ID: {summary.archivoId}</div> : null}
                <div>Relación: {option.tipoRelacionSugerida}</div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onVerValidar?.(doc)}
                >
                  {isDocumentoConfirmado(doc) ? "Ver" : "Ver / Validar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onVerVersiones?.(doc)}
                >
                  <History className="h-3.5 w-3.5" />
                  Versiones
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type VersionesDocumentoModalState = {
  documentoId: string;
  titulo: string;
  contextoLabel: string;
  archivos: DocumentoArchivoVersion[];
};

function VersionesDocumentoModal({
  state,
  loading,
  error,
  onClose,
  onPreview,
}: {
  state: VersionesDocumentoModalState | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onPreview: (archivoId: number | string) => void;
}) {
  const archivos = state?.archivos ?? [];

  return (
    <Modal
      isOpen={Boolean(state)}
      onClose={onClose}
      className="mx-4 max-w-5xl p-5 md:p-6"
    >
      <div className="space-y-4">
        <div className="pr-10">
          <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
           {state?.contextoLabel ?? "Documento"}
          </div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5" />
            Historial de versiones
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Documento {state?.documentoId ?? "—"} · {state?.titulo ?? "Documento"}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : archivos.length ? (
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Versión</th>
                  <th className="px-3 py-2 text-left">Archivo</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {archivos.map((archivo) => {
                  const actual = archivo.es_version_actual === true || String(archivo.es_version_actual).toLowerCase() === "t";
                  return (
                    <tr key={archivo.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">v{archivo.version ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">ID {archivo.id}</div>
                        {actual ? (
                          <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                            Actual
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[260px] px-3 py-2 align-top">
                        <div className="truncate font-medium">{archivo.nombre_archivo ?? "Archivo"}</div>
                        <div className="truncate text-xs text-muted-foreground">{archivo.storage_key ?? archivo.ruta_archivo ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2 align-top">{archivo.tipo_version ?? "—"}</td>
                      <td className="px-3 py-2 align-top">
                        <div>{archivo.estado ?? "—"}</div>
                        {archivo.ocr_estado ? <div className="text-xs text-muted-foreground">OCR: {archivo.ocr_estado}</div> : null}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {formatFechaVersion(archivo.creado_en)}
                      </td>
                      <td className="px-3 py-2 text-right align-top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
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
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No hay versiones registradas para este documento.
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const RUC_COMPRADOR_POR_EMPRESA: Record<string, string> = {
  BBTEC: "20299922821",
  BBTI: "20565747356",
  CIMA: "20613521004",
  TARMA: "20614307197",
  HUANCA: "20612122416",
  KIMBIRI: "20609856140",
};

function getRucComprador(expediente: any, empresa: string) {
  return text(
    expediente?.rucComprador ??
      expediente?.ruc_comprador ??
      expediente?.clienteDestinoRuc ??
      expediente?.cliente_destino_ruc ??
      expediente?.ruc ??
      RUC_COMPRADOR_POR_EMPRESA[empresa],
    "",
  );
}

function getArchivoId(source: Record<string, unknown> | null | undefined) {
  const value =
    source?.archivoId ??
    source?.archivo_id ??
    source?.id;

  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function getDocumentoId(source: Record<string, unknown> | null | undefined) {
  const value =
    source?.documentoId ??
    source?.documento_id ??
    source?.id;

  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function formatFechaVersion(value: unknown) {
  const raw = text(value, "");
  if (!raw) return "—";
  const date = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseRecordLocal(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isDocumentoConfirmado(doc: DocumentoVinculado | null | undefined) {
  const estado = text(doc?.estado ?? doc?.documento_estado ?? doc?.ocr_estado, "").toLowerCase();
  return estado === "confirmado" || estado === "validado";
}

function buildResultadoLecturaDesdeDocumento(
  doc: DocumentoVinculado,
  option: DocumentoCargaOption,
  accion: AccionCargaGuiada,
  archivoId: string,
): ProcesarOcrResultado {
  const metadataDocumento = parseRecordLocal(doc.metadata) ?? {};
  const ocrMetadata = parseRecordLocal((metadataDocumento.ocr as Record<string, unknown> | undefined)?.metadata) ?? {};
  const metadata = {
    ...ocrMetadata,
    tipoDocumental: text(doc.tipo_documental ?? doc.tipoDocumental ?? ocrMetadata.tipoDocumental, option.tipoEsperado),
    clienteAbreviatura: text(doc.cliente_abreviatura ?? doc.clienteAbreviatura ?? ocrMetadata.clienteAbreviatura, ""),
    serie: text(doc.serie ?? ocrMetadata.serie, ""),
    numero: text(doc.numero ?? ocrMetadata.numero, ""),
    fechaEmision: text(doc.fecha_emision ?? doc.fechaEmision ?? ocrMetadata.fechaEmision, ""),
    proveedor: text(doc.razon_social_emisor ?? doc.razonSocialEmisor ?? ocrMetadata.proveedor ?? ocrMetadata.razonSocial, ""),
    razonSocial: text(doc.razon_social_emisor ?? doc.razonSocialEmisor ?? ocrMetadata.razonSocial ?? ocrMetadata.proveedor, ""),
    rucEmisor: text(doc.ruc_emisor ?? doc.rucEmisor ?? ocrMetadata.rucEmisor ?? ocrMetadata.ruc, ""),
    rucProveedor: text(doc.ruc_emisor ?? doc.rucEmisor ?? ocrMetadata.rucProveedor ?? ocrMetadata.ruc, ""),
    rucComprador: text(ocrMetadata.rucComprador ?? doc.ruc_comprador ?? doc.rucComprador, ""),
    montoTotal: text(doc.monto_total ?? doc.montoTotal ?? ocrMetadata.montoTotal, ""),
    moneda: text(doc.moneda ?? ocrMetadata.moneda, ""),
    cotizacion: text(ocrMetadata.cotizacion, ""),
    codigoExpediente: text(ocrMetadata.codigoExpediente, ""),
    claveDocumental: text(doc.clave_documental ?? doc.claveDocumental ?? ocrMetadata.claveDocumental, ""),
    archivo: {
      filename: text(doc.nombre_archivo ?? doc.nombreArchivo ?? doc.filename, "Documento existente"),
      storageProvider: text(doc.storage_provider ?? doc.storageProvider, "r2"),
      storageBucket: text(doc.storage_bucket ?? doc.storageBucket, ""),
      storageKey: text(doc.storage_key ?? doc.storageKey, ""),
    },
    contextoCarga: {
      origen: "COMPRAS_EDITAR_VER_SOLO_LECTURA",
      grupo: accion.grupo,
      accion: accion.label,
      archivoId,
      filename: text(doc.nombre_archivo ?? doc.nombreArchivo ?? doc.filename, "Documento existente"),
      tipoEsperado: option.tipoEsperado,
      tipoRelacionSugerida: option.tipoRelacionSugerida,
    },
  };

  return {
    ok: true,
    documentoId: doc.documento_id ?? doc.documentoId,
    archivoId,
    tipoDocumental: text(doc.tipo_documental ?? doc.tipoDocumental, option.tipoEsperado),
    estado: text(doc.estado, "confirmado"),
    claveDocumental: text(doc.clave_documental ?? doc.claveDocumental, ""),
    tipoRelacionSugerida: option.tipoRelacionSugerida,
    metadata,
    contextoCarga: metadata.contextoCarga as Record<string, unknown>,
  };
}

function getOcrResultadoId(source: Record<string, unknown> | null | undefined) {
  const value =
    source?.ocrResultadoId ??
    source?.ocr_resultado_id ??
    source?.ocrId ??
    source?.id;

  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function getRecordValue(source: Record<string, unknown> | null | undefined, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function getTipoRelacionResultado(resultado: Record<string, unknown> | null, accion: AccionCargaGuiada | null) {
  return text(
    accion?.tipoRelacionSugerida ??
      resultado?.tipoRelacionSugerida ??
      getRecordValue(resultado, ["contextoCarga", "tipoRelacionSugerida"]) ??
      getRecordValue(resultado, ["metadata", "contextoCarga", "tipoRelacionSugerida"]),
    "adjunto_otro",
  );
}

function isRelacionPrincipal(tipoRelacion: string) {
  return isTipoRelacionPrincipal(tipoRelacion);
}

function normalizeTipoDocumentalParaBackend(tipoDocumental: string) {
  const tipo = String(tipoDocumental || "").trim().toUpperCase();

  if (tipo === "GUIA" || tipo === "GUÍA") return "GUIA_REMISION";

  return tipo;
}

function getTipoRelacionPorTipoDocumental(
  tipoDocumental: string,
  grupo: AccionCargaGuiada["grupo"] | undefined,
  fallback: string,
) {
  const tipo = normalizeTipoDocumentalParaBackend(tipoDocumental);
  const isPrincipal = grupo === "principal" || isRelacionPrincipal(fallback);

  if (isPrincipal) {
    if (tipo === "OC") return "principal_oc";
    if (tipo === "OS") return "principal_os";
    if (tipo === "FACTURA") return "principal_factura";
    return fallback || "principal_factura";
  }

  if (tipo === "FACTURA") return "adjunto_factura";
  if (tipo === "GUIA_REMISION") return "adjunto_guia";
  if (tipo === "NOTA_INGRESO") return "adjunto_nota_ingreso";
  if (tipo === "RECIBO_HONORARIO") return "adjunto_recibo_honorario";
  if (tipo === "TRANSFERENCIA") return "adjunto_transferencia";
  if (tipo === "DETRACCION") return "adjunto_detraccion";

  return fallback || "adjunto_otro";
}

function tienePrincipalActivo(documentos?: DocumentoVinculado[]) {
  return Boolean(documentos?.some((doc) => doc.es_principal === true || String(doc.es_principal).toLowerCase() === "true" || String(doc.es_principal).toLowerCase() === "t"));
}

function normalizeAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  return normalized || undefined;
}

function emptyToUndefined(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function buildMetadataDesdeFormulario(
  form: OcrValidationFormState,
  context: {
    codigoExpediente?: string;
    rucComprador?: string;
    clienteAbreviatura?: string;
    expedienteId?: string | number;
    tipoRelacion?: string;
  },
) {
  const tipo = normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || ""));
  const codigoExpediente = emptyToUndefined(form.codigoExpediente) ?? emptyToUndefined(context.codigoExpediente);
  const rucComprador = emptyToUndefined(form.rucComprador) ?? emptyToUndefined(context.rucComprador);
  const rucEmisor = emptyToUndefined(form.rucEmisor);
  const rucProveedor = emptyToUndefined(form.rucProveedor) ?? rucEmisor;
  const razonSocial = emptyToUndefined(form.razonSocial);
  const proveedor = emptyToUndefined(form.proveedor) ?? razonSocial;

  return {
    tipoDocumental: tipo,
    clienteAbreviatura: emptyToUndefined(context.clienteAbreviatura),
    numero: emptyToUndefined(form.numero),
    serie: emptyToUndefined(form.serie),
    fechaEmision: emptyToUndefined(form.fechaEmision),
    proveedor,
    razonSocial,
    ruc: tipo === "FACTURA" || tipo === "GUIA_REMISION" ? rucEmisor ?? rucProveedor : undefined,
    rucEmisor,
    rucProveedor,
    rucComprador,
    montoTotal: normalizeAmount(form.montoTotal),
    moneda: emptyToUndefined(form.moneda),
    cotizacion: emptyToUndefined(form.cotizacion),
    codigoExpediente,
    claveDocumental: emptyToUndefined(form.claveDocumental),
    documentoRelacionado: emptyToUndefined(form.documentoRelacionado),
    contextoValidacion: {
      origen: "COMPRAS_EDITAR_MODAL",
      expedienteId: context.expedienteId,
      codigoExpediente,
      tipoRelacionSugerida: context.tipoRelacion,
      confirmadoDesde: "compras_editar",
    },
  };
}

function buildResultadoConContexto(
  resultado: ProcesarOcrResultado,
  accion: AccionCargaGuiada,
  extra: {
    archivoId: string;
    filename: string;
    uploadResponse: Record<string, unknown>;
  },
) {
  const metadataOriginal = resultado.metadata;
  const metadata =
    metadataOriginal && typeof metadataOriginal === "object" && !Array.isArray(metadataOriginal)
      ? metadataOriginal
      : {};

  return {
    ...resultado,
    archivoId: resultado.archivoId ?? extra.archivoId,
    tipoRelacionSugerida: accion.tipoRelacionSugerida,
    contextoCarga: {
      origen: "COMPRAS_EDITAR_UPLOAD",
      grupo: accion.grupo,
      accion: accion.label,
      archivoId: extra.archivoId,
      filename: extra.filename,
      tipoEsperado: accion.tipoEsperado,
      tipoRelacionSugerida: accion.tipoRelacionSugerida,
      confiabilidad: accion.confiabilidad,
      upload: extra.uploadResponse,
    },
    metadata: {
      ...metadata,
      contextoCarga: {
        origen: "COMPRAS_EDITAR_UPLOAD",
        grupo: accion.grupo,
        accion: accion.label,
        archivoId: extra.archivoId,
        filename: extra.filename,
        tipoEsperado: accion.tipoEsperado,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
        confiabilidad: accion.confiabilidad,
        upload: extra.uploadResponse,
      },
    },
  };
}

export function CompraExpedienteEditor({ id }: { id: string | number }) {
  const queryClient = useQueryClient();
  const { data: expediente, isLoading, error } = useExpediente(id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalSoloLectura, setModalSoloLectura] = useState(false);
  const [resultadoModal, setResultadoModal] = useState<ProcesarOcrResultado | null>(null);
  const [accionActual, setAccionActual] = useState<AccionCargaGuiada | null>(null);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<OcrProcessingStep>("idle");
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [versionesModal, setVersionesModal] = useState<VersionesDocumentoModalState | null>(null);
  const [versionesLoading, setVersionesLoading] = useState(false);
  const [versionesError, setVersionesError] = useState<string | null>(null);

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", String(id)],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get(`/expedientes/${id}/documentos`);
      return unwrapDocumentos(data);
    },
  });

  const documentosPorRelacion = useMemo(
    () => getDocumentosPorRelacion(documentosQuery.data ?? []),
    [documentosQuery.data],
  );
  const principalActual = useMemo(
    () => pickDocumentoPrincipalActual(documentosPorRelacion),
    [documentosPorRelacion],
  );
  const principalActualRelacion = principalActual?.option.tipoRelacionSugerida ?? "";

  const cargaRealMutation = useMutation<
    ProcesarOcrResultado,
    Error,
    UploadYProcesarArgs
  >({
    mutationFn: async ({ accion, file }) => {
      setProcessingFileName(file.name);
      setProcessingError(null);
      setProcessingStep("uploading");
      const clienteAbreviatura = text(
        (expediente as any)?.empresa_codigo ??
          (expediente as any)?.empresaCodigo ??
          (expediente as any)?.cliente_abreviatura ??
          (expediente as any)?.clienteAbreviatura,
        "",
      );

      if (!clienteAbreviatura) {
        throw new Error("No se pudo resolver clienteAbreviatura del expediente.");
      }

      const uploadPayload: CargaGuiadaPayloadPreview = {
        areaOrigen: "COMPRAS",
        clienteAbreviatura,
        tipoEsperado: accion.tipoEsperado as CargaGuiadaPayloadPreview["tipoEsperado"],
        expedienteId: id,
        tipoRelacionSugerida: accion.tipoRelacionSugerida as CargaGuiadaPayloadPreview["tipoRelacionSugerida"],
        canalIngreso: "COMPRAS_EDITAR_UPLOAD",
        observacion: `Carga desde Compras Editar: ${accion.grupo} - ${accion.label}`,
      };

      const uploadResponse = await subirDocumentoGuiado(uploadPayload, file);
      const archivoId = getArchivoId(uploadResponse as Record<string, unknown>);

      if (!archivoId) {
        throw new Error("El upload no devolvió archivoId.");
      }

      setProcessingStep("processing_ocr");

      const ocrPayload = {
        tipoEsperado: accion.tipoEsperado,
        areaOrigen: "COMPRAS",
        clienteAbreviatura,
        expedienteId: id,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
        canalIngreso: "COMPRAS_EDITAR_UPLOAD",
        reprocesar: true,
      };

      const resultado = await procesarArchivoOcr(archivoId, ocrPayload);
      setProcessingStep("preparing_preview");

      return buildResultadoConContexto(resultado, accion, {
        archivoId,
        filename: file.name,
        uploadResponse: uploadResponse as Record<string, unknown>,
      });
    },
    onSuccess: (resultado, { accion }) => {
      setAccionActual(accion);
      setResultadoModal(resultado);
      setModalSoloLectura(false);
      setMensajeValidacion(null);
      setProcessingStep("ready");
      queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });

      window.setTimeout(() => {
        setProcessingStep("idle");
        setModalAbierto(true);
      }, 450);
    },
    onError: (err, { accion }) => {
      setAccionActual(accion);
      const message = `No se pudo cargar/procesar OCR para ${accion.label}. Revisa Gateway, ms-documentos, R2 o NATS. ${err.message}`;
      setProcessingStep("error");
      setProcessingError(message);
      setMensajeValidacion(message);
    },
  });

  function iniciarSeleccionArchivo(option: DocumentoCargaOption, grupo: AccionCargaGuiada["grupo"]) {
    setAccionActual({
      ...option,
      grupo,
    });
    setMensajeValidacion(null);
    fileInputRef.current?.click();
  }

  function onArchivoSeleccionado(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file || !accionActual) return;

    cargaRealMutation.mutate({
      accion: accionActual,
      file,
    });
  }


  async function abrirDocumentoExistente(doc: DocumentoVinculado, option: DocumentoCargaOption) {
    const archivoId = getArchivoId({
      archivoId: doc.archivoId ?? doc.archivo_id,
    });

    if (!archivoId) {
      setMensajeValidacion("El documento seleccionado no tiene archivo asociado para validar.");
      return;
    }

    const accion: AccionCargaGuiada = {
      ...option,
      grupo: option.tipoRelacionSugerida.startsWith("principal_") ? "principal" : "adjunto",
    };

    const clienteAbreviatura = text(
      (expediente as any)?.empresa_codigo ??
        (expediente as any)?.empresaCodigo ??
        (expediente as any)?.cliente_abreviatura ??
        (expediente as any)?.clienteAbreviatura,
      "",
    );

    if (!clienteAbreviatura) {
      setMensajeValidacion("No se pudo resolver clienteAbreviatura del expediente.");
      return;
    }

    setAccionActual(accion);
    setMensajeValidacion(null);

    if (isDocumentoConfirmado(doc)) {
      setResultadoModal(buildResultadoLecturaDesdeDocumento(doc, option, accion, archivoId));
      setModalSoloLectura(true);
      setProcessingStep("idle");
      setProcessingError(null);
      setModalAbierto(true);
      return;
    }

    setModalSoloLectura(false);
    setProcessingFileName(text(doc.nombre_archivo ?? doc.nombreArchivo ?? doc.filename, "Documento existente"));
    setProcessingError(null);
    setProcessingStep("processing_ocr");

    try {
      const ocrPayload = {
        tipoEsperado: option.tipoEsperado,
        areaOrigen: "COMPRAS",
        clienteAbreviatura,
        expedienteId: id,
        tipoRelacionSugerida: option.tipoRelacionSugerida,
        canalIngreso: "COMPRAS_EDITAR_VER_VALIDAR",
        reprocesar: false,
      };

      const resultado = await procesarArchivoOcr(archivoId, ocrPayload);
      setProcessingStep("preparing_preview");

      const metadataOriginal = resultado.metadata;
      const metadata =
        metadataOriginal && typeof metadataOriginal === "object" && !Array.isArray(metadataOriginal)
          ? metadataOriginal
          : {};

      setModalSoloLectura(false);
      setResultadoModal({
        ...resultado,
        archivoId: resultado.archivoId ?? archivoId,
        documentoId: resultado.documentoId ?? doc.documento_id ?? doc.documentoId,
        tipoDocumental: resultado.tipoDocumental ?? String(doc.tipo_documental ?? doc.tipoDocumental ?? option.tipoEsperado),
        tipoRelacionSugerida: option.tipoRelacionSugerida,
        metadata: {
          ...metadata,
          contextoCarga: {
            origen: "COMPRAS_EDITAR_VER_VALIDAR",
            grupo: accion.grupo,
            accion: accion.label,
            archivoId,
            filename: text(doc.nombre_archivo ?? doc.nombreArchivo ?? doc.filename, "Documento existente"),
            tipoEsperado: option.tipoEsperado,
            tipoRelacionSugerida: option.tipoRelacionSugerida,
          },
        },
        contextoCarga: {
          ...(typeof resultado.contextoCarga === "object" && resultado.contextoCarga !== null
            ? (resultado.contextoCarga as Record<string, unknown>)
            : {}),
          origen: "COMPRAS_EDITAR_VER_VALIDAR",
          grupo: accion.grupo,
          accion: accion.label,
          archivoId,
          filename: text(doc.nombre_archivo ?? doc.nombreArchivo ?? doc.filename, "Documento existente"),
          tipoEsperado: option.tipoEsperado,
          tipoRelacionSugerida: option.tipoRelacionSugerida,
        },
      } as ProcesarOcrResultado);

      setProcessingStep("ready");
      queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });

      window.setTimeout(() => {
        setProcessingStep("idle");
        setModalAbierto(true);
      }, 350);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "No se pudo abrir la validación OCR del documento existente.";
      setProcessingStep("error");
      setProcessingError(message);
      setMensajeValidacion(message);
    }
  }

  async function abrirHistorialVersiones(doc: DocumentoVinculado, option: DocumentoCargaOption) {
    const documentoId = getDocumentoId(doc);

    if (!documentoId) {
      setMensajeValidacion("No se pudo resolver el documento para consultar versiones.");
      return;
    }

    const summary = getDocumentoSummary(doc, option);
    const contextoLabel = option.tipoRelacionSugerida.startsWith("principal_") ? `Documento principal · ${option.label}` : `Adjunto de compras · ${option.label}`;
    setVersionesModal({
      documentoId,
      titulo: summary.title,
      contextoLabel,
      archivos: [],
    });
    setVersionesLoading(true);
    setVersionesError(null);

    try {
      const response = await getDocumentoArchivos(documentoId);
      setVersionesModal({
        documentoId,
        titulo: summary.title,
        contextoLabel,
        archivos: response.data ?? [],
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "No se pudo cargar el historial de versiones.";
      setVersionesError(message);
    } finally {
      setVersionesLoading(false);
    }
  }

  async function abrirPreviewVersion(archivoId: number | string) {
    try {
      const { data } = await api.get(`/documentos/archivos/${archivoId}/preview-url`);
      const signedUrl = data?.data?.signedUrl ?? data?.signedUrl;

      if (!signedUrl) {
        throw new Error("No se recibió URL temporal para previsualizar el archivo.");
      }

      window.open(String(signedUrl), "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "No se pudo abrir la versión seleccionada.";
      setVersionesError(message);
    }
  }

  if (isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (error || !expediente) {
    return <main className="p-6 text-red-600">No se pudo cargar el expediente.</main>;
  }

  const codigo = text(expediente.codigo_expediente ?? expediente.codigoExpediente, "");
  const empresa = text(expediente.empresa_codigo ?? expediente.empresaCodigo, "");
  const rucComprador = getRucComprador(expediente, empresa);
  const descripcion = descripcionAmigable(expediente);
  const procesando = cargaRealMutation.isPending;
  const archivoIdModal = getArchivoId(resultadoModal as Record<string, unknown> | null) ?? undefined;

  async function persistirEdicionOcr(form: OcrValidationFormState, observacion: string) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para guardar la validación.");
    }

    const tipoRelacion = getTipoRelacionResultado(resultadoActual, accionActual);
    const metadata = buildMetadataDesdeFormulario(form, {
      codigoExpediente: codigo,
      rucComprador,
      clienteAbreviatura: empresa,
      expedienteId: id,
      tipoRelacion,
    });

    await editarOcrResultado(ocrResultadoId, {
      tipoPropuesto: normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || accionActual?.tipoEsperado || "")),
      metadata,
      observacion,
    });

    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });

    return {
      ocrResultadoId,
      tipoRelacion,
      metadata,
    };
  }

  async function guardarCambiosOcr(form: OcrValidationFormState) {
    await persistirEdicionOcr(form, "Edición manual desde Compras > Editar");
    setMensajeValidacion(`Cambios OCR guardados para ${accionActual?.label ?? "documento"}.`);
  }

  async function confirmarOcrFinal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para confirmar la validación.");
    }

    const codigoExpedienteFinal = text(form.codigoExpediente, codigo);

    if (!codigoExpedienteFinal) {
      throw new Error("El expediente es obligatorio antes de confirmar.");
    }

    const tipoRelacionBase = getTipoRelacionResultado(resultadoActual, accionActual);
    const tipoRelacionFinal = getTipoRelacionPorTipoDocumental(
      normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || accionActual?.tipoEsperado || "")),
      accionActual?.grupo,
      tipoRelacionBase,
    );

    const metadata = buildMetadataDesdeFormulario(
      {
        ...form,
        codigoExpediente: codigoExpedienteFinal,
        rucComprador: text(form.rucComprador, rucComprador),
      },
      {
        codigoExpediente: codigoExpedienteFinal,
        rucComprador,
        clienteAbreviatura: empresa,
        expedienteId: id,
        tipoRelacion: tipoRelacionFinal,
      },
    );

    const esPrincipalFinal = isRelacionPrincipal(tipoRelacionFinal);

    await confirmarOcrConExpediente(ocrResultadoId, {
      expedienteId: id,
      tipoRelacion: tipoRelacionFinal,
      esPrincipal: esPrincipalFinal,
      orden: esPrincipalFinal ? 1 : 10,
      metadata,
      observacion: esPrincipalFinal
        ? "Guardar y confirmar principal desde Compras > Editar"
        : "Guardar y confirmar adjunto desde Compras > Editar",
    });

    setModalAbierto(false);
    setMensajeValidacion(`OCR confirmado y vinculado al expediente ${codigoExpedienteFinal}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
  }

  async function agregarDuplicadoComoVersion(details: { documentoIdExistente?: number | string; archivoIdActual?: number | string }) {
    const documentoIdExistente = details.documentoIdExistente;
    const archivoIdActual = details.archivoIdActual;

    if (!documentoIdExistente || !archivoIdActual) {
      throw new Error("No se encontró el documento existente o el archivo nuevo para agregar como versión.");
    }

    await agregarArchivoComoVersion(documentoIdExistente, archivoIdActual, {
      tipoVersion: "escaneado",
      observacion: "Archivo duplicado agregado como versión desde Compras > Editar",
      marcarComoActual: true,
    });

    setModalAbierto(false);
    setMensajeValidacion(`Archivo agregado como nueva versión del documento ${documentoIdExistente}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
  }

  async function rechazarOcrFinal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para rechazar el OCR.");
    }

    await rechazarOcrResultado(
      ocrResultadoId,
      `Rechazado desde Compras > Editar. Tipo: ${form.tipoDocumental}. Documento: ${form.serie ? `${form.serie}-` : ""}${form.numero || "sin número"}`,
    );

    setModalAbierto(false);
    setMensajeValidacion(`OCR rechazado para ${accionActual?.label ?? "documento"}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={onArchivoSeleccionado}
      />

      <main className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-1 px-0">
              <Link href="/compras">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Compras</h1>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{codigo || "SIN EXPEDIENTE"}</span>
              {empresa ? <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{empresa}</span> : null}
            </div>
            {descripcion ? <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p> : null}
          </div>
        </div>

        {mensajeValidacion ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {mensajeValidacion}
          </div>
        ) : null}

        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-8">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Empresa</label>
              <Input value={empresa} readOnly />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Expediente</label>
              <Input value={codigo || "SIN EXPEDIENTE"} readOnly />
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <Input defaultValue={descripcion} placeholder="Descripción del expediente" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Documento principal</CardTitle>
              {principalActual ? (
                <span className="rounded-full border bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                  Actual: {principalActual.option.label}
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {DOCUMENTO_PRINCIPAL_OPTIONS.map((item) => {
                const documentosItem = documentosPorRelacion.get(item.tipoRelacionSugerida);
                const principalActivo = principalActualRelacion === item.tipoRelacionSugerida;

                return (
                <div
                  key={item.tipoRelacionSugerida}
                  className={`rounded-xl border p-4 transition ${principalActivo ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{item.label}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.tipoEsperado}
                      </span>
                      {principalActivo ? (
                        <span className="rounded-full border border-primary bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                          Principal actual
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <DocumentoExistenteResumen
                    documentos={documentosItem}
                    option={item}
                    onVerValidar={(doc) => abrirDocumentoExistente(doc, item)}
                    onVerVersiones={(doc) => abrirHistorialVersiones(doc, item)}
                    mostrarContenido={principalActivo}
                  />

                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    size="sm"
                    disabled={procesando}
                    onClick={() => iniciarSeleccionArchivo(item, "principal")}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {procesando && accionActual?.tipoRelacionSugerida === item.tipoRelacionSugerida
                      ? "Subiendo/procesando..."
                      : principalActivo
                        ? "Reemplazar principal"
                        : "Cargar como principal"}
                  </Button>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjuntos de Compras</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {DOCUMENTO_ADJUNTO_OPTIONS.map((item) => (
              <div key={item.tipoRelacionSugerida} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.label}</div>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item.tipoEsperado}
                  </span>
                </div>

                <DocumentoAdjuntoRelacionResumen
                  option={item}
                  documentos={documentosPorRelacion.get(item.tipoRelacionSugerida)}
                  onVerValidar={(doc) => abrirDocumentoExistente(doc, item)}
                  onVerVersiones={(doc) => abrirHistorialVersiones(doc, item)}
                />

                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  size="sm"
                  disabled={procesando}
                  onClick={() => iniciarSeleccionArchivo(item, "adjunto")}
                >
                  <FilePlus2 className="h-4 w-4" />
                  {procesando && accionActual?.tipoRelacionSugerida === item.tipoRelacionSugerida
                    ? "Subiendo/procesando..."
                    : documentosPorRelacion.get(item.tipoRelacionSugerida)?.length
                      ? "Adjuntar otro"
                      : "Adjuntar"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>


      <OcrProcessingDialog
        open={processingStep !== "idle"}
        step={processingStep}
        filename={processingFileName}
        documentLabel={accionActual?.label}
        errorMessage={processingError}
        onClose={() => {
          setProcessingStep("idle");
          setProcessingError(null);
        }}
      />

      <VersionesDocumentoModal
        state={versionesModal}
        loading={versionesLoading}
        error={versionesError}
        onClose={() => {
          setVersionesModal(null);
          setVersionesError(null);
        }}
        onPreview={abrirPreviewVersion}
      />

      <OcrValidationModal
        open={modalAbierto}
        resultado={resultadoModal}
        fallbackArchivoId={archivoIdModal}
        expedienteContexto={{
          id,
          codigo,
          descripcion,
          empresa,
          rucComprador,
        }}
        onClose={() => setModalAbierto(false)}
        onSave={guardarCambiosOcr}
        onConfirm={confirmarOcrFinal}
        onReject={rechazarOcrFinal}
        onAgregarComoVersion={agregarDuplicadoComoVersion}
        readOnly={modalSoloLectura}
      />
    </>
  );
}
