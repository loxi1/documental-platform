"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Eye, FileText, X } from "lucide-react";

import {
  BANCO_OPTIONS,
  MONEDA_OPTIONS,
  hasCatalogValue,
} from "@/constants/catalogos";

import { AdjuntarDocumento } from "@/components/common/AdjuntarDocumento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FinanzasPaymentPanel,
  type FinanzasPaymentCancelledItem,
  type FinanzasPaymentItem,
  type FinanzasPaymentObservedItem,
} from "@/components/finanzas/FinanzasPaymentPanel";

type EstadoPago = "PENDIENTE" | "PARCIAL" | "COMPLETO";

type OrdenPagoResumen = {
  codigo?: string | null;
  centroCostoCodigo?: string | null;
  centroCostoDescripcion?: string | null;
  tipo?: string | null;
  subtipo?: string | null;
  fechaEmision?: string | null;
  moneda?: string | null;
  monto?: string | number | null;
  estadoPago?: EstadoPago | null;
  pagado?: string | number | null;
  saldo?: string | number | null;
};

type DocumentoEconomico = {
  tipo?: "FACTURA" | "RH" | string | null;
  numero?: string | null;
  fecha?: string | null;
  monto?: string | number | null;
  moneda?: string | null;
  visualizable?: boolean;
};

type SustentoOrdenPago = {
  nombre?: string | null;
  tipo?: string | null;
  visualizable?: boolean;
};

type SustentoPago = {
  id: string | number;
  fecha?: string | null;
  banco?: string | null;
  referencia?: string | null;
  monto?: string | number | null;
  moneda?: string | null;
  estado?: "CONFIRMADO" | "OBSERVADO" | "ANULADO" | string | null;
  observacion?: string | null;
  visualizable?: boolean;
};

type Props = {
  ordenPagoId: string;
  resumen?: OrdenPagoResumen | null;
  documentoEconomico?: DocumentoEconomico | null;
  sustentos?: SustentoPago[];
  sustentoOrden?: SustentoOrdenPago | null;
};

function text(value: unknown, fallback = "—") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function formatMonto(
  monto: string | number | null | undefined,
  moneda: string | null | undefined,
) {
  if (monto === null || monto === undefined || monto === "") {
    return "No disponible";
  }

  const monedaNormalizada = String(moneda ?? "").trim().toUpperCase();

  if (monedaNormalizada === "PEN") return `S/ ${monto}`;
  if (monedaNormalizada === "USD") return `USD ${monto}`;

  return `${monedaNormalizada || ""} ${monto}`.trim();
}

