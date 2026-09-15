"use client";

import type { ReactNode } from "react";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FinanzasPaymentEstado =
  | "PENDIENTE"
  | "PARCIAL"
  | "COMPLETO"
  | string;

export type FinanzasPaymentItem = {
  id: string | number;
  montoLabel: string;
  banco?: string | null;
  operacion?: string | null;
  observacion?: string | null;
  visualizable?: boolean;
  contenidoExtra?: ReactNode;
};

export type FinanzasPaymentObservedItem = {
  id: string | number;
  montoLabel: string;
  banco?: string | null;
  operacion?: string | null;
  motivo?: string | null;
  fechaDecision?: string | null;
  visualizable?: boolean;
};

export type FinanzasPaymentCancelledItem = {
  id: string | number;
  label: string;
};

type FinanzasPaymentPanelProps = {
  estadoPago: FinanzasPaymentEstado;
  pagadoAcumuladoLabel: string;
  saldoLabel: string;

  adjuntarDisabled?: boolean;
  adjuntarHint?: ReactNode;
  previewLoadingId?: string | number | null;

  pagos: FinanzasPaymentItem[];
  observados?: FinanzasPaymentObservedItem[];
  anulados?: FinanzasPaymentCancelledItem[];

  puedeAdjuntar?: boolean;
  adjuntarLabel?: string;
  onAdjuntar?: () => void;
  onVerPago?: (item: FinanzasPaymentItem, index: number) => void;
  onVerObservado?: (
    item: FinanzasPaymentObservedItem,
    index: number,
  ) => void;

  formularioAdjuntar?: ReactNode;
};

export function FinanzasPaymentPanel({
  estadoPago,
  pagadoAcumuladoLabel,
  saldoLabel,
  pagos,
  observados = [],
  anulados = [],
  puedeAdjuntar = false,
  adjuntarLabel = "Adjuntar sustento de pago",
  adjuntarDisabled = false,
  adjuntarHint,
  previewLoadingId = null,
  onAdjuntar,
  onVerPago,
  onVerObservado,
  formularioAdjuntar,
}: FinanzasPaymentPanelProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Pagos
      </p>

      <div className="w-full rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Estado de pago
          </p>

          <Badge variant={estadoPago === "COMPLETO" ? "secondary" : "outline"}>
            {estadoPago}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              Pagado acumulado
            </dt>
            <dd className="mt-1 font-semibold">
              {pagadoAcumuladoLabel}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">
              Saldo
            </dt>
            <dd className="mt-1 font-semibold">{saldoLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sustentos de pago {pagos.length ? `(${pagos.length})` : ""}
        </p>

        {puedeAdjuntar && onAdjuntar ? (
        <Button
            type="button"
            size="sm"
            disabled={adjuntarDisabled}
            onClick={onAdjuntar}
        >
            + {adjuntarLabel}
        </Button>
        ) : null}
        {adjuntarHint ? (
            <div className="w-full text-right text-xs text-amber-700">
                {adjuntarHint}
            </div>
            ) : null}
      </div>

      {formularioAdjuntar}

      {pagos.length > 0 ? (
        <div className="w-full space-y-2">
          {pagos.map((item, index) => (
            <div
              key={String(item.id)}
              className="rounded-lg border p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Pago {index + 1}</span>

                  {onVerPago ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={
                        !item.visualizable ||
                        previewLoadingId === item.id
                        }
                      onClick={() => onVerPago(item, index)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      {previewLoadingId === item.id ? "Abriendo..." : "Ver"}
                    </Button>
                  ) : null}
                </div>

                <span className="font-semibold">{item.montoLabel}</span>
              </div>

              {item.banco || item.operacion ? (
                <p className="mt-1 text-muted-foreground">
                  {[
                    item.banco,
                    item.operacion ? `Op. ${item.operacion}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              {item.observacion ? (
                <p className="mt-1 text-muted-foreground">
                  {item.observacion}
                </p>
              ) : null}

              {item.contenidoExtra}
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          Aún no se han registrado sustentos de pago.
        </div>
      )}

      {observados.length > 0 ? (
        <details className="w-full rounded-lg border border-amber-200 bg-amber-50/40">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-amber-900">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>Sustentos observados ({observados.length})</span>
              <span className="font-normal text-amber-800">
                No afectan el pagado ni el saldo
              </span>
            </span>
          </summary>

          <div className="border-t border-amber-200 p-3">
            <div className="space-y-2">
              {observados.map((item, index) => (
                <div
                  key={String(item.id)}
                  className="rounded-md border bg-background p-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {item.banco || "Banco no disponible"}
                    </span>

                    <span className="font-semibold">
                      {item.montoLabel}
                    </span>
                  </div>

                  {item.operacion ? (
                    <p className="mt-1 text-muted-foreground">
                      Op. {item.operacion}
                    </p>
                  ) : null}

                  <p className="mt-1 text-muted-foreground">
                    {item.motivo || "Motivo no disponible"}
                  </p>

                  {item.fechaDecision ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.fechaDecision}
                    </p>
                  ) : null}

                  {onVerObservado ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      disabled={
                        !item.visualizable ||
                        previewLoadingId === item.id
                        }
                      onClick={() => onVerObservado(item, index)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      {previewLoadingId === item.id ? "Abriendo..." : "Ver"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      {anulados.length > 0 ? (
        <details className="w-full rounded-lg border bg-muted/20">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">
            Sustentos anulados ({anulados.length})
          </summary>

          <div className="border-t p-3 text-xs text-muted-foreground">
            {anulados.map((item) => (
              <div key={String(item.id)} className="py-1">
                {item.label}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}