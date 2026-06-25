"use client";

import Link from "next/link";
import { api } from "@/services/api";
import {
  getDocumentoDuplicadoDetailsFromError,
  type DocumentoDuplicadoEnExpedienteDetails,
} from "@/services/ocr-procesamiento";
import { useEffect, useMemo, useState } from "react";

const TIPOS_DOCUMENTALES = [
  "OC",
  "OS",
  "FACTURA",
  "GUIA",
  "NOTA_INGRESO",
  "RECIBO_HONORARIO",
  "TRANSFERENCIA",
  "DETRACCION",
] as const;

type TipoDocumental = (typeof TIPOS_DOCUMENTALES)[number] | string;

type FormState = {
  tipoDocumental: TipoDocumental;
  numero: string;
  serie: string;
  fechaEmision: string;
  proveedor: string;
  rucProveedor: string;
  rucComprador: string;
  rucEmisor: string;
  razonSocial: string;
  montoTotal: string;
  moneda: string;
  cotizacion: string;
  codigoExpediente: string;
  claveDocumental: string;
  documentoRelacionado: string;
};

export type OcrValidationExpedienteContexto = {
  id?: string | number | null;
  codigo?: string | null;
  descripcion?: string | null;
  empresa?: string | null;
  rucComprador?: string | null;
};

type OcrValidationModalProps = {
  open: boolean;
  resultado: unknown;
  fallbackArchivoId?: string | number;
  onClose: () => void;
  expedienteContexto?: OcrValidationExpedienteContexto;
  onSave?: (form: FormState) => void | Promise<void>;
  onConfirm?: (form: FormState) => void | Promise<void>;
  onReject?: (form: FormState) => void | Promise<void>;
  onAgregarComoVersion?: (details: DocumentoDuplicadoEnExpedienteDetails) => void | Promise<void>;
  tiposDocumentalesPermitidos?: readonly string[];
  tipoDocumentalBloqueado?: boolean;
  readOnly?: boolean;
};

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeTipoParaUi(value: unknown, fallback: TipoDocumental = "OC"): TipoDocumental {
  const tipo = String(value ?? "").trim().toUpperCase();

  if (tipo === "GUIA_REMISION" || tipo === "GUÍA") return "GUIA";
  if (tipo === "NI" || tipo === "NOTA INGRESO") return "NOTA_INGRESO";

  return (tipo || fallback) as TipoDocumental;
}

function parseMaybeJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

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

function getRecord(source: Record<string, unknown> | null, key: string) {
  return parseMaybeJson(source?.[key]);
}

function getRaw(resultado: unknown) {
  return parseMaybeJson(resultado) ?? {};
}

function getMetadata(resultado: unknown) {
  const raw = getRaw(resultado);

  return (
    parseMaybeJson(raw.metadata) ??
    parseMaybeJson(raw.metadataOcr) ??
    parseMaybeJson(raw.metadata_ocr) ??
    {}
  );
}

function getArchivoInfo(resultado: unknown) {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);
  const archivo = getRecord(metadata, "archivo") ?? getRecord(raw, "archivo");

  const nombre =
    raw.nombreArchivo ??
    raw.nombre_archivo ??
    archivo?.filename ??
    archivo?.nombreArchivo ??
    archivo?.nombre_archivo ??
    archivo?.filename_original ??
    metadata.nombreArchivo ??
    metadata.nombre_archivo ??
    metadata.filename ??
    "Documento OCR";

  const storageProvider =
    raw.storageProvider ??
    raw.storage_provider ??
    archivo?.storageProvider ??
    archivo?.storage_provider ??
    metadata.storageProvider ??
    metadata.storage_provider ??
    "R2";

  const storageBucket =
    raw.storageBucket ??
    raw.storage_bucket ??
    archivo?.storageBucket ??
    archivo?.storage_bucket ??
    metadata.storageBucket ??
    metadata.storage_bucket ??
    "—";

  const storageKey =
    raw.storageKey ??
    raw.storage_key ??
    archivo?.storageKey ??
    archivo?.storage_key ??
    metadata.storageKey ??
    metadata.storage_key ??
    "—";

  const previewUrl =
    raw.signedUrl ??
    raw.signed_url ??
    raw.publicUrl ??
    raw.public_url ??
    archivo?.signedUrl ??
    archivo?.signed_url ??
    archivo?.publicUrl ??
    archivo?.public_url ??
    metadata.signedUrl ??
    metadata.signed_url ??
    metadata.publicUrl ??
    metadata.public_url ??
    null;

  return {
    nombre: texto(nombre),
    storageProvider: texto(storageProvider),
    storageBucket: texto(storageBucket),
    storageKey: texto(storageKey),
    previewUrl: previewUrl ? String(previewUrl) : null,
  };
}

