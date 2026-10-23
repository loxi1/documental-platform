"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Pencil, ReceiptText, FileText } from "lucide-react";

import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { EditarOrdenPagoModal } from "@/components/finanzas/EditarOrdenPagoModal";
import { RegularizarOrdenPagoModal } from "@/components/finanzas/RegularizarOrdenPagoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { GrupoFacturaDocumentoVinculoV2 } from "@/services/documental-v2-workspace";
import type {
  OrdenPagoDetalle,
  ResumenFinancieroGrupo,
  SustentoFinancieroGrupo,
} from "@/services/finanzas";

type UnknownRecord = Record<string, unknown>;
type PreviewState = { archivoId: number | string; title: string } | null;

type Props = {
  detalle: OrdenPagoDetalle;
  documentosGrupo: GrupoFacturaDocumentoVinculoV2[];
  documentosGrupoLoading: boolean;
  documentosGrupoError: boolean;
  resumenFinanciero: ResumenFinancieroGrupo | null;
  resumenFinancieroLoading: boolean;
  resumenFinancieroError: boolean;
  onRefresh?: () => void | Promise<void>;
};

const TIPOS_ECONOMICOS = new Set(["FACTURA", "RECIBO_HONORARIO"]);

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function firstValue(...values: unknown[]) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function nestedRecord(source: UnknownRecord | null, key: string) {
  return source ? asRecord(source[key]) : null;
}

function documentoSources(item: GrupoFacturaDocumentoVinculoV2) {
  const root = item as UnknownRecord;
  const metadata = asRecord(root.metadata);
  const compatibilidad = nestedRecord(metadata, "compatibilidad");
  return [
    root,
    asRecord(root.vista),
    asRecord(root.documento),
    metadata,
    nestedRecord(metadata, "documentoV1"),
    nestedRecord(compatibilidad, "documentoV1"),
  ].filter(Boolean) as UnknownRecord[];
}

function pickFromSources(item: GrupoFacturaDocumentoVinculoV2, keys: string[]) {
  for (const source of documentoSources(item)) {
    for (const key of keys) {
      const value = source[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
  }
  return undefined;
}

function tipoEconomico(item: GrupoFacturaDocumentoVinculoV2) {
  return text(pickFromSources(item, ["tipoDocumental", "tipo_documental"]), "").toUpperCase();
}

export function seleccionarRegularizadorActivo(items: GrupoFacturaDocumentoVinculoV2[]) {
  const activos = items.filter(item => {
    const relacion = text(item.tipoRelacion ?? item.tipo_relacion, "");
    const esperado = relacion === "regularizador_factura" ? "FACTURA"
      : relacion === "regularizador_recibo_honorario" ? "RECIBO_HONORARIO" : null;
    const estadoDocumento = text(asRecord(item.documento)?.estado, "").toLowerCase();
    const id = Number(item.documentoId ?? item.documento_id);
    return esperado && text(item.estado, "").toLowerCase() === "activo" &&
      !["anulado", "anulada", "observado", "observada", "duplicado_versionado"].includes(estadoDocumento) &&
      (!tipoEconomico(item) || tipoEconomico(item) === esperado) && Number.isSafeInteger(id) && id > 0;
  });
  return activos.length === 1 ? activos[0] : null;
}

export function documentoEconomicoResumen(item: GrupoFacturaDocumentoVinculoV2) {
  const tipo = tipoEconomico(item);
  const serie = text(pickFromSources(item, ["serie"]), "");
  const numero = text(pickFromSources(item, ["numero", "numeroDocumento", "numero_documento"]), "");
  const archivoIdRaw = Object.prototype.hasOwnProperty.call(item, "archivoId")
    ? item.archivoId
    : pickFromSources(item, ["archivoId", "archivo_id", "archivoActualId", "archivo_actual_id"]);
  const archivoId = Number(archivoIdRaw);
  return {
    tipo,
    label: tipo === "RECIBO_HONORARIO" ? "RECIBO POR HONORARIOS" : "FACTURA",
    numero: serie && numero ? `${serie}-${numero}` : numero || serie || "—",
    emisor: text(pickFromSources(item, ["razonSocialEmisor", "razon_social_emisor", "nombreCompleto", "nombre_completo", "razonSocial", "razon_social", "proveedor"]), ""),
    ruc: text(pickFromSources(item, ["rucEmisor", "ruc_emisor", "rucProveedor", "ruc_proveedor"]), ""),
    fecha: text(pickFromSources(item, ["fechaEmision", "fecha_emision", "fecha"]), ""),
    monto: text(pickFromSources(item, ["montoTotal", "monto_total", "monto"]), ""),
    moneda: text(pickFromSources(item, ["moneda"]), ""),
    nombreArchivo: text(pickFromSources(item, ["nombreArchivo", "nombre_archivo", "filename"]), ""),
    archivoId: Number.isSafeInteger(archivoId) && archivoId > 0 ? archivoId : null,
  };
}

export function formatDate(value: string) {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatMonto(moneda: string, monto: string) {
  const numeric = Number(monto);
  if (!monto || Number.isNaN(numeric)) return [moneda, monto].filter(Boolean).join(" ") || "—";
  const currency = moneda.toUpperCase() === "USD" ? "USD" : "PEN";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2 }).format(numeric);
}

export function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm">{value || "—"}</div>
    </div>
  );
}

