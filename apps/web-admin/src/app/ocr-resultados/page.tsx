"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useOcrResultados } from "@/hooks/useOcrResultados";
import {
  getOcrResultado,
  sugerirExpedienteOcr,
  vincularOcrAExpediente,
} from "@/services/ocr-resultados";
import type { OcrResultado, SugerenciaExpediente } from "@/types/ocr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RELACIONES_DOCUMENTALES = [
  "principal_oc",
  "principal_os",
  "principal_factura",
  "adjunto_factura",
  "adjunto_guia",
  "adjunto_nota_ingreso",
  "adjunto_transferencia",
  "adjunto_detraccion",
  "adjunto_recibo_honorario",
  "adjunto_otro",
] as const;

type MetadataOcr = Record<string, unknown> & {
  numero?: string | null;
  fechaEmision?: string | null;
  proveedor?: string | null;
  rucProveedor?: string | null;
  montoTotal?: number | string | null;
  moneda?: string | null;
  codigoExpediente?: string | null;
  expedienteId?: string | number | null;
  expedienteVinculado?: ExpedienteVinculado | null;
  vinculoExpediente?: ExpedienteVinculado | null;
};

type ExpedienteVinculado = {
  id?: string | number | null;
  expedienteId?: string | number | null;
  expediente_id?: string | number | null;
  cliente_destino_id?: string | number | null;
  clienteDestinoId?: string | number | null;
  empresa_codigo?: string | null;
  empresaCodigo?: string | null;
  cliente_abreviatura?: string | null;
  clienteAbreviatura?: string | null;
  codigo_expediente?: string | null;
  codigoExpediente?: string | null;
  descripcion?: string | null;
  nombre?: string | null;
  detalle?: string | null;
};

type OcrResultadoView = OcrResultado & {
  id: number;
  documento_id?: number | null;
  documentoId?: number | null;
  archivo_id?: number | null;
  archivoId?: number | null;
  tipo_propuesto?: string | null;
  tipoPropuesto?: string | null;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  estado?: string | null;
  confidence?: number | string | null;
  confianza?: number | string | null;
  clave_documental?: string | null;
  claveDocumental?: string | null;
  expediente_id?: string | number | null;
  expedienteId?: string | number | null;
  expediente_vinculado?: ExpedienteVinculado | null;
  expedienteVinculado?: ExpedienteVinculado | null;
  vinculoExpediente?: ExpedienteVinculado | null;
  nombre_archivo?: string | null;
  nombreArchivo?: string | null;
  storage_key?: string | null;
  storageKey?: string | null;
  metadata?: MetadataOcr | string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  vinculado_en?: string | null;
  vinculadoEn?: string | null;
};

type MetadataRow = {
  key: string;
  value: string;
};

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fecha(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("es-PE");
}

function porcentaje(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  if (numberValue <= 1) return `${Math.round(numberValue * 100)}%`;
  return `${Math.round(numberValue)}%`;
}

function parseMaybeJson<T = any>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === "object") return value as T;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return null;
}

function getMetadata(item?: OcrResultadoView | null): MetadataOcr {
  const raw = item as any;

  return (
    parseMaybeJson<MetadataOcr>(raw?.metadata) ??
    parseMaybeJson<MetadataOcr>(raw?.metadata_completa) ??
    parseMaybeJson<MetadataOcr>(raw?.metadataCompleta) ??
    {}
  );
}

function getTipo(item?: OcrResultadoView | null) {
  return texto(
    item?.tipo_propuesto ??
      item?.tipoPropuesto ??
      item?.tipo_documental ??
      item?.tipoDocumental,
  );
}

function getClave(item?: OcrResultadoView | null) {
  return texto(item?.clave_documental ?? item?.claveDocumental);
}

function getExpedienteVinculado(
  item?: OcrResultadoView | null,
): ExpedienteVinculado | null {
  const raw = item as any;
  const metadata = getMetadata(item);

  const vinculo =
    raw?.expedienteVinculado ??
    raw?.expediente_vinculado ??
    raw?.vinculoExpediente ??
    raw?.vinculo_expediente ??
    metadata?.expedienteVinculado ??
    (metadata as any)?.expediente_vinculado ??
    metadata?.vinculoExpediente ??
    (metadata as any)?.vinculo_expediente ??
    null;

  return parseMaybeJson<ExpedienteVinculado>(vinculo) ?? vinculo;
}