function getExpedienteVinculado(resultado: unknown) {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);

  return (
    parseMaybeJson(raw.expedienteVinculado) ??
    parseMaybeJson(raw.expediente_vinculado) ??
    parseMaybeJson(raw.vinculoExpediente) ??
    parseMaybeJson(raw.vinculo_expediente) ??
    getRecord(metadata, "expedienteVinculado") ??
    getRecord(metadata, "expediente_vinculado") ??
    getRecord(metadata, "vinculoExpediente") ??
    getRecord(metadata, "vinculo_expediente") ??
    null
  );
}

function getExpedienteInfo(resultado: unknown, expedienteContexto?: OcrValidationExpedienteContexto) {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);
  const vinculado = getExpedienteVinculado(resultado);
  const contextoCarga = parseMaybeJson(raw.contextoCarga) ?? getRecord(metadata, "contextoCarga");

  const id =
    expedienteContexto?.id ??
    raw.expedienteId ??
    raw.expediente_id ??
    vinculado?.id ??
    vinculado?.expedienteId ??
    vinculado?.expediente_id ??
    contextoCarga?.expedienteId ??
    contextoCarga?.expediente_id ??
    metadata.expedienteId ??
    metadata.expediente_id ??
    null;

  return {
    id: id ? String(id) : "",
    codigo: texto(
      expedienteContexto?.codigo ??
        vinculado?.codigoExpediente ??
        vinculado?.codigo_expediente ??
        raw.codigoExpediente ??
        raw.codigo_expediente ??
        contextoCarga?.codigoExpediente ??
        contextoCarga?.codigo_expediente ??
        metadata.codigoExpediente ??
        metadata.codigo_expediente,
      "",
    ),
    descripcion: texto(
      expedienteContexto?.descripcion ?? vinculado?.descripcion ?? vinculado?.nombre ?? vinculado?.detalle,
      "",
    ),
    empresa: texto(
      expedienteContexto?.empresa ??
        vinculado?.empresaCodigo ??
        vinculado?.empresa_codigo ??
        raw.empresaCodigo ??
        raw.empresa_codigo ??
        metadata.empresaCodigo ??
        metadata.empresa_codigo,
      "",
    ),
  };
}

function buildInitialForm(resultado: unknown, expedienteContexto?: OcrValidationExpedienteContexto): FormState {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);
  const contextoCarga = parseMaybeJson(raw.contextoCarga) ?? getRecord(metadata, "contextoCarga");

  return {
    tipoDocumental: normalizeTipoParaUi(
      raw.tipoDocumental ?? raw.tipo_documental ?? metadata.tipoDocumental ?? metadata.tipo_documental,
      "OC",
    ),
    numero: texto(raw.numero ?? metadata.numero, ""),
    serie: texto(raw.serie ?? metadata.serie, ""),
    fechaEmision: texto(raw.fechaEmision ?? raw.fecha_emision ?? metadata.fechaEmision ?? metadata.fecha_emision, ""),
    proveedor: texto(
      raw.proveedor ??
        raw.proveedorNombre ??
        raw.razonSocialEmisor ??
        metadata.proveedor ??
        metadata.proveedorNombre ??
        metadata.razonSocialEmisor,
      "",
    ),
    rucProveedor: texto(
      raw.rucProveedor ??
        raw.ruc_proveedor ??
        raw.proveedorRuc ??
        metadata.rucProveedor ??
        metadata.ruc_proveedor ??
        metadata.proveedorRuc,
      "",
    ),
    rucComprador: texto(raw.rucComprador ?? raw.ruc_comprador ?? metadata.rucComprador ?? metadata.ruc_comprador ?? expedienteContexto?.rucComprador, ""),
    rucEmisor: texto(raw.rucEmisor ?? raw.ruc_emisor ?? metadata.rucEmisor ?? metadata.ruc_emisor ?? raw.ruc ?? metadata.ruc, ""),
    razonSocial: texto(raw.razonSocial ?? raw.razon_social ?? metadata.razonSocial ?? metadata.razon_social, ""),
    montoTotal: texto(raw.montoTotal ?? raw.monto_total ?? metadata.montoTotal ?? metadata.monto_total, ""),
    moneda: texto(raw.moneda ?? metadata.moneda, ""),
    cotizacion: texto(raw.cotizacion ?? metadata.cotizacion, ""),
    codigoExpediente: texto(
      raw.codigoExpediente ??
        raw.codigo_expediente ??
        metadata.codigoExpediente ??
        metadata.codigo_expediente ??
        contextoCarga?.codigoExpediente ??
        contextoCarga?.codigo_expediente ??
        expedienteContexto?.codigo,
      "",
    ),
    claveDocumental: texto(raw.claveDocumental ?? raw.clave_documental ?? metadata.claveDocumental ?? metadata.clave_documental, ""),
    documentoRelacionado: texto(
      raw.documentoRelacionado ??
        raw.documento_relacionado ??
        raw.ordenCompra ??
        raw.orden_compra ??
        metadata.documentoRelacionado ??
        metadata.documento_relacionado ??
        metadata.ordenCompra ??
        metadata.orden_compra,
      "",
    ),
  };
}

