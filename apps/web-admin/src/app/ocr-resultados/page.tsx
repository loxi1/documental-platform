"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useOcrResultados } from "@/hooks/useOcrResultados";
import {
  crearExpedienteDesdeOcr,
  getOcrResultado,
  sugerirExpedienteOcr,
  vincularOcrAExpediente,
} from "@/services/ocr-resultados";
import { OcrResultado, SugerenciaExpediente } from "@/types/ocr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  "adjunto_pago_transferencia",
  "adjunto_pago_detraccion",
  "adjunto_recibo_honorario",
];

function parseClienteFromClave(clave?: string | null) {
  return clave?.split("|")?.[0] || "BBTI";
}

function parseYearFromOcr(item: OcrResultado | null) {
  const fecha = item?.metadata?.fechaEmision;

  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha.slice(0, 4);
  }

  return new Date().getFullYear().toString();
}

function defaultRelacion(item: OcrResultado | null) {
  const tipo = item?.tipo_propuesto?.toLowerCase();

  if (tipo === "oc") return "principal_oc";
  if (tipo === "os") return "principal_os";
  if (tipo === "factura") return "principal_factura";
  if (tipo === "guia_remision") return "adjunto_guia";
  if (tipo === "nota_ingreso") return "adjunto_nota_ingreso";
  if (tipo === "recibo_honorario") return "adjunto_recibo_honorario";

  return "adjunto_factura";
}

function metadataToRows(metadata?: Record<string, unknown> | null) {
  if (!metadata) return [];

  return Object.entries(metadata).map(([key, value]) => ({
    key,
    value:
      typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? ""),
  }));
}

function estadoVinculacion(item: OcrResultado) {
  if (item.expediente_id) return "Vinculado";
  if (item.estado === "confirmado") return "Pendiente vínculo";
  return "Pendiente confirmación";
}