function getExpedienteId(item?: OcrResultadoView | null) {
  const metadata = getMetadata(item);
  const expedienteVinculado = getExpedienteVinculado(item);

  return (
    item?.expediente_id ??
    item?.expedienteId ??
    metadata.expedienteId ??
    expedienteVinculado?.id ??
    expedienteVinculado?.expedienteId ??
    expedienteVinculado?.expediente_id ??
    null
  );
}

function getCodigoExpediente(item?: OcrResultadoView | null) {
  const metadata = getMetadata(item);
  const expedienteVinculado = getExpedienteVinculado(item);

  return (
    expedienteVinculado?.codigoExpediente ??
    expedienteVinculado?.codigo_expediente ??
    metadata.codigoExpediente ??
    (metadata as any)?.codigo_expediente ??
    null
  );
}

function getDescripcionExpediente(item?: OcrResultadoView | null) {
  const expedienteVinculado = getExpedienteVinculado(item);

  return (
    expedienteVinculado?.descripcion ??
    expedienteVinculado?.nombre ??
    expedienteVinculado?.detalle ??
    null
  );
}

function getEmpresaExpediente(item?: OcrResultadoView | null) {
  const raw = item as any;
  const metadata = getMetadata(item);
  const expedienteVinculado = getExpedienteVinculado(item);

  return (
    expedienteVinculado?.empresaCodigo ??
    expedienteVinculado?.empresa_codigo ??
    expedienteVinculado?.clienteAbreviatura ??
    expedienteVinculado?.cliente_abreviatura ??
    raw?.clienteAbreviatura ??
    raw?.cliente_abreviatura ??
    metadata?.clienteAbreviatura ??
    (metadata as any)?.cliente_abreviatura ??
    null
  );
}

function estadoVinculacion(item: OcrResultadoView) {
  if (getExpedienteId(item)) return "Vinculado";
  if (item.estado === "confirmado") return "Pendiente vínculo";
  return "Pendiente revisión";
}

function defaultRelacion(item: OcrResultadoView | null) {
  const tipo = String(
    item?.tipo_propuesto ??
      item?.tipoPropuesto ??
      item?.tipo_documental ??
      item?.tipoDocumental ??
      "",
  ).toLowerCase();

  if (tipo === "oc") return "principal_oc";
  if (tipo === "os") return "principal_os";
  if (tipo === "factura") return "principal_factura";
  if (tipo === "guia" || tipo === "guia_remision") return "adjunto_guia";
  if (tipo === "nota_ingreso") return "adjunto_nota_ingreso";
  if (tipo === "recibo_honorario") return "adjunto_recibo_honorario";

  return "adjunto_factura";
}

function metadataToRows(metadata?: MetadataOcr | null): MetadataRow[] {
  if (!metadata) return [];

  return Object.entries(metadata).map(([key, value]) => ({
    key,
    value: typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
  }));
}

function asOcrResultadoView(item: OcrResultado): OcrResultadoView {
  return item as OcrResultadoView;
}

function getDocumentoId(item?: OcrResultadoView | null) {
  return item?.documento_id ?? item?.documentoId ?? null;
}

function getArchivoId(item?: OcrResultadoView | null) {
  return item?.archivo_id ?? item?.archivoId ?? null;
}

function getNombreArchivo(item?: OcrResultadoView | null) {
  return item?.nombre_archivo ?? item?.nombreArchivo ?? null;
}