function camposPorTipo(tipo: string): Array<keyof FormState> {
  const normalizado = tipo.toUpperCase();

  if (normalizado === "FACTURA") {
    return [
      "serie",
      "numero",
      "fechaEmision",
      "rucEmisor",
      "rucComprador",
      "razonSocial",
      "montoTotal",
      "moneda",
      "codigoExpediente",
      "claveDocumental",
    ];
  }

  if (normalizado === "GUIA" || normalizado === "GUIA_REMISION") {
    return [
      "serie",
      "numero",
      "fechaEmision",
      "rucEmisor",
      "proveedor",
      "documentoRelacionado",
      "codigoExpediente",
    ];
  }

  if (normalizado === "NOTA_INGRESO") {
    return [
      "numero",
      "fechaEmision",
      "proveedor",
      "rucProveedor",
      "documentoRelacionado",
      "codigoExpediente",
      "claveDocumental",
    ];
  }

  if (normalizado === "TRANSFERENCIA" || normalizado === "DETRACCION") {
    return ["numero", "fechaEmision", "proveedor", "rucProveedor", "montoTotal", "moneda", "codigoExpediente"];
  }

  return [
    "numero",
    "fechaEmision",
    "proveedor",
    "rucProveedor",
    "rucComprador",
    "montoTotal",
    "moneda",
    "cotizacion",
    "codigoExpediente",
    "claveDocumental",
  ];
}

const FIELD_LABELS: Record<keyof FormState, string> = {
  tipoDocumental: "Tipo documental",
  numero: "Número",
  serie: "Serie",
  fechaEmision: "Fecha emisión",
  proveedor: "Proveedor",
  rucProveedor: "RUC proveedor",
  rucComprador: "RUC comprador",
  rucEmisor: "RUC emisor",
  razonSocial: "Razón social",
  montoTotal: "Monto total",
  moneda: "Moneda",
  cotizacion: "Cotización",
  codigoExpediente: "Código expediente",
  claveDocumental: "Clave documental",
  documentoRelacionado: "Documento relacionado",
};

function FieldInput({
  name,
  value,
  onChange,
  readOnly = false,
}: {
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {FIELD_LABELS[name]}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => {
          if (!readOnly) onChange(name, event.target.value);
        }}
        className={`mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 ${
          readOnly
            ? "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            : "bg-white dark:bg-slate-950"
        }`}
      />
    </label>
  );
}

export type { FormState as OcrValidationFormState };