function montoPagoLabel(
  monto: string | null | undefined,
  moneda: string | null | undefined,
) {
  const value = String(monto ?? "").trim();
  if (!value) return "Monto no disponible";

  const currency = String(moneda ?? "").trim().toUpperCase();
  return currency ? `${currency} ${value}` : value;
}

function SustentoPagoResumen({
  sustento,
  label,
  onPreview,
}: {
  sustento: SustentoFinancieroGrupo;
  label: string;
  onPreview: (
    sustento: SustentoFinancieroGrupo,
    label: string,
  ) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>

          <p className="text-sm text-muted-foreground">
            {[
              sustento.banco,
              sustento.numeroReferencia
                ? `Op. ${sustento.numeroReferencia}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin banco u operación informados"}
          </p>

          <p className="text-sm text-muted-foreground">
            {[
              sustento.fecha,
              montoPagoLabel(sustento.monto, sustento.moneda),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {sustento.observacion ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {sustento.observacion}
            </p>
          ) : null}

          {sustento.motivo ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Motivo: {sustento.motivo}
            </p>
          ) : null}
        </div>

        {sustento.archivoId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreview(sustento, label)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OrdenPagoVerView({
  detalle,
  documentosGrupo,
  documentosGrupoLoading,
  documentosGrupoError,
  resumenFinanciero,
  resumenFinancieroLoading,
  resumenFinancieroError,
  onRefresh,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preview, setPreview] = useState<PreviewState>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [regularizarOpen, setRegularizarOpen] = useState(false);
  const [previewPago, setPreviewPago] = useState<PreviewState>(null);

  useEffect(() => {
    if (searchParams.get("accion") === "editar") {
      setEditarOpen(true);
    }
  }, [searchParams]);

  const documentosEconomicos = useMemo(
    () => {
      const activo = seleccionarRegularizadorActivo(documentosGrupo);
      return activo && TIPOS_ECONOMICOS.has(tipoEconomico(activo)) ? [activo] : [];
    },
    [documentosGrupo],
  );

  const codigoLegacy = `OP-${detalle.ordenPagoId}`;
  const numeroPresentacion = text(detalle.numero, codigoLegacy);
  const centroCodigo = text(detalle.contexto?.centroCostoCodigo, "");
  const contextoNombre = text(detalle.contexto?.nombre, "");
  const periodo =
    detalle.periodoAnio && detalle.periodoMes
      ? `${String(detalle.periodoMes).padStart(2, "0")}/${detalle.periodoAnio}`
      : detalle.periodoAnio
        ? String(detalle.periodoAnio)
        : "—";
  const concepto = text(
    detalle.conceptoNombre || detalle.conceptoCodigo,
    "—",
  );
  const beneficiario = text(detalle.proveedorRazonSocial || detalle.beneficiarioNombreLibre, "—");
  const estadoRegularizacion = text(
    detalle.estadoRegularizacion,
    "—",
  );

  const tiposPermitidos =
    detalle.tiposDocumentalesRegularizadoresPermitidos ?? [];

  // El frontend sólo representa la intersección:
  // permitido por snapshot ∩ consumidor operacional implementado.
  const regularizadoresOperativos = tiposPermitidos.filter((tipo) =>
    ["FACTURA", "RECIBO_HONORARIO"].includes(
      String(tipo).trim().toUpperCase(),
    ),
  );

  const puedeRegularizar =
    detalle.estadoRegularizacion === "PENDIENTE" &&
    regularizadoresOperativos.length > 0;

  function closeEditar() {
    setEditarOpen(false);
    if (searchParams.get("accion") === "editar") {
      router.replace(
        `/finanzas/ordenes-pago/${encodeURIComponent(
          String(detalle.ordenPagoId),
        )}/ver`,
      );
    }
  }

  async function refreshAndCloseEdit() {
    await onRefresh?.();
    closeEditar();
  }

  async function refreshAfterRegularizar() {
    await onRefresh?.();
    setRegularizarOpen(false);
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Finanzas</h1>

          {centroCodigo ? (
            <Badge variant="outline">{centroCodigo}</Badge>
          ) : null}

          {detalle.empresaCodigo ? (
            <Badge variant="outline">{detalle.empresaCodigo}</Badge>
          ) : null}

          {contextoNombre ? (
            <Badge variant="outline">{contextoNombre}</Badge>
          ) : null}
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/finanzas">Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Orden de Pago</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Consulta la orden y sus sustentos de pago asociados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditarOpen(true)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>

              {puedeRegularizar ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRegularizarOpen(true)}
                >
                  <ReceiptText className="mr-1.5 h-4 w-4" />
                  Regularizar
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="rounded-xl border p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
              <div className="min-w-0 space-y-4 lg:pr-5">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Documento principal
                  </p>

                  <div className="mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-semibold">
                          OP {numeroPresentacion}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">Orden de pago</Badge>
                        {detalle.archivoInicial && Number.isSafeInteger(detalle.archivoInicial.archivoId) && detalle.archivoInicial.archivoId > 0 ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => setPreview({ archivoId: detalle.archivoInicial!.archivoId, title: `OP ${numeroPresentacion}` })}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />Ver
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <Dato label="Periodo" value={periodo} />
                      <Dato label="Beneficiario" value={beneficiario} />
                      <Dato label="RUC beneficiario" value={text(detalle.proveedorRuc, "—")} />
                      <Dato
                        label="Estado regularización"
                        value={estadoRegularizacion}
                      />
                      <Dato label="Concepto" value={text(detalle.conceptoNombre, "Sin concepto asociado")} />
                      <Dato label="Clasificación" value={text(detalle.conceptoClasificacion, "—")} />
                      <Dato label="Moneda" value={text(detalle.moneda, "—")} />
                      <Dato
                        label="Monto"
                        value={formatMonto(
                          text(detalle.moneda, ""),
                          text(detalle.monto, ""),
                        )}
                      />
                    </dl>

                    <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
                      <Dato
                        label="Fecha emisión"
                        value={formatDate(text(detalle.fechaEmision, ""))}
                      />
                      <Dato
                        label="Referencia"
                        value={text(detalle.codigoPago, "—")}
                      />
                    </dl>

                    <div className="mt-4">
                      <Dato
                        label="Observación"
                        value={text(detalle.observacion, "—")}
                      />
                    </div>
                  </div>
                </section>

                <section className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Documento económico
                  </p>

                  {documentosGrupoLoading ? (
                    <Skeleton className="mt-3 h-16 w-full" />
                  ) : documentosGrupoError ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No se pudo cargar el documento económico.
                    </p>
                  ) : documentosEconomicos.length ? (
                    documentosEconomicos.map((item) => {
                      const resumen = documentoEconomicoResumen(item);

                      return (
                        <div
                          key={`${resumen.tipo}-${resumen.numero}`}
                          className="mt-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <p className="font-semibold">
                                {resumen.label} {resumen.numero}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{resumen.label}</Badge>

                              {resumen.archivoId ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5"
                                  onClick={() =>
                                    setPreview({
                                      archivoId: resumen.archivoId!,
                                      title: `${resumen.label} ${resumen.numero}`,
                                    })
                                  }
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Ver
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                            <Dato label="Emisor" value={resumen.emisor} />
                            <Dato label="RUC emisor" value={resumen.ruc} />
                            <Dato
                              label="Fecha"
                              value={formatDate(resumen.fecha)}
                            />
                            <Dato
                              label="Importe"
                              value={formatMonto(
                                resumen.moneda,
                                resumen.monto,
                              )}
                            />
                          </dl>
                        </div>
                      );
                    })
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sin documento económico asociado.
                    </p>
                  )}
                </section>
              </div>

              <div className="flex min-w-0 flex-col items-stretch gap-4 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Pagos
                </p>
          {resumenFinancieroLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : resumenFinancieroError ? (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No se pudo cargar el resumen financiero del grupo.
            </div>
          ) : resumenFinanciero ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Estado de pago
                  </p>
                  <p className="font-semibold">
                    {resumenFinanciero.pago.estado}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pagado acumulado
                  </p>
                  <p className="font-semibold">
                    {montoPagoLabel(
                      resumenFinanciero.pago.pagado,
                      resumenFinanciero.obligacion.moneda,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Saldo
                  </p>
                  <p className="font-semibold">
                    {montoPagoLabel(
                      resumenFinanciero.pago.saldo,
                      resumenFinanciero.obligacion.moneda,
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Sustentos de pago activos
                  </p>

                  {resumenFinanciero.sustentosActivos.length ? (
                    <div className="space-y-2">
                      {resumenFinanciero.sustentosActivos.map(
                        (sustento, index) => (
                          <SustentoPagoResumen
                            key={`activo-${sustento.vinculoId ?? sustento.documentoId}-${index}`}
                            sustento={sustento}
                            label={`Pago ${index + 1}`}
                            onPreview={(item, label) => {
                              if (item.archivoId) {
                                setPreviewPago({
                                  archivoId: item.archivoId,
                                  title: label,
                                });
                              }
                            }}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin sustentos de pago activos.
                    </p>
                  )}
                </div>

                {resumenFinanciero.sustentosObservados.length ? (
                  <details className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Sustentos observados (
                      {resumenFinanciero.sustentosObservados.length})
                    </summary>

                    <div className="mt-3 space-y-2">
                      {resumenFinanciero.sustentosObservados.map(
                        (sustento, index) => (
                          <SustentoPagoResumen
                            key={`observado-${sustento.vinculoId ?? sustento.documentoId}-${index}`}
                            sustento={sustento}
                            label={`Sustento observado ${index + 1}`}
                            onPreview={(item, label) => {
                              if (item.archivoId) {
                                setPreviewPago({
                                  archivoId: item.archivoId,
                                  title: label,
                                });
                              }
                            }}
                          />
                        ),
                      )}
                    </div>
                  </details>
                ) : null}

                {resumenFinanciero.sustentosAnulados.length ? (
                  <details className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Sustentos anulados (
                      {resumenFinanciero.sustentosAnulados.length})
                    </summary>

                    <div className="mt-3 space-y-2">
                      {resumenFinanciero.sustentosAnulados.map(
                        (sustento, index) => (
                          <SustentoPagoResumen
                            key={`anulado-${sustento.vinculoId ?? sustento.documentoId}-${index}`}
                            sustento={sustento}
                            label={`Sustento anulado ${index + 1}`}
                            onPreview={(item, label) => {
                              if (item.archivoId) {
                                setPreviewPago({
                                  archivoId: item.archivoId,
                                  title: label,
                                });
                              }
                            }}
                          />
                        ),
                      )}
                    </div>
                  </details>
                ) : null}
              </div>

              {resumenFinanciero.pago.estado !== "COMPLETO" ? (
                <Button asChild variant="outline">
                  <Link
                    href={`/finanzas/ordenes-pago/${encodeURIComponent(
                      String(detalle.ordenPagoId),
                    )}/adjuntar-pago`}
                  >
                    <ReceiptText className="mr-2 h-4 w-4" />
                    {resumenFinanciero.sustentosActivos.length
                      ? "Adjuntar otro pago"
                      : "Adjuntar sustento de pago"}
                  </Link>
                </Button>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Sin resumen financiero disponible.
            </div>
          )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(previewPago)}
        onClose={() => setPreviewPago(null)}
        className="mx-4 max-w-6xl p-5 md:p-6"
      >
        {previewPago ? (
          <div className="space-y-4">
            <div className="pr-10">
              <div className="text-lg font-semibold">Vista previa</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {previewPago.title}
              </div>
            </div>
            <PreviewDocumento
              archivoId={previewPago.archivoId}
              title={previewPago.title}
            />
          </div>
        ) : null}
      </Modal>

      <EditarOrdenPagoModal
        open={editarOpen}
        ordenPago={detalle}
        onClose={closeEditar}
        onCompleted={refreshAndCloseEdit}
      />

      <RegularizarOrdenPagoModal
        open={regularizarOpen}
        ordenPago={detalle}
        onClose={() => setRegularizarOpen(false)}
        onCompleted={refreshAfterRegularizar}
      />

      <Modal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        className="mx-4 max-w-6xl p-5 md:p-6"
      >
        {preview ? (
          <div className="space-y-4">
            <div className="pr-10">
              <div className="text-lg font-semibold">Vista previa</div>
              <div className="mt-1 text-sm text-muted-foreground">{preview.title}</div>
            </div>
            <PreviewDocumento archivoId={preview.archivoId} title={preview.title} />
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