export default function OcrResultadosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useOcrResultados();

  const resultados: OcrResultadoView[] = useMemo(
    () => (Array.isArray(data) ? data.map(asOcrResultadoView) : []),
    [data],
  );

  const [selected, setSelected] = useState<OcrResultadoView | null>(null);
  const [sugerencia, setSugerencia] = useState<SugerenciaExpediente | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expedienteId, setExpedienteId] = useState("");
  const [tipoRelacion, setTipoRelacion] = useState("adjunto_factura");

  const metadata = getMetadata(selected);
  const metadataRows = useMemo(() => metadataToRows(metadata), [metadata]);

  const selectedExpedienteId = getExpedienteId(selected);
  const selectedCodigoExpediente = getCodigoExpediente(selected);
  const selectedDescripcionExpediente = getDescripcionExpediente(selected);
  const selectedEmpresaExpediente = getEmpresaExpediente(selected);
  const selectedYaVinculado = Boolean(selectedExpedienteId);

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
  };

  const hydrateSelected = (ocr: OcrResultado) => {
    const view = asOcrResultadoView(ocr);
    const nextExpedienteId = getExpedienteId(view);

    setSelected(view);
    setSugerencia(null);
    setFeedback(null);
    setTipoRelacion(defaultRelacion(view));
    setExpedienteId(nextExpedienteId ? String(nextExpedienteId) : "");
  };

  const detalleMutation = useMutation({
    mutationFn: getOcrResultado,
    onSuccess: hydrateSelected,
  });

  const sugerirMutation = useMutation({
    mutationFn: sugerirExpedienteOcr,
    onSuccess: (result) => {
      setSugerencia(result);
      setFeedback(null);

      const expediente = result.expediente as any;
      if (expediente?.id) {
        setExpedienteId(String(expediente.id));
        setTipoRelacion("adjunto_factura");
      }
    },
  });

  const vincularMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Seleccione un OCR primero");
      if (!expedienteId) throw new Error("Ingrese un expediente ID");

      return vincularOcrAExpediente(selected.id, {
        expedienteId: Number(expedienteId),
        tipoRelacion,
        esPrincipal: tipoRelacion.startsWith("principal_"),
        orden: tipoRelacion.startsWith("principal_") ? 1 : 10,
      });
    },
    onSuccess: async () => {
      setFeedback("OCR vinculado correctamente al expediente.");
      refreshList();

      if (selected) {
        const updated = await getOcrResultado(selected.id);
        hydrateSelected(updated);
      }
    },
  });

  const abrirDetalle = (item: OcrResultadoView) => {
    detalleMutation.mutate(item.id);
  };

  const sugerir = (item: OcrResultadoView) => {
    hydrateSelected(item);
    sugerirMutation.mutate(item.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Cargando OCR resultados...
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Error cargando OCR resultados.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Documental Platform</p>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
            OCR Resultados
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Revisión de resultados OCR, expediente vinculado y acceso directo a Compras 360°.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">
            {resultados.length} resultados
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
            Listado
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecciona un OCR para revisar metadata y vínculo de expediente.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Vínculo</th>
                <th className="px-3 py-2">Expediente</th>
                <th className="px-3 py-2">Confianza</th>
                <th className="px-3 py-2">Clave documental</th>
                <th className="px-3 py-2">Archivo</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((item) => {
                const itemExpedienteId = getExpedienteId(item);
                const itemCodigoExpediente = getCodigoExpediente(item);
                const itemDescripcionExpediente = getDescripcionExpediente(item);
                const itemEmpresaExpediente = getEmpresaExpediente(item);
                const vinculado = Boolean(itemExpedienteId);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-3 font-medium text-slate-950 dark:text-slate-100">
                      {item.id}
                    </td>
                    <td className="px-3 py-3">{getTipo(item)}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{texto(item.estado)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={vinculado ? "secondary" : "outline"}>
                        {estadoVinculacion(item)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      {vinculado ? (
                        <div className="space-y-1">
                          <Link
                            href={`/compras/${itemExpedienteId}/ver`}
                            className="font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-slate-100"
                          >
                            #{String(itemExpedienteId)}
                            {itemCodigoExpediente ? ` · ${itemCodigoExpediente}` : ""}
                          </Link>
                          {itemDescripcionExpediente ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {itemDescripcionExpediente}
                            </p>
                          ) : null}
                          {itemEmpresaExpediente ? (
                            <p className="text-xs text-slate-400">
                              {itemEmpresaExpediente}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-400">—</span>
                          <p className="text-xs text-slate-400">Sin expediente</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {porcentaje(item.confidence ?? item.confianza)}
                    </td>
                    <td className="px-3 py-3">{getClave(item)}</td>
                    <td className="px-3 py-3">{texto(getNombreArchivo(item))}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDetalle(item)}
                        >
                          Ver
                        </Button>
                        {!vinculado ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sugerir(item)}
                          >
                            Sugerir
                          </Button>
                        ) : null}
                        {vinculado ? (
                          <Button asChild size="sm" variant="default">
                            <Link href={`/compras/${itemExpedienteId}/ver`}>
                              Ver expediente
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!resultados.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    No hay resultados OCR.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                Detalle OCR
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Metadata OCR y datos útiles para validar el documento.
              </p>
            </div>

            {selected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setSugerencia(null);
                  setFeedback(null);
                }}
              >
                Cerrar
              </Button>
            ) : null}
          </div>

          {selected ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["OCR ID", selected.id],
                  ["Documento ID", getDocumentoId(selected)],
                  ["Archivo ID", getArchivoId(selected)],
                  ["Tipo", getTipo(selected)],
                  ["Estado", selected.estado],
                  ["Confianza", porcentaje(selected.confidence ?? selected.confianza)],
                  ["Número", metadata.numero],
                  ["Fecha emisión", metadata.fechaEmision],
                  ["Código expediente", metadata.codigoExpediente],
                  ["Proveedor", metadata.proveedor],
                  ["RUC proveedor", metadata.rucProveedor],
                  ["Monto", metadata.montoTotal],
                  ["Moneda", metadata.moneda],
                  ["Clave documental", getClave(selected)],
                  ["Archivo", getNombreArchivo(selected)],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {texto(value)}
                    </p>
                  </div>
                ))}
              </div>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  Expediente vinculado
                </h3>

                {selectedYaVinculado ? (
                  <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Expediente
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">
                        #{String(selectedExpedienteId)}
                        {selectedCodigoExpediente
                          ? ` · ${selectedCodigoExpediente}`
                          : ""}
                      </p>
                      {selectedDescripcionExpediente ? (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {selectedDescripcionExpediente}
                        </p>
                      ) : null}
                      {selectedEmpresaExpediente ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {selectedEmpresaExpediente}
                        </p>
                      ) : null}
                    </div>

                    <Button asChild size="sm" variant="outline">
                      <Link href={`/compras/${selectedExpedienteId}/ver`}>
                        Ver expediente
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Este resultado OCR aún no tiene expediente vinculado.
                  </p>
                )}
              </section>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-950 dark:text-slate-100">
                  Metadata completa
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-950">
                      <tr>
                        <th className="px-3 py-2">Campo</th>
                        <th className="px-3 py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metadataRows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-t border-slate-100 dark:border-slate-800"
                        >
                          <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                            {row.key}
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                            {row.value}
                          </td>
                        </tr>
                      ))}

                      {!metadataRows.length ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-slate-400">
                            Sin metadata disponible.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selecciona un resultado OCR del listado para revisar el detalle.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
              Vincular a expediente
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Usa un expediente existente. No crea expedientes nuevos desde esta vista.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Expediente ID
                </label>
                <Input
                  value={expedienteId}
                  onChange={(event) => setExpedienteId(event.target.value)}
                  placeholder="Ejemplo: 41"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Relación documental
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  value={tipoRelacion}
                  onChange={(event) => setTipoRelacion(event.target.value)}
                >
                  {RELACIONES_DOCUMENTALES.map((relacion) => (
                    <option key={relacion} value={relacion}>
                      {relacion}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                className="w-full"
                disabled={
                  vincularMutation.isPending || !selected || !expedienteId
                }
                onClick={() => vincularMutation.mutate()}
              >
                {vincularMutation.isPending ? "Vinculando..." : "Vincular OCR"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
              Sugerencia de expediente
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consulta la sugerencia del backend y completa el ID para vincular.
            </p>

            <Button
              className="mt-4 w-full"
              variant="outline"
              disabled={!selected || sugerirMutation.isPending}
              onClick={() => selected && sugerirMutation.mutate(selected.id)}
            >
              {sugerirMutation.isPending
                ? "Consultando..."
                : "Sugerir expediente"}
            </Button>

            {sugerencia ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="font-semibold text-slate-950 dark:text-slate-100">
                  Resultado
                </p>
                {sugerencia.expediente ? (
                  <div className="mt-2 space-y-1 text-slate-500 dark:text-slate-400">
                    {(() => {
                      const expediente = sugerencia.expediente as any;

                      return (
                        <>
                          <p>
                            ID: {texto(expediente?.id)}
                          </p>
                          <p>
                            Código: {texto(
                              expediente?.codigoExpediente ??
                                expediente?.codigo_expediente ??
                                expediente?.codigo,
                            )}
                          </p>
                          <p>
                            Descripción: {texto(expediente?.descripcion)}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="mt-2 text-slate-500 dark:text-slate-400">
                    No se encontró expediente sugerido.
                  </p>
                )}
              </div>
            ) : null}
          </section>

          {feedback ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              {feedback}
            </section>
          ) : null}

          {(detalleMutation.error || sugerirMutation.error || vincularMutation.error) ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              Ocurrió un error ejecutando la acción. Revisa consola o backend.
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