export function OcrValidationModal({
  open,
  resultado,
  fallbackArchivoId,
  expedienteContexto,
  onClose,
  onSave,
  onConfirm,
  onReject,
  onAgregarComoVersion,
  tiposDocumentalesPermitidos,
  tipoDocumentalBloqueado = false,
  readOnly = false,
}: OcrValidationModalProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(resultado, expedienteContexto));
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [duplicadoDetails, setDuplicadoDetails] = useState<DocumentoDuplicadoEnExpedienteDetails | null>(null);
  const [submittingAction, setSubmittingAction] = useState<null | "save" | "confirm" | "reject" | "version">(null);
  const [previewUrlFromApi, setPreviewUrlFromApi] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(resultado, expedienteContexto));
      setLocalMessage(null);
      setActionError(null);
      setDuplicadoDetails(null);
      setPreviewUrlFromApi(null);
      setPreviewError(null);
    }
  }, [open, resultado, expedienteContexto]);

  useEffect(() => {
    if (!open) return;

    const rawArchivo = getArchivoInfo(resultado);
    if (rawArchivo.previewUrl) {
      setPreviewUrlFromApi(rawArchivo.previewUrl);
      setPreviewError(null);
      return;
    }

    if (!fallbackArchivoId) {
      setPreviewUrlFromApi(null);
      return;
    }

    let cancelled = false;

    async function loadPreviewUrl() {
      try {
        setPreviewError(null);
        const response = await api.get(`/documentos/archivos/${fallbackArchivoId}/preview-url`);
        const payload = response.data?.data ?? response.data;
        const signedUrl =
          payload?.signedUrl ??
          payload?.signed_url ??
          payload?.publicUrl ??
          payload?.public_url ??
          null;

        if (!cancelled) {
          setPreviewUrlFromApi(signedUrl ? String(signedUrl) : null);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewUrlFromApi(null);
          setPreviewError(
            error instanceof Error
              ? error.message
              : "No se pudo preparar la vista previa del documento.",
          );
        }
      }
    }

    void loadPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [open, resultado, fallbackArchivoId]);

  const archivo = useMemo(() => getArchivoInfo(resultado), [resultado]);
  const previewUrl = previewUrlFromApi ?? archivo.previewUrl;
  const expediente = useMemo(() => getExpedienteInfo(resultado, expedienteContexto), [resultado, expedienteContexto]);
  const tiposDisponibles = useMemo(() => {
    const base = (tiposDocumentalesPermitidos?.length ? tiposDocumentalesPermitidos : TIPOS_DOCUMENTALES)
      .map((tipo) => normalizeTipoParaUi(tipo))
      .filter(Boolean);

    return Array.from(new Set([...base, normalizeTipoParaUi(form.tipoDocumental)])).filter(Boolean);
  }, [form.tipoDocumental, tiposDocumentalesPermitidos]);
  const campos = useMemo(() => camposPorTipo(form.tipoDocumental), [form.tipoDocumental]);

  if (!open) return null;

  function updateField(name: keyof FormState, value: string) {
    if (readOnly) return;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function runAction(action: "save" | "confirm" | "reject", callback?: (form: FormState) => void | Promise<void>) {
    if (readOnly || !callback) return;

    setSubmittingAction(action);
    setActionError(null);
    setDuplicadoDetails(null);
    setLocalMessage(null);

    try {
      await callback(form);
      if (action === "save") {
        setLocalMessage("Cambios guardados correctamente.");
      }
    } catch (error) {
      const duplicate = getDocumentoDuplicadoDetailsFromError(error);
      if (action === "confirm" && duplicate) {
        setDuplicadoDetails(duplicate);
      }
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la acción solicitada.",
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  function handleSave() {
    void runAction("save", onSave);
  }

  function handleConfirm() {
    if (!expediente.id && !form.codigoExpediente.trim()) {
      setActionError("Selecciona o completa el expediente antes de guardar y confirmar.");
      return;
    }

    void runAction("confirm", onConfirm);
  }

  function handleReject() {
    void runAction("reject", onReject);
  }

  async function handleAgregarComoVersion() {
    if (!duplicadoDetails || !onAgregarComoVersion) return;

    setSubmittingAction("version");
    setActionError(null);
    setLocalMessage(null);

    try {
      await onAgregarComoVersion(duplicadoDetails);
      setLocalMessage("Archivo agregado como nueva versión correctamente.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el archivo como versión.",
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Validación visual documental
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">
{readOnly ? "Vista documental" : "Validación OCR"} - {archivo.nombre}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {readOnly
                ? "Consulta el documento y su metadata confirmada. Esta vista no modifica el OCR ni genera auditoría."
                : "Compara el documento con la metadata detectada. El modal no se cierra hasta confirmar, rechazar o cerrar manualmente."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </header>

        <section className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-[520px] overflow-auto border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 lg:border-b-0 lg:border-r">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title={`Vista previa ${archivo.nombre}`}
                className="h-full min-h-[620px] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800"
              />
            ) : (
              <div className="flex h-full min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-900">
                  📄
                </div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-slate-100">
                  Vista previa pendiente
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  {previewError
                    ? `No se pudo obtener la vista previa: ${previewError}`
                    : "Preparando URL firmada para visualizar el documento. Si demora, puedes cerrar y abrir nuevamente la validación."}
                </p>

                <div className="mt-6 w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-xs dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{archivo.nombre}</p>
                  <p className="mt-2 text-slate-500">Archivo ID: {texto(fallbackArchivoId)}</p>
                  <p className="mt-1 text-slate-500">Storage: {archivo.storageProvider}</p>
                  <p className="mt-1 text-slate-500">Bucket: {archivo.storageBucket}</p>
                  <p className="mt-1 break-all text-slate-500">Key: {archivo.storageKey}</p>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-auto p-5">
            <div className="space-y-5">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Tipo documental
                </span>
                <select
                  value={form.tipoDocumental}
                  disabled={readOnly || tipoDocumentalBloqueado}
                  onChange={(event) => updateField("tipoDocumental", event.target.value)}
                  className={`mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed dark:border-slate-800 dark:text-slate-100 ${
                    readOnly || tipoDocumentalBloqueado
                      ? "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      : "bg-white dark:bg-slate-950"
                  }`}
                >
                  {tiposDisponibles.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {campos.map((campo) => (
                  <FieldInput
                    key={campo}
                    name={campo}
                    value={String(form[campo] ?? "")}
                    onChange={updateField}
                    readOnly={readOnly}
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Expediente vinculado
                </p>
                {expediente.id ? (
                  <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                        #{expediente.id}
                        {expediente.codigo ? ` · ${expediente.codigo}` : ""}
                      </p>
                      {expediente.descripcion ? (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {expediente.descripcion}
                        </p>
                      ) : null}
                      {expediente.empresa ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {expediente.empresa}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/compras/${expediente.id}/ver`}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      Ver expediente
                    </Link>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Sin expediente vinculado. Completa el código de expediente antes de guardar y confirmar.
                  </p>
                )}
              </div>

              {readOnly ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                  Modo consulta: este documento ya está confirmado. Para modificarlo, usa un flujo de edición o carga una nueva versión.
                </div>
              ) : null}

              {duplicadoDetails ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">Este documento ya existe en el expediente.</p>
                  <div className="mt-2 space-y-1 text-xs">
                    {duplicadoDetails.claveDocumental ? <p>Clave: {duplicadoDetails.claveDocumental}</p> : null}
                    {duplicadoDetails.documentoIdExistente ? <p>Documento existente: {duplicadoDetails.documentoIdExistente}</p> : null}
                    {duplicadoDetails.documentoIdActual ? <p>Documento temporal: {duplicadoDetails.documentoIdActual}</p> : null}
                    {duplicadoDetails.archivoIdActual ? <p>Archivo nuevo: {duplicadoDetails.archivoIdActual}</p> : null}
                  </div>
                  <p className="mt-3 text-xs">
                    No se creará otro documento lógico. Puedes agregar este archivo como nueva versión del documento existente.
                  </p>
                  <button
                    type="button"
                    onClick={handleAgregarComoVersion}
                    disabled={submittingAction !== null || !onAgregarComoVersion || !duplicadoDetails.archivoIdActual || !duplicadoDetails.documentoIdExistente}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingAction === "version" ? "Agregando versión..." : "Agregar como versión"}
                  </button>
                </div>
              ) : null}

              {localMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {localMessage}
                </div>
              ) : null}

              {actionError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {actionError}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {readOnly
              ? "Modo consulta: no se reprocesa ni reconfirma el documento."
              : "El OCR propone datos. El usuario puede corregirlos manualmente antes de guardar o confirmar."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {readOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={submittingAction !== null}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-slate-950 dark:hover:bg-red-950/30"
                >
                  {submittingAction === "reject" ? "Rechazando..." : "Rechazar OCR"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Cancelar / Cerrar
                </button>
                {!duplicadoDetails ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={submittingAction !== null}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      {submittingAction === "save" ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submittingAction !== null}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                    >
                      {submittingAction === "confirm" ? "Confirmando..." : "Guardar y confirmar"}
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
