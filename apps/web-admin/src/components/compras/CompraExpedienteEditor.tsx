"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { prevalidarDocumentoGuiado } from "@/services/carga-guiada";
import {
  crearCargaSeguraIdempotencyKey,
  subirDocumentoCargaSegura,
} from "@/services/carga-segura";
import { api } from "@/services/api";
import { buscarProveedoresCatalogo } from "@/services/ocr-procesamiento";
import {
  actualizarDocumentoManual,
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
import type { CargaGuiadaPayloadPreview, CargaGuiadaPrevalidacionResponse } from "@/types/carga-guiada";

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

type PrevalidacionExistenteUI = {
  documentoId?: string | number | null;
  archivoId?: string | number | null;
  expedienteId?: string | number | null;
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

function normalizeDocumentoId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function getDocumentoBaseId(doc: DocumentoVinculado | null | undefined): number | null {
  if (!doc) return null;

  const ocr = doc.metadata?.ocr;
  const audit = Array.isArray(ocr?.audit) ? ocr.audit : [];
  const ultimoAudit = audit.length ? audit[audit.length - 1] : null;

  const candidatos = [
    doc.documentoBaseId,
    doc.documento_base_id,
    doc.documentoPrincipalId,
    doc.documento_principal_id,
    doc.metadata?.documentoBaseId,
    ocr?.metadata?.documentoBaseId,
    ocr?.contextoCarga?.documentoBaseId,
    ocr?.contextoValidacion?.documentoBaseId,
    ultimoAudit?.cambios?.metadata?.documentoBaseId,
    ultimoAudit?.cambios?.contextoValidacion?.documentoBaseId,
  ];

  for (const candidato of candidatos) {
    const id = normalizeDocumentoId(candidato);
    if (id !== null) return id;
  }

  return null;
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

function isDocumentoPrincipalActivo(doc: DocumentoVinculado | null | undefined) {
  if (!doc) return false;
  return (
    doc.esPrincipal === true ||
    doc.es_principal === true ||
    String(doc.esPrincipal ?? "").toLowerCase() === "true" ||
    String(doc.es_principal ?? "").toLowerCase() === "true" ||
    String(doc.es_principal ?? "").toLowerCase() === "t"
  );
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
  documentos: DocumentoVinculado[],
) {
  const candidatos = documentos
    .filter(isDocumentoPrincipalActivo)
    .map((doc) => {
      const relacion = getRelacion(doc);
      const option =
        DOCUMENTO_PRINCIPAL_OPTIONS.find((item) => item.tipoRelacionSugerida === relacion) ??
        DOCUMENTO_PRINCIPAL_OPTIONS.find((item) => item.tipoEsperado === text(doc.tipo_documental ?? doc.tipoDocumental, "")) ??
        DOCUMENTO_PRINCIPAL_OPTIONS[0];
      const visual = getDocumentoVisualState(doc);
      const estado = String((visual as any).state ?? doc.estado ?? doc.archivo_estado ?? "");
      return {
        option,
        doc,
        relacion,
        prioridad: ESTADO_VISUAL_PRIORIDAD[estado] ?? 0,
        createdTime: getCreatedTime(doc),
      };
    })
    .filter(Boolean) as Array<{
      option: DocumentoCargaOption;
      doc: DocumentoVinculado;
      relacion: string;
      prioridad: number;
      createdTime: number;
    }>;

  if (!candidatos.length) return null;

  return candidatos.sort((a, b) => {
    if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
    return b.createdTime - a.createdTime;
  })[0];
}

function prevalidacionCargaMessage(resultado: CargaGuiadaPrevalidacionResponse) {
  const accion = String(resultado.accionSugerida ?? "");
  const motivo = String(resultado.motivo ?? "");
  const duplicado = resultado.duplicados?.[0];
  const principal = resultado.principalActivo;

  if (accion === "abrir_existente" || resultado.duplicadoArchivo || motivo.includes("DUPLICADO")) {
    return [
      "Este archivo ya fue cargado anteriormente. Puedes abrir el documento existente.",
      duplicado?.documentoId ? `Documento existente: ${duplicado.documentoId}.` : null,
      duplicado?.archivoId ? `Archivo existente: ${duplicado.archivoId}.` : null,
      duplicado?.expedienteId ? `Centro de costo vinculado: ${duplicado.expedienteId}.` : null,
      "No se volvió a subir a R2.",
    ].filter(Boolean).join("\n");
  }

  if (accion === "bloquear" && motivo === "PRINCIPAL_ACTIVO_EXISTENTE") {
    const tipoPrincipal = String(
      principal?.tipoDocumental ?? resultado.tipoEsperado ?? "",
    ).toUpperCase();

    const etiquetaPrincipal =
      tipoPrincipal === "OC"
        ? "Orden de Compra"
        : tipoPrincipal === "OS"
          ? "Orden de Servicio"
          : tipoPrincipal === "FACTURA"
            ? "Factura"
            : "documento";

    return [
      `Este expediente ya contiene una ${etiquetaPrincipal} principal activa.`,
      principal?.numero
        ? `${etiquetaPrincipal} actual: ${String(principal.numero)}.`
        : null,
      "El nuevo documento debe registrarse como una operación independiente antes de asociar facturas, guías u otros documentos.",
      "No se reemplazará automáticamente el documento existente.",
    ].filter(Boolean).join("\n");
  }

  if (resultado.codigoExpedienteCoincide === false || motivo === "CODIGO_EXPEDIENTE_NO_COINCIDE") {
    return [
      "El código detectado en el documento no coincide con el centro de costo seleccionado.",
      resultado.codigoExpedienteSeleccionado ? `Centro de costo seleccionado: ${resultado.codigoExpedienteSeleccionado}.` : null,
      resultado.codigoExpedienteDetectado ? `Código detectado en documento: ${resultado.codigoExpedienteDetectado}.` : null,
    ].filter(Boolean).join("\n");
  }

  if (accion === "vincular_existente") {
    return "El documento ya existe. La vinculación de existentes queda pendiente de contrato funcional.";
  }

  if (accion === "requiere_confirmacion") {
    return "La prevalidación requiere confirmación explícita. No se continuará automáticamente.";
  }

  return "La prevalidación no autorizó continuar con la carga.";
}

function toIdValue(value: unknown): string | number | null | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (value === null || value === undefined) {
    return value;
  }

  return undefined;
}

function getPrevalidacionExistente(
  resultado: CargaGuiadaPrevalidacionResponse,
): PrevalidacionExistenteUI | null {
  const duplicado = resultado.duplicados?.[0];
  const documentoExistente =
    resultado.documentoExistente as Record<string, unknown> | null | undefined;
  const principalActivo =
    resultado.principalActivo as Record<string, unknown> | null | undefined;

  const documentoId =
    toIdValue(duplicado?.documentoId) ??
    toIdValue(documentoExistente?.documentoId) ??
    toIdValue(documentoExistente?.documento_id) ??
    toIdValue(documentoExistente?.id) ??
    toIdValue(principalActivo?.documentoId) ??
    toIdValue(principalActivo?.documento_id) ??
    toIdValue(resultado.documentoId);

  const archivoId =
    toIdValue(duplicado?.archivoId) ??
    toIdValue(documentoExistente?.archivoId) ??
    toIdValue(documentoExistente?.archivo_id);

  const expedienteId =
    toIdValue(duplicado?.expedienteId) ??
    toIdValue(documentoExistente?.expedienteId) ??
    toIdValue(documentoExistente?.expediente_id) ??
    toIdValue(resultado.expedienteId);

  if (!documentoId && !archivoId && !expedienteId) return null;

  return { documentoId, archivoId, expedienteId };
}

class PrevalidacionDetuvoCarga extends Error {
  existente: PrevalidacionExistenteUI | null;

  constructor(message: string, existente: PrevalidacionExistenteUI | null) {
    super(message);
    this.name = "PrevalidacionDetuvoCarga";
    this.existente = existente;
  }
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
      </div>

      <div
        className={`mt-2 grid gap-2 ${
          isOcosPrincipalOption(option) ? "sm:grid-cols-1" : "sm:grid-cols-2"
        }`}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onVerValidar?.(principal)}
        >
          {isDocumentoConfirmado(principal) ? "Ver" : "Ver / Validar"}
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


function formatMontoHumano(value: unknown, moneda: unknown) {
  const numero = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(numero)) return "";

  const codigoMoneda = text(moneda, "").toUpperCase();
  const prefijo =
    codigoMoneda === "SOLES" || codigoMoneda === "PEN"
      ? "S/"
      : codigoMoneda === "USD" || codigoMoneda === "DOLARES"
        ? "US$"
        : codigoMoneda
          ? `${codigoMoneda} `
          : "";

  return `${prefijo} ${numero.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
}

function formatFechaHumana(value: unknown) {
  const raw = text(value, "");
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

function DocumentoHumanoCard({
  doc,
  option,
  onVer,
  onValidar,
  onEditar,
  onVersiones,
  readOnly = false,
}: {
  doc: DocumentoVinculado;
  option: DocumentoCargaOption;
  onVer: (doc: DocumentoVinculado) => void;
  onValidar?: (doc: DocumentoVinculado) => void;
  onEditar?: (doc: DocumentoVinculado) => void;
  onVersiones?: (doc: DocumentoVinculado) => void;
  readOnly?: boolean;
}) {
  const visual = getDocumentoVisualState(doc);
  const summary = getDocumentoSummary(doc, option);
  const proveedor = pickDocValue(doc, ["razon_social_emisor", "razonSocialEmisor"], "");
  const ruc = pickDocValue(doc, ["ruc_emisor", "rucEmisor"], "");
  const monto = formatMontoHumano(doc.monto_total ?? doc.montoTotal, doc.moneda);
  const fecha = formatFechaHumana(doc.fecha_emision ?? doc.fechaEmision);
  const detalle = [monto, fecha].filter(Boolean).join(" · ");

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">
            {option.tipoRelacionSugerida === "adjunto_factura"
              ? summary.title.replace(/^FACTURA\s*[·-]?\s*/i, "")
              : summary.title}
          </div>
          {proveedor ? (
            <div
              className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground"
              title={proveedor}
            >
              {proveedor}
            </div>
          ) : null}
          {ruc ? <div className="mt-1 text-xs text-muted-foreground">RUC {ruc}</div> : null}
          {detalle ? (
            <div className="mt-1 text-sm text-muted-foreground">{detalle}</div>
          ) : summary.details ? (
            <div className="mt-1 text-sm text-muted-foreground">{summary.details}</div>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${visual.badgeClassName}`}>
          {visual.label}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onVer(doc)}>
          Ver
        </Button>
        {!readOnly && (isOcosPrincipalOption(option) || isFacturaOption(option)) ? (
          isDocumentoConfirmado(doc) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditar?.(doc)}
            >
              Editar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onValidar?.(doc)}
            >
              Validar
            </Button>
          )
        ) : null}
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

