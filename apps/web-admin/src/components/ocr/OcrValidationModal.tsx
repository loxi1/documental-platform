"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDocumentoArchivoPreviewUrl, type DocumentoArchivoPreview } from "@/services/documentos-preview";

const TIPOS_DOCUMENTALES = [
  "OC",
  "OS",
  "FACTURA",
  "GUIA",
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

type OcrValidationModalProps = {
  open: boolean;
  resultado: unknown;
  fallbackArchivoId?: string | number;
  onClose: () => void;
  onSave?: (form: FormState) => void;
  onConfirm?: (form: FormState) => void;
  onReject?: (form: FormState) => void;
};

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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

function getExpedienteInfo(resultado: unknown) {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);
  const vinculado = getExpedienteVinculado(resultado);

  const id =
    raw.expedienteId ??
    raw.expediente_id ??
    vinculado?.id ??
    vinculado?.expedienteId ??
    vinculado?.expediente_id ??
    metadata.expedienteId ??
    metadata.expediente_id ??
    null;

  return {
    id: id ? String(id) : "",
    codigo: texto(
      vinculado?.codigoExpediente ??
        vinculado?.codigo_expediente ??
        raw.codigoExpediente ??
        raw.codigo_expediente ??
        metadata.codigoExpediente ??
        metadata.codigo_expediente,
      "",
    ),
    descripcion: texto(
      vinculado?.descripcion ?? vinculado?.nombre ?? vinculado?.detalle,
      "",
    ),
    empresa: texto(
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

function buildInitialForm(resultado: unknown): FormState {
  const raw = getRaw(resultado);
  const metadata = getMetadata(resultado);

  return {
    tipoDocumental: texto(
      raw.tipoDocumental ?? raw.tipo_documental ?? metadata.tipoDocumental ?? metadata.tipo_documental,
      "OC",
    ),
    numero: texto(raw.numero ?? metadata.numero, ""),
    serie: texto(raw.serie ?? metadata.serie, ""),
    fechaEmision: texto(raw.fechaEmision ?? raw.fecha_emision ?? metadata.fechaEmision ?? metadata.fecha_emision, ""),
    proveedor: texto(raw.proveedor ?? raw.razonSocialEmisor ?? metadata.proveedor ?? metadata.razonSocialEmisor, ""),
    rucProveedor: texto(raw.rucProveedor ?? raw.ruc_proveedor ?? metadata.rucProveedor ?? metadata.ruc_proveedor, ""),
    rucComprador: texto(raw.rucComprador ?? raw.ruc_comprador ?? metadata.rucComprador ?? metadata.ruc_comprador, ""),
    rucEmisor: texto(raw.rucEmisor ?? raw.ruc_emisor ?? metadata.rucEmisor ?? metadata.ruc_emisor, ""),
    razonSocial: texto(raw.razonSocial ?? raw.razon_social ?? metadata.razonSocial ?? metadata.razon_social, ""),
    montoTotal: texto(raw.montoTotal ?? raw.monto_total ?? metadata.montoTotal ?? metadata.monto_total, ""),
    moneda: texto(raw.moneda ?? metadata.moneda, ""),
    cotizacion: texto(raw.cotizacion ?? metadata.cotizacion, ""),
    codigoExpediente: texto(raw.codigoExpediente ?? raw.codigo_expediente ?? metadata.codigoExpediente ?? metadata.codigo_expediente, ""),
    claveDocumental: texto(raw.claveDocumental ?? raw.clave_documental ?? metadata.claveDocumental ?? metadata.clave_documental, ""),
    documentoRelacionado: texto(raw.documentoRelacionado ?? raw.documento_relacionado ?? metadata.documentoRelacionado ?? metadata.documento_relacionado, ""),
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
      "razonSocial",
      "montoTotal",
      "moneda",
      "codigoExpediente",
      "claveDocumental",
    ];
  }

  if (normalizado === "GUIA") {
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
}: {
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {FIELD_LABELS[name]}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

export type { FormState as OcrValidationFormState };

export function OcrValidationModal({
  open,
  resultado,
  fallbackArchivoId,
  onClose,
  onSave,
  onConfirm,
  onReject,
}: OcrValidationModalProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(resultado));
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentoArchivoPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(resultado));
      setLocalMessage(null);
      setPreview(null);
      setPreviewError(null);
    }
  }, [open, resultado]);

  useEffect(() => {
    if (!open || !fallbackArchivoId) return;

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    getDocumentoArchivoPreviewUrl(fallbackArchivoId)
      .then((data) => {
        if (!active) return;
        setPreview(data);
      })
      .catch((error) => {
        if (!active) return;
        setPreview(null);
        setPreviewError(
          error?.response?.data?.message ??
            error?.message ??
            "No se pudo cargar la vista previa firmada.",
        );
      })
      .finally(() => {
        if (!active) return;
        setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, fallbackArchivoId]);

  const archivoBase = useMemo(() => getArchivoInfo(resultado), [resultado]);
  const archivo = useMemo(() => ({
    ...archivoBase,
    nombre: preview?.filename ?? archivoBase.nombre,
    storageProvider: preview?.storageProvider ?? archivoBase.storageProvider,
    storageBucket: preview?.storageBucket ?? archivoBase.storageBucket,
    storageKey: preview?.storageKey ?? archivoBase.storageKey,
    previewUrl: preview?.signedUrl ?? archivoBase.previewUrl,
    contentType: preview?.contentType ?? null,
  }), [archivoBase, preview]);
  const expediente = useMemo(() => getExpedienteInfo(resultado), [resultado]);
  const campos = useMemo(() => camposPorTipo(form.tipoDocumental), [form.tipoDocumental]);

  if (!open) return null;

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSave() {
    onSave?.(form);
    setLocalMessage("Cambios guardados localmente. Pendiente de conectar confirmación final.");
  }

  function handleConfirm() {
    onConfirm?.(form);
  }

  function handleReject() {
    onReject?.(form);
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
              Validación OCR - {archivo.nombre}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Compara el documento con la metadata detectada. El modal no se cierra hasta confirmar, rechazar o cerrar manualmente.
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
            {archivo.previewUrl && String(archivo.contentType ?? "").startsWith("image/") ? (
              <div className="flex h-full min-h-[620px] items-center justify-center rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <img
                  src={archivo.previewUrl}
                  alt={`Vista previa ${archivo.nombre}`}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
            ) : archivo.previewUrl ? (
              <iframe
                src={archivo.previewUrl}
                title={`Vista previa ${archivo.nombre}`}
                className="h-full min-h-[620px] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800"
              />
            ) : (
              <div className="flex h-full min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-900">
                  📄
                </div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-slate-100">
                  {previewLoading ? "Generando vista previa..." : "Vista previa pendiente"}
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  {previewError
                    ? `No se pudo cargar la URL firmada: ${previewError}`
                    : "Aún no hay URL firmada disponible para visualizar el documento. Si el endpoint falla o expira, este placeholder se mantiene."}
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
                  onChange={(event) => updateField("tipoDocumental", event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {TIPOS_DOCUMENTALES.map((tipo) => (
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
                    Sin expediente vinculado. Puedes guardar la validación y vincular luego desde la bandeja OCR.
                  </p>
                )}
              </div>

              {localMessage ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  {localMessage}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            MVP frontend-only: los botones dejan preparado el flujo para conectar confirmar/rechazar sin crear endpoints nuevos.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleReject}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:hover:bg-red-950/30"
            >
              Rechazar OCR
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              Cancelar / Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              Guardar y confirmar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
