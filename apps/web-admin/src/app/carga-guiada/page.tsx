"use client";

import Link from "next/link";
import { OcrValidationModal, type OcrValidationFormState } from "@/components/ocr/OcrValidationModal";
import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  procesarArchivoOcr,
  type ProcesarOcrPayload,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";

const TIPOS_DOCUMENTALES = [
  "OC",
  "OS",
  "FACTURA",
  "GUIA",
  "NOTA_INGRESO",
  "TRANSFERENCIA",
  "DETRACCION",
  "RECIBO_HONORARIO",
] as const;

const AREAS_ORIGEN = ["COMPRAS", "ALMACEN", "FINANZAS", "CONTABILIDAD"] as const;

type ResultadoNormalizado = {
  ok: boolean;
  documentoId: string;
  archivoId: string;
  tipoDocumental: string;
  estado: string;
  confidence: string;
  claveDocumental: string;
  expedienteId: string;
  codigoExpediente: string;
  empresaCodigo: string;
  clienteDestinoId: string;
  metadata: Record<string, unknown> | null;
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

function getNestedRecord(
  value: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown> | null {
  const raw = value?.[key];
  return parseMaybeJson(raw);
}

function getExpedienteVinculado(
  resultado: ProcesarOcrResultado | null | undefined,
): Record<string, unknown> | null {
  if (!resultado) return null;

  const raw = resultado as Record<string, unknown>;
  const metadata = parseMaybeJson(raw.metadata);

  return (
    parseMaybeJson(raw.expedienteVinculado) ??
    parseMaybeJson(raw.expediente_vinculado) ??
    parseMaybeJson(raw.vinculoExpediente) ??
    parseMaybeJson(raw.vinculo_expediente) ??
    getNestedRecord(metadata, "expedienteVinculado") ??
    getNestedRecord(metadata, "expediente_vinculado") ??
    getNestedRecord(metadata, "vinculoExpediente") ??
    getNestedRecord(metadata, "vinculo_expediente") ??
    null
  );
}

function getMetadata(resultado: ProcesarOcrResultado | null | undefined) {
  if (!resultado) return null;
  const raw = resultado as Record<string, unknown>;
  return parseMaybeJson(raw.metadata);
}

function normalizarResultado(
  resultado: ProcesarOcrResultado | null | undefined,
): ResultadoNormalizado | null {
  if (!resultado) return null;

  const raw = resultado as Record<string, unknown>;
  const metadata = getMetadata(resultado);
  const vinculado = getExpedienteVinculado(resultado);

  const expedienteId =
    raw.expedienteId ??
    raw.expediente_id ??
    vinculado?.id ??
    vinculado?.expedienteId ??
    vinculado?.expediente_id ??
    metadata?.expedienteId ??
    metadata?.expediente_id;

  return {
    ok: Boolean(raw.ok ?? raw.success ?? true),
    documentoId: texto(raw.documentoId ?? raw.documento_id),
    archivoId: texto(raw.archivoId ?? raw.archivo_id),
    tipoDocumental: texto(raw.tipoDocumental ?? raw.tipo_documental ?? metadata?.tipoDocumental),
    estado: texto(raw.estado),
    confidence: texto(raw.confidence),
    claveDocumental: texto(raw.claveDocumental ?? raw.clave_documental),
    expedienteId: texto(expedienteId),
    codigoExpediente: texto(
      raw.codigoExpediente ??
        raw.codigo_expediente ??
        vinculado?.codigoExpediente ??
        vinculado?.codigo_expediente ??
        metadata?.codigoExpediente,
    ),
    empresaCodigo: texto(
      vinculado?.empresaCodigo ??
        vinculado?.empresa_codigo ??
        raw.empresaCodigo ??
        raw.empresa_codigo,
    ),
    clienteDestinoId: texto(
      vinculado?.clienteDestinoId ??
        vinculado?.cliente_destino_id ??
        raw.clienteDestinoId ??
        raw.cliente_destino_id,
    ),
    metadata,
  };
}

function metadataToRows(metadata: Record<string, unknown> | null) {
  if (!metadata) return [] as Array<[string, string]>;

  return Object.entries(metadata).map(([key, value]) => [
    key,
    typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : texto(value),
  ]) as Array<[string, string]>;
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
        {texto(value)}
      </p>
    </div>
  );
}

export default function CargaGuiadaPage() {
  const [archivoId, setArchivoId] = useState("3788");
  const [tipoEsperado, setTipoEsperado] = useState("OC");
  const [areaOrigen, setAreaOrigen] = useState("COMPRAS");
  const [reprocesar, setReprocesar] = useState(true);
  const [modalValidacionAbierto, setModalValidacionAbierto] = useState(false);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: ProcesarOcrPayload = {
        tipoEsperado,
        areaOrigen,
        canalIngreso: "WEB_GUIADA_MVP",
        reprocesar,
      };

      return procesarArchivoOcr(archivoId.trim(), payload);
    },
    onSuccess: () => {
      setMensajeValidacion(null);
      setModalValidacionAbierto(true);
    },
  });

  const resultado = useMemo(
    () => normalizarResultado(mutation.data),
    [mutation.data],
  );

  const metadataRows = useMemo(
    () => metadataToRows(resultado?.metadata ?? null),
    [resultado?.metadata],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!archivoId.trim()) return;
    mutation.mutate();
  }

  function handleGuardarValidacion(form: OcrValidationFormState) {
    console.info("Validación OCR guardada localmente", form);
    setMensajeValidacion("Cambios guardados localmente. Pendiente conectar endpoint de edición OCR.");
  }

  function handleConfirmarValidacion(form: OcrValidationFormState) {
    console.info("Validación OCR confirmada localmente", form);
    setMensajeValidacion("OCR confirmado localmente. Pendiente conectar endpoint de confirmación.");
    setModalValidacionAbierto(false);
  }

  function handleRechazarValidacion(form: OcrValidationFormState) {
    console.info("Validación OCR rechazada localmente", form);
    setMensajeValidacion("OCR marcado como rechazado localmente. Pendiente conectar endpoint de rechazo.");
    setModalValidacionAbierto(false);
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Documental Platform</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
              Carga guiada MVP
            </h1>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              archivo existente
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Procesa OCR sobre un archivo ya registrado. Esta versión no sube PDFs nuevos ni modifica backend.
          </p>
        </div>

        {resultado?.expedienteId && resultado.expedienteId !== "—" ? (
          <Link
            href={`/compras/${resultado.expedienteId}/ver`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Ver expediente
          </Link>
        ) : null}
      </header>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">
            Parámetros de procesamiento
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Caso demo sugerido: archivo ID 3788, tipo OC y área COMPRAS.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Archivo ID
              </span>
              <input
                value={archivoId}
                onChange={(event) => setArchivoId(event.target.value)}
                placeholder="Ejemplo: 3788"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tipo esperado
              </span>
              <select
                value={tipoEsperado}
                onChange={(event) => setTipoEsperado(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {TIPOS_DOCUMENTALES.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Área origen
              </span>
              <select
                value={areaOrigen}
                onChange={(event) => setAreaOrigen(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {AREAS_ORIGEN.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <input
                type="checkbox"
                checked={reprocesar}
                onChange={(event) => setReprocesar(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Reprocesar si ya existe resultado OCR
            </label>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || !archivoId.trim()}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            {mutation.isPending ? "Procesando..." : "Procesar OCR"}
          </button>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            Endpoint usado:
            <br />
            <code>POST /api/v1/documentos/archivos/:archivoId/procesar-ocr</code>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">
                Resultado OCR
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Respuesta normalizada para validar vínculo documental y expediente.
              </p>
            </div>

            {resultado ? (
              <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {resultado.ok ? "OK" : "Revisar"}
              </span>
            ) : null}
          </div>

          {mutation.isError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              No se pudo procesar el OCR. Revisa que el archivo ID exista y que el Gateway esté activo.
            </div>
          ) : null}

          {mensajeValidacion ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {mensajeValidacion}
            </div>
          ) : null}

          {!resultado && !mutation.isError ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Ejecuta el procesamiento para ver el resultado OCR.
            </div>
          ) : null}

          {resultado ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Documento ID" value={resultado.documentoId} />
                <Field label="Archivo ID" value={resultado.archivoId} />
                <Field label="Tipo documental" value={resultado.tipoDocumental} />
                <Field label="Estado" value={resultado.estado} />
                <Field label="Confianza" value={resultado.confidence} />
                <Field label="Clave documental" value={resultado.claveDocumental} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Expediente vinculado
                    </p>
                    {resultado.expedienteId !== "—" ? (
                      <>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">
                          #{resultado.expedienteId}
                          {resultado.codigoExpediente !== "—"
                            ? ` · ${resultado.codigoExpediente}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {resultado.empresaCodigo !== "—" ? resultado.empresaCodigo : "Empresa no informada"}
                          {resultado.clienteDestinoId !== "—"
                            ? ` · Cliente destino ${resultado.clienteDestinoId}`
                            : ""}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Sin expediente vinculado.
                      </p>
                    )}
                  </div>

                  {resultado.expedienteId !== "—" ? (
                    <Link
                      href={`/compras/${resultado.expedienteId}/ver`}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Ver expediente
                    </Link>
                  ) : null}
                </div>
              </div>

              <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer text-sm font-semibold text-slate-950 dark:text-slate-100">
                  Metadata OCR
                </summary>

                {metadataRows.length ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2 font-medium">Campo</th>
                          <th className="px-3 py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {metadataRows.map(([key, value]) => (
                          <tr key={key}>
                            <td className="w-56 px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                              {key}
                            </td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                              <span className="break-all">{value}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No hay metadata disponible.
                  </p>
                )}
              </details>
            </div>
          ) : null}
        </section>
      </section>
      </div>

      <OcrValidationModal
        open={modalValidacionAbierto}
        resultado={mutation.data ?? null}
        fallbackArchivoId={archivoId}
        onClose={() => setModalValidacionAbierto(false)}
        onSave={handleGuardarValidacion}
        onConfirm={handleConfirmarValidacion}
        onReject={handleRechazarValidacion}
      />
    </>
  );
}