export default function OcrResultadosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useOcrResultados();

  const [selected, setSelected] = useState<OcrResultado | null>(null);
  const [sugerencia, setSugerencia] = useState<SugerenciaExpediente | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expedienteId, setExpedienteId] = useState("");
  const [tipoRelacion, setTipoRelacion] = useState("adjunto_factura");
  const [correlativo, setCorrelativo] = useState("");
  const [tipoExpediente, setTipoExpediente] = useState("OP");
  const [codigoOp, setCodigoOp] = useState("");
  const [codigoCentroCosto, setCodigoCentroCosto] = useState("");

  const metadataRows = useMemo(
    () => metadataToRows(selected?.metadata),
    [selected],
  );

  const selectedYaVinculado = Boolean(selected?.expediente_id);

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
  };

  const hydrateSelected = (ocr: OcrResultado) => {
    setSelected(ocr);
    setSugerencia(null);
    setFeedback(null);
    setTipoRelacion(defaultRelacion(ocr));
    setExpedienteId(ocr.expediente_id ? String(ocr.expediente_id) : "");

    const cliente = parseClienteFromClave(ocr.clave_documental);
    const year = parseYearFromOcr(ocr);
    setCorrelativo(`${cliente}-${year}-OCR-${ocr.id}`);
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

      if (result.expediente?.id) {
        setExpedienteId(String(result.expediente.id));
        setTipoRelacion("adjunto_factura");
      }
    },
  });

  const crearMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Seleccione un OCR primero");

      const relacion = tipoRelacion || defaultRelacion(selected);
      const cliente = parseClienteFromClave(selected.clave_documental);

      return crearExpedienteDesdeOcr(selected.id, {
        correlativo,
        empresaCodigo: cliente,
        tipoExpediente,
        codigoOp: codigoOp || null,
        codigoCentroCosto: codigoCentroCosto || null,
        descripcion: `Expediente creado desde OCR ${selected.id}`,
        tipoRelacionPrincipal: relacion,
      });
    },
    onSuccess: async () => {
      setFeedback("Expediente creado correctamente desde OCR.");
      refreshList();

      if (selected) {
        const updated = await getOcrResultado(selected.id);
        hydrateSelected(updated);
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

  const abrirDetalle = (item: OcrResultado) => {
    detalleMutation.mutate(item.id);
  };

  const sugerir = async (item: OcrResultado) => {
    hydrateSelected(item);
    sugerirMutation.mutate(item.id);
  };

  if (isLoading) {
    return <div className="p-6">Cargando OCR resultados...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error cargando OCR resultados
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">OCR Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Propuestas OCR generadas por el worker. Desde aquí se revisan,
            sugieren y vinculan a expedientes.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Prioridad: confirmar, sugerir y vincular a expediente.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">ID</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Vínculo</th>
                  <th>Confianza</th>
                  <th>Clave documental</th>
                  <th>Archivo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {data?.map((item) => {
                  const vinculado = Boolean(item.expediente_id);

                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.id}</td>
                      <td>{item.tipo_propuesto}</td>
                      <td>
                        <Badge variant="secondary">
                          {item.estado}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={vinculado ? "default" : "outline"}>
                          {estadoVinculacion(item)}
                        </Badge>
                      </td>
                      <td>{Number(item.confidence).toFixed(2)}</td>
                      <td className="font-mono text-xs">
                        {item.clave_documental}
                      </td>
                      <td className="max-w-80 truncate" title={item.nombre_archivo}>
                        {item.nombre_archivo}
                      </td>
                      <td className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDetalle(item)}
                        >
                          Ver
                        </Button>

                        {!vinculado && (
                          <Button
                            size="sm"
                            onClick={() => sugerir(item)}
                          >
                            Sugerir
                          </Button>
                        )}

                        {vinculado && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/expedientes/${item.expediente_id}`}>
                              Expediente
                            </Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!data?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay resultados OCR.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Detalle OCR #{selected.id}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.nombre_archivo} · {selected.clave_documental}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedYaVinculado && (
                  <Button size="sm" asChild>
                    <Link href={`/expedientes/${selected.expediente_id}`}>
                      Ir al expediente
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    setSugerencia(null);
                    setFeedback(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {selectedYaVinculado && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                Este OCR ya está vinculado al expediente #{selected.expediente_id}.
                {selected.vinculado_en ? ` Vinculado en: ${selected.vinculado_en}.` : ""}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-4">
              <Info label="Tipo" value={selected.tipo_propuesto} />
              <Info label="Estado" value={selected.estado} />
              <Info label="Confianza" value={Number(selected.confidence).toFixed(2)} />
              <Info label="Documento ID" value={selected.documento_id ?? "-"} />
              <Info label="Expediente ID" value={selected.expediente_id ?? "-"} />
              <Info label="Vinculado en" value={selected.vinculado_en ?? "-"} />
              <Info label="Storage" value={selected.storage_provider} />
              <Info label="Creado en" value={selected.creado_en} />
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Metadata detectada</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <tbody>
                    {metadataRows.map((row) => (
                      <tr key={row.key} className="border-b last:border-0">
                        <td className="w-52 bg-muted/40 px-3 py-2 font-medium">
                          {row.key}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.value}
                        </td>
                      </tr>
                    ))}

                    {!metadataRows.length && (
                      <tr>
                        <td className="px-3 py-4 text-muted-foreground">
                          Sin metadata disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {!selectedYaVinculado && (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Sugerencia</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Busca si ya existe un expediente con la misma clave principal.
                    </p>

                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => sugerirMutation.mutate(selected.id)}
                      disabled={sugerirMutation.isPending}
                    >
                      {sugerirMutation.isPending ? "Consultando..." : "Sugerir expediente"}
                    </Button>

                    {sugerencia && (
                      <div className="mt-4 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                        <Info label="Acción" value={sugerencia.accion} />
                        <Info label="Motivo" value={sugerencia.motivo} />
                        <Info label="Confianza" value={`${sugerencia.confidence}%`} />
                        {sugerencia.expediente && (
                          <>
                            <Info label="Expediente ID" value={sugerencia.expediente.id} />
                            <Info label="Correlativo" value={sugerencia.expediente.correlativo} />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Vincular a expediente</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Usa la sugerencia o ingresa manualmente el ID del expediente.
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Expediente ID</span>
                        <Input
                          value={expedienteId}
                          onChange={(event) => setExpedienteId(event.target.value)}
                          placeholder="Ej. 1"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Tipo relación</span>
                        <select
                          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                          value={tipoRelacion}
                          onChange={(event) => setTipoRelacion(event.target.value)}
                        >
                          {RELACIONES_DOCUMENTALES.map((relacion) => (
                            <option key={relacion} value={relacion}>
                              {relacion}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => vincularMutation.mutate()}
                      disabled={vincularMutation.isPending || !expedienteId}
                    >
                      {vincularMutation.isPending ? "Vinculando..." : "Vincular expediente"}
                    </Button>
                  </div>
                </div>

                {!sugerencia?.expediente && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Crear expediente desde OCR</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Úsalo cuando la sugerencia indique que no existe expediente para la clave documental.
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Correlativo</span>
                        <Input
                          value={correlativo}
                          onChange={(event) => setCorrelativo(event.target.value)}
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Tipo expediente</span>
                        <Input
                          value={tipoExpediente}
                          onChange={(event) => setTipoExpediente(event.target.value)}
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Código OP</span>
                        <Input
                          value={codigoOp}
                          onChange={(event) => setCodigoOp(event.target.value)}
                          placeholder="Ej. 050001"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Centro costo</span>
                        <Input
                          value={codigoCentroCosto}
                          onChange={(event) => setCodigoCentroCosto(event.target.value)}
                          placeholder="Ej. 030001"
                        />
                      </label>
                    </div>

                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => crearMutation.mutate()}
                      disabled={crearMutation.isPending || !correlativo}
                    >
                      {crearMutation.isPending ? "Creando..." : "Crear expediente"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {feedback && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                {feedback}
              </div>
            )}

            {(detalleMutation.error || sugerirMutation.error || crearMutation.error || vincularMutation.error) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                Ocurrió un error ejecutando la acción. Revisa consola o backend.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-all text-sm">{value}</div>
    </div>
  );
}