export function VersionesDocumentoModal({
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

function getDocumentoId(
  source: Record<string, unknown> | null | undefined,
): number | null {
  const value =
    source?.documentoId ??
    source?.documento_id ??
    source?.id;

  if (value === null || value === undefined || value === "") return null;

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getDocumentoPrincipalLabel(
  source: Record<string, unknown> | null | undefined,
): string {
  const tipo = text(
    source?.tipoDocumental ??
      source?.tipo_documental ??
      source?.tipo ??
      source?.tipoPrincipal,
    "Documento principal",
  );
  const serie = text(
    source?.serie ??
      source?.serieDocumento ??
      source?.serie_documento,
    "",
  );
  const numero = text(
    source?.numero ??
      source?.numeroDocumento ??
      source?.numero_documento ??
      source?.codigoDocumento ??
      source?.codigo_documento,
    "",
  );

  const identidad = [serie, numero].filter(Boolean).join("-");
  return identidad ? `${tipo} ${identidad}` : tipo;
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

function isOcosPrincipalOption(option: DocumentoCargaOption) {
  return (
    option.tipoRelacionSugerida === "principal_oc" ||
    option.tipoRelacionSugerida === "principal_os"
  );
}

function isFacturaOption(option: DocumentoCargaOption) {
  return option.tipoRelacionSugerida === "adjunto_factura";
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
  return Boolean(documentos?.some(isDocumentoPrincipalActivo));
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
    documentoBaseId?: number | null;
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
      documentoBaseId: context.documentoBaseId ?? null,
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

export function CompraExpedienteEditor({
  id,
  modoSoloLectura = false,
}: {
  id: string | number;
  modoSoloLectura?: boolean;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: expediente, isLoading, error } = useExpediente(id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalSoloLectura, setModalSoloLectura] = useState(false);
  const [resultadoModal, setResultadoModal] = useState<ProcesarOcrResultado | null>(null);
  const [accionActual, setAccionActual] = useState<AccionCargaGuiada | null>(null);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(null);
  const [prevalidacionExistente, setPrevalidacionExistente] = useState<PrevalidacionExistenteUI | null>(null);
  const [processingStep, setProcessingStep] = useState<OcrProcessingStep>("idle");
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [versionesModal, setVersionesModal] = useState<VersionesDocumentoModalState | null>(null);
  const [versionesLoading, setVersionesLoading] = useState(false);
  const [versionesError, setVersionesError] = useState<string | null>(null);
  const [edicionOcos, setEdicionOcos] = useState<{
    doc: DocumentoVinculado;
    option: DocumentoCargaOption;
    documentoId: string;
    archivoId: string;
    ocrResultadoId: string | null;
    numero: string;
    fechaEmision: string;
    proveedor: string;
    rucEmisor: string;
    montoTotal: string;
    moneda: string;
    cotizacion: string;
    saving: boolean;
    error: string | null;
  } | null>(null);
  const [edicionFactura, setEdicionFactura] = useState<{
    doc: DocumentoVinculado;
    option: DocumentoCargaOption;
    documentoId: string;
    archivoId: string;
    ocrResultadoId: string;
    numero: string;
    serie: string;
    fechaEmision: string;
    proveedor: string;
    rucEmisor: string;
    montoTotal: string;
    moneda: string;
    saving: boolean;
    error: string | null;
  } | null>(null);

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", String(id)],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get(`/expedientes/${id}/documentos`);
      return unwrapDocumentos(data);
    },
  });

  const documentosPrincipales = useMemo(
    () =>
      (documentosQuery.data ?? [])
        .filter(isDocumentoPrincipalActivo)
        .filter((doc) => {
          const tipo = text(
            doc.tipo_documental ?? doc.tipoDocumental,
            "",
          ).toUpperCase();
          return tipo === "OC" || tipo === "OS";
        }),
    [documentosQuery.data],
  );

  const principalIdParam = searchParams.get("principalId");
  const principalIdSeleccionado = principalIdParam
    ? Number(principalIdParam)
    : null;

  const principalSeleccionado = useMemo(
    () =>
      documentosPrincipales.find(
        (doc) => getDocumentoId(doc) === principalIdSeleccionado,
      ) ?? null,
    [documentosPrincipales, principalIdSeleccionado],
  );

  const documentosAdjuntos = useMemo(
    () =>
      (documentosQuery.data ?? []).filter(
        (doc) => !isDocumentoPrincipalActivo(doc),
      ),
    [documentosQuery.data],
  );

  const documentosDelPrincipalSeleccionado = useMemo(() => {
    const principalId = getDocumentoId(principalSeleccionado);
    if (!principalId) return [];

    return documentosAdjuntos.filter(
      (doc) => getDocumentoBaseId(doc) === principalId,
    );
  }, [documentosAdjuntos, principalSeleccionado]);

  const documentosSinPrincipal = useMemo(
    () =>
      documentosAdjuntos.filter(
        (doc) => getDocumentoBaseId(doc) === null,
      ),
    [documentosAdjuntos],
  );

  const documentosPorRelacion = useMemo(
    () => getDocumentosPorRelacion(documentosDelPrincipalSeleccionado),
    [documentosDelPrincipalSeleccionado],
  );

  const documentosSinPrincipalPorRelacion = useMemo(
    () => getDocumentosPorRelacion(documentosSinPrincipal),
    [documentosSinPrincipal],
  );

  useEffect(() => {
    if (documentosPrincipales.length !== 1 || principalSeleccionado) return;

    const unicoId = getDocumentoId(documentosPrincipales[0]);
    if (!unicoId) return;

    router.replace(`/compras/${id}/editar?principalId=${unicoId}`);
  }, [documentosPrincipales, principalSeleccionado, router, id]);

  const seleccionPrincipalRequerida =
    documentosPrincipales.length > 1 && !principalSeleccionado;

  const principalActual = useMemo(() => {
    if (!principalSeleccionado) return null;

    const relacion = getRelacion(principalSeleccionado);
    const option =
      DOCUMENTO_PRINCIPAL_OPTIONS.find(
        (item) => item.tipoRelacionSugerida === relacion,
      ) ??
      DOCUMENTO_PRINCIPAL_OPTIONS.find(
        (item) =>
          item.tipoEsperado ===
          text(
            principalSeleccionado.tipo_documental ??
              principalSeleccionado.tipoDocumental,
            "",
          ),
      ) ??
      DOCUMENTO_PRINCIPAL_OPTIONS[0];

    return { option, doc: principalSeleccionado, relacion };
  }, [principalSeleccionado]);

  const principalActualRelacion =
    principalActual?.relacion ??
    principalActual?.option.tipoRelacionSugerida ??
    "";

  const cargaRealMutation = useMutation<
    ProcesarOcrResultado,
    Error,
    UploadYProcesarArgs
  >({
    mutationFn: async ({ accion, file }) => {
      setProcessingFileName(file.name);
      setProcessingError(null);
      setPrevalidacionExistente(null);
      setProcessingStep("prevalidating");
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
        documentoBaseId:
          accion.grupo === "adjunto"
            ? getDocumentoId(principalSeleccionado)
            : null,
        tipoRelacionSugerida: accion.tipoRelacionSugerida as CargaGuiadaPayloadPreview["tipoRelacionSugerida"],
        canalIngreso: "COMPRAS_EDITAR_UPLOAD",
        observacion: `Carga desde Compras Editar: ${accion.grupo} - ${accion.label}`,
        esPrincipal: accion.grupo === "principal",
      };

      setProcessingStep("prevalidating");
      const prevalidacion = await prevalidarDocumentoGuiado(uploadPayload, file);

      if (prevalidacion.accionSugerida !== "cargar_nuevo") {
        throw new PrevalidacionDetuvoCarga(
          prevalidacionCargaMessage(prevalidacion),
          getPrevalidacionExistente(prevalidacion),
        );
      }

      setProcessingStep("uploading");
      const uploadResponse = await subirDocumentoCargaSegura(uploadPayload, file, {
        idempotencyKey: crearCargaSeguraIdempotencyKey("editar", id),
      });
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
        documentoBaseId:
          accion.grupo === "adjunto"
            ? getDocumentoId(principalSeleccionado)
            : null,
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

      if (err instanceof PrevalidacionDetuvoCarga) {
        setProcessingStep("idle");
        setProcessingError(null);
        setMensajeValidacion(err.message);
        setPrevalidacionExistente(err.existente);
        return;
      }

      const message = `No se pudo cargar/procesar OCR para ${accion.label}. Revisa Gateway, ms-documentos, R2 o NATS. ${err.message}`;
      setProcessingStep("error");
      setProcessingError(message);
      setMensajeValidacion(message);
    },
  });

  function iniciarSeleccionArchivo(option: DocumentoCargaOption, grupo: AccionCargaGuiada["grupo"]) {
    if (grupo === "adjunto" && !principalSeleccionado) {
      setMensajeValidacion(
        "Selecciona la orden de compra o servicio a la que corresponde este documento.",
      );
      return;
    }
    setAccionActual({
      ...option,
      grupo,
    });
    setMensajeValidacion(null);
    setPrevalidacionExistente(null);
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


  function abrirDocumentoSoloLectura(
    doc: DocumentoVinculado,
    option: DocumentoCargaOption,
  ) {
    const archivoId = getArchivoId({
      archivoId: doc.archivoId ?? doc.archivo_id,
    });

    if (!archivoId) {
      setMensajeValidacion(
        "El documento seleccionado no tiene archivo asociado para visualizar.",
      );
      return;
    }

    const accion: AccionCargaGuiada = {
      ...option,
      grupo: option.tipoRelacionSugerida.startsWith("principal_")
        ? "principal"
        : "adjunto",
    };

    setAccionActual(accion);
    setMensajeValidacion(null);
    setResultadoModal(
      buildResultadoLecturaDesdeDocumento(doc, option, accion, archivoId),
    );
    setModalSoloLectura(true);
    setProcessingStep("idle");
    setProcessingError(null);
    setModalAbierto(true);
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

  async function resolverOcrHistoricoDocumento(
    documentoId: string,
    archivoId: string,
    permitirSinOcr = false,
  ): Promise<string | null> {
    const { data } = await api.get("/documentos/ocr-resultados");
    const payload = data?.data ?? data;
    const rows = Array.isArray(payload) ? payload : [];

    const matches = rows.filter((row: Record<string, unknown>) => {
      const rowDocumentoId = String(
        row.documentoId ?? row.documento_id ?? "",
      );
      const rowArchivoId = String(row.archivoId ?? row.archivo_id ?? "");
      return rowDocumentoId === documentoId && rowArchivoId === archivoId;
    });

    if (matches.length === 0 && permitirSinOcr) {
      return null;
    }

    if (matches.length !== 1) {
      throw new Error(
        `OCR_CONFIRMADO_NO_UNIVOCO: esperado 1 OCR para documento ${documentoId} / archivo ${archivoId}, encontrados ${matches.length}.`,
      );
    }

    const ocrResultadoId = getOcrResultadoId(matches[0]);
    if (!ocrResultadoId) {
      throw new Error(
        "OCR_RESULTADO_REQUERIDO: el documento confirmado no tiene identidad OCR histórica válida.",
      );
    }

    return ocrResultadoId;
  }

  async function abrirEdicionOcosConfirmada(
    doc: DocumentoVinculado,
    option: DocumentoCargaOption,
  ) {
    if (!isOcosPrincipalOption(option) || !isDocumentoConfirmado(doc)) {
      setMensajeValidacion(
        "La edición directa está disponible únicamente para OC/OS confirmada.",
      );
      return;
    }

    const documentoId = getDocumentoId(doc);
    const archivoId = getArchivoId({
      archivoId: doc.archivoId ?? doc.archivo_id,
    });

    if (!documentoId || !archivoId) {
      setMensajeValidacion(
        "No se pudo resolver documentoId/archivoId para editar la OC/OS confirmada.",
      );
      return;
    }

    try {
      const ocrResultadoId = await resolverOcrHistoricoDocumento(
        String(documentoId),
        String(archivoId),
        true,
      );
      const metadataDoc = parseRecordLocal(doc.metadata) ?? {};
      const ocrDoc = parseRecordLocal(metadataDoc.ocr) ?? {};
      const ocrMetadata = parseRecordLocal(ocrDoc.metadata) ?? {};

      setEdicionOcos({
        doc,
        option,
        documentoId: String(documentoId),
        archivoId: String(archivoId),
        ocrResultadoId,
        numero: text(doc.numero, ""),
        fechaEmision: text(doc.fecha_emision ?? doc.fechaEmision, ""),
        proveedor: text(
          doc.razon_social_emisor ?? doc.razonSocialEmisor,
          "",
        ),
        rucEmisor: text(doc.ruc_emisor ?? doc.rucEmisor, ""),
        montoTotal: text(doc.monto_total ?? doc.montoTotal, ""),
        moneda: text(doc.moneda, ""),
        cotizacion: text(ocrMetadata.cotizacion, ""),
        saving: false,
        error: null,
      });
      setMensajeValidacion(null);
    } catch (err) {
      setMensajeValidacion(
        err instanceof Error
          ? err.message
          : "No se pudo resolver el OCR histórico del documento confirmado.",
      );
    }
  }

  async function resolverProveedorCatalogoPorRuc(
    ruc: string,
  ): Promise<string | null> {
    const normalizado = ruc.replace(/\D/g, "").trim();
    if (!/^\d{11}$/.test(normalizado)) {
      throw new Error("Ingresa un RUC proveedor válido de 11 dígitos.");
    }

    const proveedores = await buscarProveedoresCatalogo(normalizado, 20);
    const exacto = proveedores.find((item) => item.ruc === normalizado);
    return exacto?.razonSocial ?? null;
  }

  async function resolverProveedorOcosAlSalirDelRuc() {
    if (!edicionOcos || edicionOcos.saving) return;

    const ruc = edicionOcos.rucEmisor.replace(/\D/g, "").trim();

    if (!/^\d{11}$/.test(ruc)) {
      setEdicionOcos((current) =>
        current
          ? {
              ...current,
              rucEmisor: ruc,
              proveedor: "",
              error: "Ingresa un RUC proveedor válido de 11 dígitos.",
            }
          : current,
      );
      return;
    }

    try {
      const proveedor = await resolverProveedorCatalogoPorRuc(ruc);
      setEdicionOcos((current) =>
        current
          ? {
              ...current,
              rucEmisor: ruc,
              proveedor: proveedor ?? "",
              error: proveedor
                ? null
                : "Proveedor no encontrado para el RUC ingresado.",
            }
          : current,
      );
    } catch (error: unknown) {
      setEdicionOcos((current) =>
        current
          ? {
              ...current,
              rucEmisor: ruc,
              proveedor: "",
              error:
                error instanceof Error
                  ? error.message
                  : "No se pudo consultar el proveedor por RUC.",
            }
          : current,
      );
    }
  }

  async function guardarEdicionOcosConfirmada() {
    if (!edicionOcos) return;

    const { documentoId, archivoId, ocrResultadoId, option } = edicionOcos;

    setEdicionOcos((current) =>
      current ? { ...current, saving: true, error: null } : current,
    );

    try {
      const razonSocialCatalogo = await resolverProveedorCatalogoPorRuc(
        edicionOcos.rucEmisor,
      );
      if (!razonSocialCatalogo) {
        throw new Error(
          "Proveedor no encontrado para el RUC ingresado. Verifica el RUC antes de guardar.",
        );
      }
      const razonSocialProveedor = razonSocialCatalogo;
      await actualizarDocumentoManual(documentoId, {
        tipoDocumental: option.tipoEsperado,
        ...(ocrResultadoId
          ? { ocrResultadoId: Number(ocrResultadoId) }
          : {}),
        metadata: {
          numero: edicionOcos.numero.trim() || undefined,
          fechaEmision: edicionOcos.fechaEmision.trim() || undefined,
          proveedor: razonSocialProveedor,
          razonSocial: razonSocialProveedor,
          rucEmisor: edicionOcos.rucEmisor.trim() || undefined,
          rucProveedor: edicionOcos.rucEmisor.trim() || undefined,
          rucComprador: rucComprador || undefined,
          montoTotal: edicionOcos.montoTotal.trim() || undefined,
          moneda: edicionOcos.moneda.trim() || undefined,
          cotizacion: edicionOcos.cotizacion.trim() || undefined,
          clienteAbreviatura: empresa || undefined,
          codigoExpediente: codigo || undefined,
          contextoValidacion: {
            origen: "COMPRAS_EDITAR_DOCUMENTO",
            expedienteId: String(id),
            codigoExpediente: codigo || undefined,
            tipoRelacionSugerida: option.tipoRelacionSugerida,
            confirmadoDesde: "compras_editar_documento",
            documentoId,
            archivoId,
          },
        },
        motivo: "Corrección manual de datos de OC/OS confirmada",
        origen: "COMPRAS_EDITAR_DOCUMENTO",
      });

      setEdicionOcos(null);
      setMensajeValidacion(
        `OC/OS ${documentoId} actualizada sin nueva carga ni reprocesamiento OCR.`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["expediente-documentos", String(id)],
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la OC/OS confirmada.";
      setEdicionOcos((current) =>
        current ? { ...current, saving: false, error: message } : current,
      );
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
      documentoId: String(documentoId),
      titulo: summary.title,
      contextoLabel,
      archivos: [],
    });
    setVersionesLoading(true);
    setVersionesError(null);

    try {
      const response = await getDocumentoArchivos(documentoId);
      setVersionesModal({
        documentoId: String(documentoId),
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
      documentoBaseId:
        accionActual?.grupo === "adjunto"
          ? getDocumentoId(principalSeleccionado)
          : null,
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

  async function abrirEdicionFacturaConfirmada(
    doc: DocumentoVinculado,
    option: DocumentoCargaOption,
  ) {
    if (!isFacturaOption(option) || !isDocumentoConfirmado(doc)) return;
    const documentoIdRaw = getDocumentoId(doc);
    const archivoId = getArchivoId({ archivoId: doc.archivoId ?? doc.archivo_id });
    if (!documentoIdRaw || !archivoId) {
      setMensajeValidacion("La Factura confirmada no tiene documento/archivo identificable para editar.");
      return;
    }
    const documentoId = String(documentoIdRaw);

    try {
      const ocrResultadoId = await resolverOcrHistoricoDocumento(documentoId, archivoId);
      if (!ocrResultadoId) {
        throw new Error(
          "OCR_RESULTADO_REQUERIDO: la Factura confirmada no tiene identidad OCR histórica válida.",
        );
      }
      const metadata =
        doc.metadata && typeof doc.metadata === "object"
          ? (doc.metadata as Record<string, unknown>)
          : {};
      const ocrMetadata =
        metadata.ocr &&
        typeof metadata.ocr === "object" &&
        !Array.isArray(metadata.ocr)
          ? (((metadata.ocr as Record<string, unknown>).metadata ?? {}) as Record<string, unknown>)
          : {};

      setEdicionFactura({
        doc,
        option,
        documentoId,
        archivoId,
        ocrResultadoId,
        numero: text(doc.numero ?? ocrMetadata.numero, ""),
        serie: text(doc.serie ?? ocrMetadata.serie, ""),
        fechaEmision: text(doc.fecha_emision ?? doc.fechaEmision ?? ocrMetadata.fechaEmision, ""),
        proveedor: text(
          doc.razon_social_emisor ??
            doc.razonSocialEmisor ??
            ocrMetadata.razonSocial ??
            ocrMetadata.proveedor,
          "",
        ),
        rucEmisor: text(
          doc.ruc_emisor ??
            doc.rucEmisor ??
            ocrMetadata.rucEmisor ??
            ocrMetadata.rucProveedor,
          "",
        ),
        montoTotal: text(doc.monto_total ?? doc.montoTotal ?? ocrMetadata.montoTotal, ""),
        moneda: text(doc.moneda ?? ocrMetadata.moneda, ""),
        saving: false,
        error: null,
      });
      setMensajeValidacion(null);
    } catch (err) {
      setMensajeValidacion(
        err instanceof Error
          ? err.message
          : "No se pudo resolver el OCR histórico de la Factura confirmada.",
      );
    }
  }

  async function guardarEdicionFacturaConfirmada() {
    if (!edicionFactura) return;
    const { documentoId, archivoId, ocrResultadoId, option } = edicionFactura;

    setEdicionFactura((current) =>
      current ? { ...current, saving: true, error: null } : current,
    );

    try {
      const razonSocialCatalogo = await resolverProveedorCatalogoPorRuc(
        edicionFactura.rucEmisor,
      );
      const razonSocialProveedor =
        razonSocialCatalogo ?? (edicionFactura.proveedor.trim() || undefined);

      await actualizarDocumentoManual(documentoId, {
        tipoDocumental: option.tipoEsperado,
        ocrResultadoId: Number(ocrResultadoId),
        metadata: {
          numero: edicionFactura.numero.trim() || undefined,
          serie: edicionFactura.serie.trim() || undefined,
          fechaEmision: edicionFactura.fechaEmision.trim() || undefined,
          proveedor: razonSocialProveedor,
          razonSocial: razonSocialProveedor,
          rucEmisor: edicionFactura.rucEmisor.trim() || undefined,
          rucProveedor: edicionFactura.rucEmisor.trim() || undefined,
          montoTotal: edicionFactura.montoTotal.trim() || undefined,
          moneda: edicionFactura.moneda.trim() || undefined,
          clienteAbreviatura: text(
            (expediente as any)?.empresa_codigo ??
              (expediente as any)?.empresaCodigo ??
              (expediente as any)?.cliente_abreviatura ??
              (expediente as any)?.clienteAbreviatura,
            "",
          ),
          codigoExpediente: text(
            (expediente as any)?.codigo ??
              (expediente as any)?.codigoExpediente ??
              (expediente as any)?.codigo_expediente,
            "",
          ),
          contextoValidacion: {
            origen: "COMPRAS_EDITAR_DOCUMENTO",
            expedienteId: String(id),
            codigoExpediente: text(
              (expediente as any)?.codigo ??
                (expediente as any)?.codigoExpediente ??
                (expediente as any)?.codigo_expediente,
              "",
            ),
            tipoRelacionSugerida: option.tipoRelacionSugerida,
            confirmadoDesde: "compras_editar_documento",
            documentoId,
            archivoId,
          },
        },
        motivo: "Corrección manual de datos de Factura confirmada",
        origen: "COMPRAS_EDITAR_DOCUMENTO",
      });

      setEdicionFactura(null);
      setMensajeValidacion("Factura actualizada sobre el documento existente.");
      await queryClient.invalidateQueries({
        queryKey: ["expediente-documentos", String(id)],
      });
    } catch (err) {
      setEdicionFactura((current) =>
        current
          ? {
              ...current,
              saving: false,
              error:
                err instanceof Error
                  ? err.message
                  : "No se pudo actualizar la Factura confirmada.",
            }
          : current,
      );
    }
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

    const tipoFormulario = normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || ""));
    const tipoEsperado = normalizeTipoDocumentalParaBackend(String(accionActual?.tipoEsperado || ""));

    if (tipoFormulario && tipoEsperado && tipoFormulario !== tipoEsperado) {
      throw new Error(
        `El OCR propone ${tipoFormulario}, pero el usuario eligió ${tipoEsperado}. Corrige el tipo documental antes de confirmar.`,
      );
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
        documentoBaseId:
          accionActual?.grupo === "adjunto"
            ? getDocumentoId(principalSeleccionado)
            : null,
      },
    );

    const esPrincipalFinal = accionActual?.grupo === "principal";

    await confirmarOcrConExpediente(ocrResultadoId, {
      expedienteId: id,
      documentoBaseId:
        esPrincipalFinal ? null : getDocumentoId(principalSeleccionado),
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

  const facturaOption =
    DOCUMENTO_ADJUNTO_OPTIONS.find(
      (item) => item.tipoRelacionSugerida === "adjunto_factura",
    ) ?? null;
  const guiaOption =
    DOCUMENTO_ADJUNTO_OPTIONS.find(
      (item) => item.tipoRelacionSugerida === "adjunto_guia",
    ) ?? null;
  const otrosOptions = DOCUMENTO_ADJUNTO_OPTIONS.filter(
    (item) =>
      item.tipoRelacionSugerida !== "adjunto_factura" &&
      item.tipoRelacionSugerida !== "adjunto_guia",
  );
  const facturas = documentosPorRelacion.get("adjunto_factura") ?? [];
  const guias = documentosPorRelacion.get("adjunto_guia") ?? [];
  const otrosDocumentos = otrosOptions.flatMap(
    (item) => documentosPorRelacion.get(item.tipoRelacionSugerida) ?? [],
  );

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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Compras
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {principalActual
                ? `${text(
                    principalActual.doc.tipo_documental ??
                      principalActual.doc.tipoDocumental,
                    "",
                  )} ${text(
                    principalActual.doc.numero,
                    "",
                  )}`.trim()
                : "Compra"}
            </h1>
            <p
              className="mt-1 max-w-4xl truncate text-sm text-muted-foreground"
              title={`Centro ${codigo} · ${descripcionAmigable(expediente)}`}
            >
              Centro {codigo} · {descripcionAmigable(expediente)}
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-3">
            <Link href="/compras">Volver</Link>
          </Button>
        </div>

        {mensajeValidacion ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="whitespace-pre-line">{mensajeValidacion}</p>
            {prevalidacionExistente ? (
              <div className="flex flex-wrap gap-2">
                {prevalidacionExistente.expedienteId ? (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/compras/${prevalidacionExistente.expedienteId}/ver`}>Ver</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/compras/${prevalidacionExistente.expedienteId}/editar`}>Editar</Link>
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <Card>
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]">
              <section className="p-5 lg:border-r">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Centro de costo
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-lg font-semibold text-foreground">
                    {codigo || "—"}
                  </div>
                  {descripcion ? (
                    <div
                      className="line-clamp-2 break-words text-sm text-muted-foreground"
                      title={descripcion}
                    >
                      {descripcion}
                    </div>
                  ) : null}
                  {empresa ? (
                    <div className="text-xs font-medium text-muted-foreground">
                      {empresa}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="border-t p-5 lg:border-t-0">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Documento principal
                </div>
                <div className="mt-3">
                  {principalActual ? (
                    <DocumentoHumanoCard
                      doc={principalActual.doc}
                      option={principalActual.option}
                      onVer={(doc) =>
                        abrirDocumentoSoloLectura(doc, principalActual.option)
                      }
                      onValidar={
                        modoSoloLectura
                          ? undefined
                          : (doc) => abrirDocumentoExistente(doc, principalActual.option)
                      }
                      onEditar={
                        modoSoloLectura
                          ? undefined
                          : (doc) => {
                              void abrirEdicionOcosConfirmada(
                                doc,
                                principalActual.option,
                              );
                            }
                      }
                      readOnly={modoSoloLectura}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      No hay una OC/OS principal activa para este centro de costo.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col items-center gap-3 text-center">
              <CardTitle className="text-base uppercase tracking-wide">
                Documentos de compra
              </CardTitle>

              {!modoSoloLectura && facturaOption ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-52 justify-center"
                  disabled={
                    procesando ||
                    !principalSeleccionado ||
                    !isDocumentoConfirmado(principalSeleccionado)
                  }
                  onClick={() => iniciarSeleccionArchivo(facturaOption, "adjunto")}
                >
                  <FilePlus2 className="h-4 w-4" />
                  {facturas.length ? "Adjuntar otra factura" : "Adjuntar factura"}
                </Button>
              ) : null}

              {!modoSoloLectura &&
              principalSeleccionado &&
              !isDocumentoConfirmado(principalSeleccionado) ? (
                <p className="text-xs text-muted-foreground">
                  Valida primero la OC/OS para poder adjuntar facturas.
                </p>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            {!facturas.length ? (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Aún no se han adjuntado facturas.
              </div>
            ) : (
              <div className="space-y-4">
                {facturaOption
                  ? facturas.map((doc, index) => (
                      <section
                        key={String(
                          getDocumentoId(doc) ??
                            doc.archivo_id ??
                            doc.archivoId ??
                            index,
                        )}
                        className="rounded-xl border bg-background p-4"
                      >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Contexto documental
                            </div>
                            <div className="mt-1 text-sm font-semibold">
                              Factura {index + 1}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Factura con Guía y sustentos propios
                          </span>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="min-w-0">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Factura
                            </div>
                            <DocumentoHumanoCard
                              doc={doc}
                              option={facturaOption}
                              onVer={(documento) =>
                                abrirDocumentoSoloLectura(documento, facturaOption)
                              }
                              onEditar={
                                modoSoloLectura
                                  ? undefined
                                  : (documento) => {
                                      void abrirEdicionFacturaConfirmada(
                                        documento,
                                        facturaOption,
                                      );
                                    }
                              }
                              readOnly={modoSoloLectura}
                            />
                          </div>

                          <div className="min-w-0 rounded-xl border border-dashed p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Guía
                            </div>
                            <div className="mt-3 space-y-3">
                              {facturas.length === 1 &&
                              guiaOption &&
                              guias.length ? (
                                guias.map((guia) => (
                                  <DocumentoHumanoCard
                                    key={String(
                                      getDocumentoId(guia) ??
                                        guia.archivo_id ??
                                        guia.archivoId,
                                    )}
                                    doc={guia}
                                    option={guiaOption}
                                    onVer={(documento) =>
                                      abrirDocumentoSoloLectura(documento, guiaOption)
                                    }
                                    readOnly={modoSoloLectura}
                                  />
                                ))
                              ) : (
                                <div className="rounded-lg border border-dashed px-3 py-5 text-sm text-muted-foreground">
                                  Aún no se ha adjuntado una guía.
                                </div>
                              )}

                              {!modoSoloLectura ? (
                              <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={true}
                                >
                                  <FilePlus2 className="h-4 w-4" />
                                  Adjuntar guía
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="min-w-0 rounded-xl border border-dashed p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Otros sustentos
                            </div>
                            <div className="mt-3 space-y-3">
                              {facturas.length === 1 &&
                              otrosDocumentos.length ? (
                                otrosOptions.flatMap((option) =>
                                  (
                                    documentosPorRelacion.get(
                                      option.tipoRelacionSugerida,
                                    ) ?? []
                                  ).map((documento) => (
                                    <DocumentoHumanoCard
                                      key={String(
                                        getDocumentoId(documento) ??
                                          documento.archivo_id ??
                                          documento.archivoId,
                                      )}
                                      doc={documento}
                                      option={option}
                                      onVer={(item) =>
                                        abrirDocumentoSoloLectura(item, option)
                                      }
                                      readOnly={modoSoloLectura}
                                    />
                                  )),
                                )
                              ) : (
                                <div className="rounded-lg border border-dashed px-3 py-5 text-sm text-muted-foreground">
                                  Aún no se han adjuntado otros documentos.
                                </div>
                              )}

                              {!modoSoloLectura ? (
                              <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={true}
                                >
                                  <FilePlus2 className="h-4 w-4" />
                                  Adjuntar sustento
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </section>
                    ))
                  : null}

                {facturas.length > 1 &&
                (guias.length || otrosDocumentos.length) ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    Los documentos existentes de Guía/Otros sustentos no se
                    reasignan visualmente entre múltiples facturas hasta contar
                    con identidad exacta del contexto documental.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {documentosSinPrincipal.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Adjuntos sin principal explícito</CardTitle>
              <p className="text-sm text-muted-foreground">
                Estos documentos pertenecen al expediente, pero todavía no tienen
                una asociación explícita con ningún documento principal.
              </p>
            </CardHeader>

            <CardContent className="grid gap-3 md:grid-cols-3">
              {DOCUMENTO_ADJUNTO_OPTIONS.map((item) => {
                const documentos =
                  documentosSinPrincipalPorRelacion.get(
                    item.tipoRelacionSugerida,
                  ) ?? [];

                if (!documentos.length) return null;

                return (
                  <div
                    key={`sin-principal-${item.tipoRelacionSugerida}`}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{item.label}</div>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.tipoEsperado}
                      </span>
                    </div>

                    <DocumentoAdjuntoRelacionResumen
                      option={item}
                      documentos={documentos}
                      onVerValidar={(doc) => abrirDocumentoExistente(doc, item)}
                      onVerVersiones={(doc) =>
                        abrirHistorialVersiones(doc, item)
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
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

      <Modal
        isOpen={Boolean(edicionOcos)}
        onClose={() => {
          if (!edicionOcos?.saving) setEdicionOcos(null);
        }}
        className="mx-4 max-w-3xl p-5 md:p-6"
      >
        {edicionOcos ? (
          <div className="space-y-5">
            <div className="pr-10">
              <div className="text-lg font-semibold">
                Editar {edicionOcos.option.tipoEsperado}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Se actualizarán únicamente los datos del documento existente.
                El archivo y el OCR histórico se conservan.
              </p>
            </div>

            {edicionOcos.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {edicionOcos.error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Número</span>
                <Input
                  value={edicionOcos.numero}
                  onChange={(event) =>
                    setEdicionOcos((current) =>
                      current ? { ...current, numero: event.target.value } : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Fecha de emisión</span>
                <Input
                  type="date"
                  value={edicionOcos.fechaEmision}
                  onChange={(event) =>
                    setEdicionOcos((current) =>
                      current
                        ? { ...current, fechaEmision: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <div className="space-y-1 text-sm">
                <span className="font-medium">RUC proveedor</span>
                <Input
                  value={edicionOcos.rucEmisor}
                  inputMode="numeric"
                  maxLength={11}
                  disabled={edicionOcos.saving}
                  onChange={(event) => {
                    const ruc = event.target.value.replace(/\D/g, "").slice(0, 11);
                    setEdicionOcos((current) =>
                      current
                        ? {
                            ...current,
                            rucEmisor: ruc,
                            proveedor:
                              ruc === current.rucEmisor ? current.proveedor : "",
                            error: null,
                          }
                        : current,
                    );
                  }}
                  onBlur={() => {
                    void resolverProveedorOcosAlSalirDelRuc();
                  }}
                />
                <span className="block text-xs text-muted-foreground">
                  La razón social se consulta automáticamente al salir del campo.
                </span>
              </div>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Razón social</span>
                <Input value={edicionOcos.proveedor} readOnly />
                <span className="block text-xs text-muted-foreground">
                  Derivada del catálogo de proveedores según el RUC.
                </span>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Monto total</span>
                <Input
                  value={edicionOcos.montoTotal}
                  onChange={(event) =>
                    setEdicionOcos((current) =>
                      current ? { ...current, montoTotal: event.target.value } : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Moneda</span>
                <Input
                  value={edicionOcos.moneda}
                  onChange={(event) =>
                    setEdicionOcos((current) =>
                      current ? { ...current, moneda: event.target.value } : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Cotización</span>
                <Input
                  value={edicionOcos.cotizacion}
                  onChange={(event) =>
                    setEdicionOcos((current) =>
                      current ? { ...current, cotizacion: event.target.value } : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={edicionOcos.saving}
                onClick={() => setEdicionOcos(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={edicionOcos.saving}
                onClick={() => {
                  void guardarEdicionOcosConfirmada();
                }}
              >
                {edicionOcos.saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(edicionFactura)}
        onClose={() => {
          if (!edicionFactura?.saving) setEdicionFactura(null);
        }}
        className="mx-4 max-w-3xl p-5 md:p-6"
      >
        {edicionFactura ? (
          <div className="space-y-5">
            <div className="pr-10">
              <div className="text-lg font-semibold">Editar Factura</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Se actualizarán únicamente los datos del documento existente.
                El archivo, OCR histórico y grupo documental se conservan.
              </p>
            </div>

            {edicionFactura.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {edicionFactura.error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Número</span>
                <Input
                  value={edicionFactura.numero}
                  onChange={(event) =>
                    setEdicionFactura((current) =>
                      current ? { ...current, numero: event.target.value } : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Serie</span>
                <Input
                  value={edicionFactura.serie}
                  onChange={(event) =>
                    setEdicionFactura((current) =>
                      current ? { ...current, serie: event.target.value } : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Fecha de emisión</span>
                <Input
                  type="date"
                  value={edicionFactura.fechaEmision}
                  onChange={(event) =>
                    setEdicionFactura((current) =>
                      current
                        ? { ...current, fechaEmision: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <div className="space-y-1 text-sm">
                <span className="font-medium">RUC proveedor</span>
                <div className="flex gap-2">
                  <Input
                    value={edicionFactura.rucEmisor}
                    onChange={(event) =>
                      setEdicionFactura((current) =>
                        current
                          ? { ...current, rucEmisor: event.target.value, error: null }
                          : current,
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={edicionFactura.saving}
                    onClick={() => {
                      void resolverProveedorCatalogoPorRuc(edicionFactura.rucEmisor)
                        .then((proveedor) =>
                          setEdicionFactura((current) =>
                            current
                              ? {
                                  ...current,
                                  proveedor: proveedor ?? current.proveedor,
                                  error: proveedor
                                    ? null
                                    : "Proveedor no encontrado en catálogo; se conservará la razón social actual.",
                                }
                              : current,
                          ),
                        )
                        .catch((error: unknown) =>
                          setEdicionFactura((current) =>
                            current
                              ? {
                                  ...current,
                                  error:
                                    error instanceof Error
                                      ? error.message
                                      : "No se pudo resolver el proveedor.",
                                }
                              : current,
                          ),
                        );
                    }}
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Razón social</span>
                <Input value={edicionFactura.proveedor} readOnly />
                <span className="block text-xs text-muted-foreground">
                  Derivada del catálogo de proveedores según el RUC.
                </span>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Monto total</span>
                <Input
                  value={edicionFactura.montoTotal}
                  onChange={(event) =>
                    setEdicionFactura((current) =>
                      current
                        ? { ...current, montoTotal: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">Moneda</span>
                <Input
                  value={edicionFactura.moneda}
                  onChange={(event) =>
                    setEdicionFactura((current) =>
                      current ? { ...current, moneda: event.target.value } : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={edicionFactura.saving}
                onClick={() => setEdicionFactura(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={edicionFactura.saving}
                onClick={() => {
                  void guardarEdicionFacturaConfirmada();
                }}
              >
                {edicionFactura.saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

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
        formularioContexto="COMPRAS"
        readOnly={modalSoloLectura}
      />
    </>
  );
}