export function OrdenPagoAdjuntarPagoView({
  ordenPagoId,
  resumen,
  documentoEconomico = null,
  sustentoOrden = null,
  sustentos = [],
}: Props) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaPago, setFechaPago] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("");
  const [banco, setBanco] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observacion, setObservacion] = useState("");

  const pagosActivos = useMemo(
    () =>
      sustentos.filter((item) => {
        const estado = String(item.estado ?? "").toUpperCase();
        return estado !== "OBSERVADO" && estado !== "ANULADO";
      }),
    [sustentos],
  );

  const observados = useMemo(
    () =>
      sustentos.filter(
        (item) => String(item.estado ?? "").toUpperCase() === "OBSERVADO",
      ),
    [sustentos],
  );

  const anulados = useMemo(
    () =>
      sustentos.filter(
        (item) => String(item.estado ?? "").toUpperCase() === "ANULADO",
      ),
    [sustentos],
  );

  const pagosPaymentPanel = useMemo<FinanzasPaymentItem[]>(
    () =>
      pagosActivos.map((item) => ({
        id: item.id,
        montoLabel: formatMonto(item.monto, item.moneda),
        banco: item.banco,
        operacion: item.referencia,
        observacion: item.observacion,
        visualizable: item.visualizable === true,
      })),
    [pagosActivos],
  );

  const observadosPaymentPanel = useMemo<FinanzasPaymentObservedItem[]>(
    () =>
      observados.map((item) => ({
        id: item.id,
        montoLabel: formatMonto(item.monto, item.moneda),
        banco: item.banco,
        operacion: item.referencia,
        motivo: item.observacion,
        visualizable: item.visualizable === true,
      })),
    [observados],
  );

  const anuladosPaymentPanel = useMemo<FinanzasPaymentCancelledItem[]>(
    () =>
      anulados.map((item) => ({
        id: item.id,
        label: [item.banco, item.referencia]
          .filter(Boolean)
          .join(" · ") || "Sustento anulado",
      })),
    [anulados],
  );

  const codigo =
    resumen?.codigo?.trim() ||
    `OP-${String(ordenPagoId).padStart(6, "0")}`;

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Orden de Pago
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{codigo}</h1>

          {resumen?.centroCostoCodigo ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Centro {resumen.centroCostoCodigo}
              {resumen.centroCostoDescripcion
                ? ` · ${resumen.centroCostoDescripcion}`
                : ""}
            </p>
          ) : null}
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/finanzas">Volver</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <div className="min-w-0 space-y-4 lg:pr-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Documento principal
                </p>

                <div className="mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="truncate font-semibold">{codigo}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">Orden de pago</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5"
                        disabled
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Ver
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {resumen?.centroCostoCodigo ? (
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">
                          Centro de costo
                        </dt>
                        <dd className="mt-1 font-medium">
                          {resumen.centroCostoCodigo}
                        </dd>
                        {resumen.centroCostoDescripcion ? (
                          <dd className="text-xs text-muted-foreground">
                            {resumen.centroCostoDescripcion}
                          </dd>
                        ) : null}
                      </div>
                    ) : null}

                    {resumen?.tipo ? (
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">
                          Tipo
                        </dt>
                        <dd className="mt-1 font-medium">
                          {resumen.tipo}
                          {resumen.subtipo ? ` · ${resumen.subtipo}` : ""}
                        </dd>
                      </div>
                    ) : null}

                    {resumen?.fechaEmision ? (
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">
                          Fecha
                        </dt>
                        <dd className="mt-1 font-medium">
                          {resumen.fechaEmision}
                        </dd>
                      </div>
                    ) : null}

                    {resumen?.monto !== null &&
                    resumen?.monto !== undefined ? (
                      <div>
                        <dt className="text-xs font-medium uppercase text-muted-foreground">
                          Monto
                        </dt>
                        <dd className="mt-1 font-medium">
                          {formatMonto(resumen.monto, resumen.moneda)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Sustento de la orden
                </p>

                {sustentoOrden ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {text(sustentoOrden.nombre, "Sustento de la orden")}
                        </div>

                        {sustentoOrden.tipo ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {sustentoOrden.tipo}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {sustentoOrden.visualizable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5"
                        disabled
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Ver
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    Sin sustento inicial asociado a la orden.
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Documento económico
                </p>

                {documentoEconomico ? (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="truncate font-semibold">
                          {text(documentoEconomico.numero)}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">
                          {text(documentoEconomico.tipo)}
                        </Badge>

                        {documentoEconomico.visualizable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5"
                            disabled
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Ver
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      {documentoEconomico.fecha ? (
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Fecha
                          </dt>
                          <dd className="mt-1 font-medium">
                            {documentoEconomico.fecha}
                          </dd>
                        </div>
                      ) : null}

                      {documentoEconomico.monto !== null &&
                      documentoEconomico.monto !== undefined ? (
                        <div>
                          <dt className="text-xs font-medium uppercase text-muted-foreground">
                            Importe
                          </dt>
                          <dd className="mt-1 font-medium">
                            {formatMonto(
                              documentoEconomico.monto,
                              documentoEconomico.moneda,
                            )}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    Sin documento económico asociado.
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col items-start gap-3 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <FinanzasPaymentPanel
                estadoPago={resumen?.estadoPago ?? "PENDIENTE"}
                pagadoAcumuladoLabel={formatMonto(
                  resumen?.pagado,
                  resumen?.moneda,
                )}
                saldoLabel={formatMonto(
                  resumen?.saldo,
                  resumen?.moneda,
                )}
                pagos={pagosPaymentPanel}
                observados={observadosPaymentPanel}
                anulados={anuladosPaymentPanel}
                puedeAdjuntar
                adjuntarLabel={
                  pagosActivos.length > 0
                    ? "Adjuntar otro pago"
                    : "Adjuntar sustento de pago"
                }
                onAdjuntar={() =>
                  setMostrarFormulario((value) => !value)
                }
                formularioAdjuntar={
                  mostrarFormulario ? (
                    <div className="w-full rounded-lg border bg-muted/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Nuevo sustento de pago
                        </p>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setMostrarFormulario(false);
                            setArchivo(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">
                            Cerrar formulario
                          </span>
                        </Button>
                      </div>

                      <div className="mt-3 space-y-3">
                        {archivo ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {archivo.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(archivo.size / 1024).toFixed(1)} KB · Seleccionado localmente
                              </p>
                              <p className="mt-0.5 text-xs text-amber-700">
                                Pendiente de conexión con carga temporal
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setArchivo(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <AdjuntarDocumento
                            label="Seleccionar sustento de pago"
                            description="Selecciona un PDF o imagen. No se enviará todavía."
                            onSelect={(files) =>
                              setArchivo(files[0] ?? null)
                            }
                          />
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            type="date"
                            value={fechaPago}
                            onChange={(e) =>
                              setFechaPago(e.target.value)
                            }
                          />

                          <Input
                            inputMode="decimal"
                            placeholder="Monto"
                            value={monto}
                            onChange={(e) =>
                              setMonto(e.target.value)
                            }
                          />

                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={moneda}
                            onChange={(e) =>
                              setMoneda(e.target.value)
                            }
                          >
                            <option value="">
                              Seleccionar moneda
                            </option>

                            {moneda &&
                            !hasCatalogValue(
                              MONEDA_OPTIONS,
                              moneda,
                            ) ? (
                              <option value={moneda}>
                                {moneda}
                              </option>
                            ) : null}

                            {MONEDA_OPTIONS.map((item) => (
                              <option
                                key={item.codigo}
                                value={item.nombre}
                              >
                                {item.nombre}
                              </option>
                            ))}
                          </select>

                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={banco}
                            onChange={(e) =>
                              setBanco(e.target.value)
                            }
                          >
                            <option value="">
                              Seleccionar banco
                            </option>

                            {banco &&
                            !hasCatalogValue(
                              BANCO_OPTIONS,
                              banco,
                            ) ? (
                              <option value={banco}>
                                {banco}
                              </option>
                            ) : null}

                            {BANCO_OPTIONS.map((item) => (
                              <option
                                key={item.codigo}
                                value={item.nombre}
                              >
                                {item.nombre}
                              </option>
                            ))}
                          </select>

                          <Input
                            className="sm:col-span-2"
                            placeholder="Número / referencia de operación"
                            value={referencia}
                            onChange={(e) =>
                              setReferencia(e.target.value)
                            }
                          />

                          <textarea
                            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                            placeholder="Observación"
                            value={observacion}
                            onChange={(e) =>
                              setObservacion(e.target.value)
                            }
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button type="button" disabled>
                            Guardar sustento
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : undefined
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}