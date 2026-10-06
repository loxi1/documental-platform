"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CreditCard, Eye, FileText, X } from "lucide-react";

import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import {
  OcrValidationModal,
  type OcrValidationFormState,
} from "@/components/ocr/OcrValidationModal";
import { prevalidarDocumentoGuiado } from "@/services/carga-guiada";
import {
  crearCargaSeguraIdempotencyKey,
  subirDocumentoCargaSegura,
} from "@/services/carga-segura";
import {
  editarOcrResultado,
  procesarArchivoOcr,
} from "@/services/ocr-procesamiento";
import { getOcrResultado } from "@/services/ocr-resultados";
import {
  confirmarPagoOrdenPago,
  getUploadPendienteOrdenPago,
  type UploadPendienteOrdenPago,
} from "@/services/finanzas";
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
import { formatMontoFinanzas } from "@/components/finanzas/finanzas-moneda";

type EstadoPago = "PENDIENTE" | "PARCIAL" | "COMPLETO" | "PENDIENTE DE PAGO" | "SIN PAGOS";

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
  conceptoCodigo: string | null;
  conceptoNombre: string | null;
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
  archivoId?: number | null;
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
  expedienteId: number | null;
  empresaCodigo: string | null;
  documentoBaseId: number;
  grupoFacturaId: number;
  resumen?: OrdenPagoResumen | null;
  documentoEconomico?: DocumentoEconomico | null;
  sustentos?: SustentoPago[];
  sustentoOrden?: SustentoOrdenPago | null;
};

function text(value: unknown, fallback = "—") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}


export function OrdenPagoAdjuntarPagoView({
  ordenPagoId,
  expedienteId,
  empresaCodigo,
  documentoBaseId,
  grupoFacturaId,
  resumen,
  documentoEconomico = null,
  sustentoOrden = null,
  sustentos = [],
}: Props) {
  const [previewSustento, setPreviewSustento] = useState<{ archivoId: number; nombre: string } | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensajePipeline, setMensajePipeline] = useState<string | null>(null);
  const [ocrResultado, setOcrResultado] = useState<unknown>(null);
  const [ocrResultadoId, setOcrResultadoId] = useState<number | null>(null);
  const [archivoIdPersistido, setArchivoIdPersistido] = useState<number | null>(null);
  const [recuperacionUpload, setRecuperacionUpload] =
    useState<UploadPendienteOrdenPago | null>(null);
  const [estadoRecuperacion, setEstadoRecuperacion] =
    useState<"CARGANDO" | "SIN_UPLOAD" | "UPLOAD_PERSISTIDO" | "ERROR">("CARGANDO");
  const [errorRecuperacion, setErrorRecuperacion] = useState<string | null>(null);
  const [decisionPendienteForm, setDecisionPendienteForm] =
    useState<OcrValidationFormState | null>(null);
  const [motivoDecision, setMotivoDecision] = useState("");
  const inputAdjuntarRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  function numeroPositivo(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function resolverOcrResultadoId(value: unknown): number | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    return numeroPositivo(
      record.ocrResultadoId ?? record.ocr_resultado_id ?? record.id,
    );
  }

  function metadataPago(form: OcrValidationFormState) {
    return {
      fechaPago: form.fechaPago,
      montoTotal: form.montoTotal,
      moneda: form.moneda,
      banco: form.banco,
      numeroOperacion: form.numeroOperacion,
    };
  }

  const saldoNumerico = Number(resumen?.saldo ?? 0);
  const puedeAdjuntarOtroPago =
    Number.isFinite(saldoNumerico) &&
    saldoNumerico > 0 &&
    estadoRecuperacion === "SIN_UPLOAD" &&
    !decisionPendienteForm &&
    !procesando;

  const pagoCompleto =
    Number.isFinite(saldoNumerico) && saldoNumerico <= 0;

  function seleccionarNuevoSustento() {
    if (!puedeAdjuntarOtroPago) return;
    inputAdjuntarRef.current?.click();
  }

  async function refrescarFinanzas() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orden-pago-detalle"] }),
      queryClient.invalidateQueries({ queryKey: ["finanzas-resumen-grupo"] }),
    ]);
  }


  useEffect(() => {
    const id = Number(ordenPagoId);
    let activo = true;

    setEstadoRecuperacion("CARGANDO");
    setErrorRecuperacion(null);
    setRecuperacionUpload(null);

    if (!Number.isSafeInteger(id) || id <= 0) {
      setEstadoRecuperacion("ERROR");
      setErrorRecuperacion(
        "No se pudo resolver la Orden de Pago para recuperar el sustento pendiente.",
      );
      return () => {
        activo = false;
      };
    }

    void getUploadPendienteOrdenPago(id)
      .then((resultado) => {
        if (!activo) return;

        if (resultado.existe !== true) {
          setArchivoIdPersistido(null);
          setOcrResultadoId(null);
          setRecuperacionUpload(resultado);
          setDecisionPendienteForm(null);
          setEstadoRecuperacion("SIN_UPLOAD");
          setMostrarFormulario(false);
          return;
        }

        const archivoId = numeroPositivo(resultado.upload?.archivoId);

        if (!archivoId || !resultado.upload) {
          throw new Error(
            "La recuperación indicó un upload persistido sin archivo válido.",
          );
        }

        const ocrId = numeroPositivo(resultado.ocr?.ocrResultadoId);

        setArchivoIdPersistido(archivoId);
        setOcrResultadoId(ocrId);
        setRecuperacionUpload(resultado);
        setEstadoRecuperacion("UPLOAD_PERSISTIDO");

        const validacionPendiente =
          resultado.ocr?.validacionPendientePago ?? null;
        const identidadPendiente = validacionPendiente?.identidad ?? null;

        const decisionPersistidaValida =
          String(validacionPendiente?.estado ?? "").toUpperCase() ===
            "PENDIENTE_DECISION" &&
          Boolean(ocrId) &&
          Number(identidadPendiente?.ocrResultadoId) === Number(ocrId) &&
          Number(identidadPendiente?.expedienteId) === Number(expedienteId) &&
          Number(identidadPendiente?.documentoBaseId) ===
            Number(documentoBaseId) &&
          Number(identidadPendiente?.grupoFacturaId) ===
            Number(grupoFacturaId);

        if (decisionPersistidaValida) {
          setDecisionPendienteForm(
            (validacionPendiente?.metadata ?? {}) as OcrValidationFormState,
          );
          setMotivoDecision("");
        } else {
          setDecisionPendienteForm(null);
        }

        setMostrarFormulario(true);
      })
      .catch((error: unknown) => {
        if (!activo) return;

        setRecuperacionUpload(null);
        setEstadoRecuperacion("ERROR");
        setErrorRecuperacion(
          error instanceof Error
            ? error.message
            : "No se pudo recuperar el sustento pendiente de la Orden de Pago.",
        );

        // Error/conflicto NO equivale a SIN_UPLOAD:
        // mantenemos abierto el mismo bloque, pero nunca habilitamos reupload.
        setMostrarFormulario(true);
      });

    return () => {
      activo = false;
    };
  }, [ordenPagoId]);

  async function confirmarDesdeModal(
    form: OcrValidationFormState,
    decisionCorrespondencia?: {
      accion: "ACEPTAR" | "OBSERVAR" | "AUTORIZAR_EXCEPCION";
      motivo?: string | null;
    },
  ) {
    if (!ocrResultadoId) {
      setMensajePipeline("No se pudo resolver el resultado OCR.");
      return;
    }

    setProcesando(true);
    setMensajePipeline(null);

    try {
      await editarOcrResultado(ocrResultadoId, {
        metadata: metadataPago(form),
        observacion: form.observacion?.trim() || undefined,
      });

      await confirmarPagoOrdenPago(Number(ordenPagoId), {
        ocrResultadoId,
        metadata: metadataPago(form),
        ...(form.observacion?.trim()
          ? { observacion: form.observacion.trim() }
          : {}),
        ...(decisionCorrespondencia ? { decisionCorrespondencia } : {}),
      });

      setOcrResultado(null);
      setOcrResultadoId(null);
      setArchivoIdPersistido(null);
      setDecisionPendienteForm(null);
      setMotivoDecision("");
      setArchivo(null);
      setMostrarFormulario(false);
      await refrescarFinanzas();
    } catch (error) {
      const response = (
        error as {
          response?: {
            status?: number;
            data?: unknown;
          };
        }
      )?.response;

      const responseData = response?.data as
        | {
            error?: {
              code?: string;
              details?: {
                code?: string;
              };
            };
          }
        | undefined;

      const codigoConflicto = String(
        responseData?.error?.details?.code ??
          responseData?.error?.code ??
          "",
      ).trim();

      if (
        response?.status === 409 &&
        codigoConflicto === "DECISION_CORRESPONDENCIA_REQUERIDA"
      ) {
        setDecisionPendienteForm(form);
        setMotivoDecision("");
        setOcrResultado(null);
        setMensajePipeline(
          "El pago requiere una decisión de correspondencia. Puede aceptarlo u observarlo usando el mismo OCR, sin volver a cargar el archivo.",
        );
        return;
      }

      setMensajePipeline(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el sustento de pago.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function resolverDecisionPersistida(
    accion: "OBSERVAR" | "AUTORIZAR_EXCEPCION",
  ) {
    const motivo = motivoDecision.trim();
    const id = numeroPositivo(recuperacionUpload?.ocr?.ocrResultadoId);
    const validacionPendiente =
      recuperacionUpload?.ocr?.validacionPendientePago ?? null;
    const identidad = validacionPendiente?.identidad ?? null;

    const contextoValido =
      motivo.length > 0 &&
      Boolean(id) &&
      String(validacionPendiente?.estado ?? "").toUpperCase() ===
        "PENDIENTE_DECISION" &&
      Number(identidad?.ocrResultadoId) === Number(id) &&
      Number(identidad?.expedienteId) === Number(expedienteId) &&
      Number(identidad?.documentoBaseId) === Number(documentoBaseId) &&
      Number(identidad?.grupoFacturaId) === Number(grupoFacturaId);

    if (!contextoValido || !id) {
      setMensajePipeline(
        motivo.length === 0
          ? "Ingrese un comentario antes de registrar la decisión."
          : "No se pudo reconstruir de forma segura la validación pendiente.",
      );
      return;
    }

    setProcesando(true);
    setMensajePipeline(null);

    try {
      await confirmarPagoOrdenPago(Number(ordenPagoId), {
        ocrResultadoId: id,
        metadata:
          validacionPendiente?.metadata &&
          typeof validacionPendiente.metadata === "object"
            ? validacionPendiente.metadata
            : {},
        observacion:
          accion === "OBSERVAR"
            ? "Pago observado desde Finanzas"
            : "Excepción de pago autorizada desde Finanzas",
        decisionCorrespondencia: {
          accion,
          motivo,
        },
      });

      setDecisionPendienteForm(null);
      setMotivoDecision("");
      setOcrResultado(null);
      setOcrResultadoId(null);
      setArchivoIdPersistido(null);
      setRecuperacionUpload(null);
      setArchivo(null);
      setMostrarFormulario(false);
      setEstadoRecuperacion("SIN_UPLOAD");

      await refrescarFinanzas();
    } catch (error) {
      setMensajePipeline(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la decisión sobre el sustento de pago.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function revisarOcrRecuperado() {
    const id = numeroPositivo(recuperacionUpload?.ocr?.ocrResultadoId);

    if (!id) {
      setMensajePipeline("El upload persistido no tiene un resultado OCR revisable.");
      return;
    }

    setProcesando(true);
    setMensajePipeline(null);

    try {
      const resultado = await getOcrResultado(id);
      setOcrResultadoId(id);
      setOcrResultado(resultado);
    } catch (error) {
      setMensajePipeline(
        error instanceof Error
          ? error.message
          : "No se pudo recuperar el resultado OCR persistido.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function iniciarPipeline(archivoSeleccionado?: File) {
    if (expedienteId === null) {
      setMensajePipeline(
        "La Orden de Pago no tiene expediente disponible para la carga documental.",
      );
      return;
    }

    if (empresaCodigo === null) {
      setMensajePipeline(
        "La Orden de Pago no tiene empresa destino disponible para la prevalidación.",
      );
      return;
    }

    const archivoPipeline = archivoSeleccionado ?? archivo;

    if (!archivoPipeline) {
      setMensajePipeline("Seleccione un sustento de pago.");
      return;
    }

    setProcesando(true);
    setMensajePipeline("Cargando archivo…");

    try {
      const payloadGuiado = {
        areaOrigen: "FINANZAS" as const,
        clienteAbreviatura: empresaCodigo,
        tipoEsperado: "TRANSFERENCIA" as const,
        expedienteId,
        documentoBaseId,
        grupoFacturaId,
        tipoRelacionSugerida: "adjunto_transferencia" as const,
        canalIngreso: "WEB_ADMIN_GUIADO",
        esPrincipal: false,
      };

      const prevalidacion = await prevalidarDocumentoGuiado(
        payloadGuiado,
        archivoPipeline,
      );

      const accionSugerida = String(
        prevalidacion.accionSugerida ?? "",
      ).trim();

      const duplicado =
        accionSugerida === "abrir_existente" &&
        Array.isArray(prevalidacion.duplicados) &&
        prevalidacion.duplicados.length > 0
          ? prevalidacion.duplicados[0]
          : null;

      let archivoId = duplicado
        ? numeroPositivo(
            duplicado.archivoId ?? duplicado.archivo_id,
          )
        : null;

      if (accionSugerida === "abrir_existente" && !archivoId) {
        throw new Error(
          "El archivo existente no tiene archivoId suficiente para reutilizarlo.",
        );
      }

      if (!archivoId) {
        const carga = await subirDocumentoCargaSegura(
          payloadGuiado,
          archivoPipeline,
          {
            idempotencyKey: crearCargaSeguraIdempotencyKey(
              "web",
              expedienteId,
              "finanzas",
            ),
          },
        );

        archivoId = numeroPositivo(
          carga.archivoId ?? carga.archivo_id,
        );
      }

      if (!archivoId) {
        throw new Error("No se pudo resolver archivoId del sustento.");
      }

      setArchivoIdPersistido(archivoId);

      const uploadPersistido = await getUploadPendienteOrdenPago(
        Number(ordenPagoId),
      );

      if (
        uploadPersistido.existe !== true ||
        !uploadPersistido.upload ||
        numeroPositivo(uploadPersistido.upload.archivoId) !== archivoId
      ) {
        throw new Error(
          "El archivo fue persistido, pero no pudo reconstruirse de forma canónica. No vuelva a cargarlo.",
        );
      }

      setRecuperacionUpload(uploadPersistido);
      setEstadoRecuperacion("UPLOAD_PERSISTIDO");
      setErrorRecuperacion(null);
      setMensajePipeline("Procesando OCR…");

      const resultadoProcesamiento = await procesarArchivoOcr(archivoId, {
        tipoEsperado: "TRANSFERENCIA",
        areaOrigen: "FINANZAS",
        expedienteId,
        documentoBaseId,
        tipoRelacionSugerida: "adjunto_transferencia",
        canalIngreso: "WEB_ADMIN_GUIADO",
      });

      const resultadoId = resolverOcrResultadoId(resultadoProcesamiento);

      if (!resultadoId) {
        throw new Error("No se pudo resolver el resultado OCR.");
      }

      const resultadoOcr = await getOcrResultado(resultadoId);

      setOcrResultadoId(resultadoId);

      const uploadConOcr = await getUploadPendienteOrdenPago(
        Number(ordenPagoId),
      );

      if (uploadConOcr.existe === true && uploadConOcr.upload) {
        setRecuperacionUpload(uploadConOcr);
        setEstadoRecuperacion("UPLOAD_PERSISTIDO");
      }

      setMensajePipeline(null);
      setOcrResultado(resultadoOcr);
    } catch (error) {
      setMensajePipeline(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el sustento de pago.",
      );
    } finally {
      setProcesando(false);
    }
  }

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
        montoLabel: formatMontoFinanzas(item.monto, item.moneda),
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
        montoLabel: formatMontoFinanzas(item.monto, item.moneda),
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
                        <span className="text-muted-foreground">Concepto:</span>{' '}
                        {resumen.conceptoNombre ??
                          ([resumen.tipo, resumen.subtipo].filter(Boolean).join(' / ') || '—')}
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
                          {formatMontoFinanzas(resumen.monto, resumen.moneda)}
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

                    {sustentoOrden.visualizable && Number.isSafeInteger(sustentoOrden.archivoId) && (sustentoOrden.archivoId ?? 0) > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5"
                        onClick={() => setPreviewSustento({ archivoId: sustentoOrden.archivoId!, nombre: text(sustentoOrden.nombre, "Sustento de la orden") })}
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
                            {formatMontoFinanzas(
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
              <input
                ref={inputAdjuntarRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={!puedeAdjuntarOtroPago}
                onChange={(event) => {
                  const seleccionado = event.target.files?.[0] ?? null;

                  // Permite volver a seleccionar el mismo archivo en una
                  // operación futura si el backend lo admite.
                  event.currentTarget.value = "";

                  if (!seleccionado) return;

                  setArchivo(seleccionado);
                  setMostrarFormulario(true);
                  void iniciarPipeline(seleccionado);
                }}
              />

              <FinanzasPaymentPanel
                estadoPago={resumen?.estadoPago ?? "No disponible"}
                pagadoAcumuladoLabel={formatMontoFinanzas(
                  resumen?.pagado,
                  resumen?.moneda,
                )}
                saldoLabel={formatMontoFinanzas(
                  resumen?.saldo,
                  resumen?.moneda,
                )}
                pagos={pagosPaymentPanel}
                observados={observadosPaymentPanel}
                anulados={anuladosPaymentPanel}
                puedeAdjuntar={!pagoCompleto}
                adjuntarDisabled={!puedeAdjuntarOtroPago}
                adjuntarHint={
                  pagoCompleto
                    ? "La Orden de Pago está completamente pagada. No se admiten más pagos."
                    : estadoRecuperacion === "CARGANDO"
                      ? "Verificando si existe un sustento de pago pendiente."
                      : estadoRecuperacion !== "SIN_UPLOAD" ||
                          decisionPendienteForm
                        ? "Resuelva la validación pendiente antes de adjuntar otro pago."
                        : undefined
                }
                adjuntarLabel={
                  pagosActivos.length > 0
                    ? "Adjuntar otro pago"
                    : "Adjuntar sustento de pago"
                }
                onAdjuntar={seleccionarNuevoSustento}
                formularioAdjuntar={
                  mostrarFormulario ? (
                    <div className="w-full rounded-lg border bg-muted/10 p-3">
                      <div className="space-y-3">
                        {estadoRecuperacion === "CARGANDO" ? (
                          <div
                            role="status"
                            className="rounded-lg border border-dashed bg-background px-3 py-4 text-sm text-muted-foreground"
                          >
                            Verificando si existe un sustento de pago pendiente…
                          </div>
                        ) : estadoRecuperacion === "ERROR" ? (
                          <div
                            role="alert"
                            className="rounded-lg border bg-background p-3"
                          >
                            <p className="text-sm font-medium">
                              No se pudo reconstruir el sustento pendiente.
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {errorRecuperacion ??
                                "La recuperación falló. No seleccione otro archivo hasta resolver este estado."}
                            </p>
                          </div>
                        ) : estadoRecuperacion === "UPLOAD_PERSISTIDO" &&
                          recuperacionUpload?.upload ? (
                          <div className="rounded-lg border bg-background p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {recuperacionUpload.upload.nombreArchivo}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Archivo persistido
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {recuperacionUpload.ocr?.estado === "pendiente_validacion"
                                    ? "Pendiente de validación OCR"
                                    : recuperacionUpload.ocr?.estado
                                      ? `OCR: ${recuperacionUpload.ocr.estado}`
                                      : "OCR aún no disponible"}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-wrap gap-2">
                                {recuperacionUpload.upload.puedePrevisualizar ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setPreviewSustento({
                                        archivoId: recuperacionUpload.upload!.archivoId,
                                        nombre: recuperacionUpload.upload!.nombreArchivo,
                                      })
                                    }
                                  >
                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    Ver
                                  </Button>
                                ) : null}

                                {!decisionPendienteForm &&
                                recuperacionUpload.ocr?.puedeRevisar ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={procesando}
                                    onClick={() => void revisarOcrRecuperado()}
                                  >
                                    Revisar OCR
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : archivo ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {archivo.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(archivo.size / 1024).toFixed(1)} KB · Seleccionado localmente
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {procesando
                                  ? mensajePipeline ?? "Procesando…"
                                  : "Listo para procesar"}
                              </p>
                            </div>

                            {!procesando && archivoIdPersistido === null ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setArchivo(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}

                        {mensajePipeline ? (
                          <p role="status" className="text-sm text-muted-foreground">
                            {mensajePipeline}
                          </p>
                        ) : null}

                        {decisionPendienteForm ? (
                          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm">
                            <div>
                              <p className="font-semibold text-amber-900">
                                Decisión requerida
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Registre el motivo y decida sin reabrir la validación OCR.
                              </p>
                            </div>

                            <label className="block space-y-1.5">
                              <span className="font-medium">
                                Comentario / motivo
                              </span>
                              <textarea
                                value={motivoDecision}
                                onChange={(event) =>
                                  setMotivoDecision(event.target.value)
                                }
                                disabled={procesando}
                                rows={3}
                                className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                                placeholder="Explique la decisión sobre este sustento de pago."
                              />
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  procesando ||
                                  motivoDecision.trim().length === 0
                                }
                                onClick={() =>
                                  void resolverDecisionPersistida("OBSERVAR")
                                }
                              >
                                {procesando ? "Procesando..." : "Observar"}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  procesando ||
                                  motivoDecision.trim().length === 0
                                }
                                onClick={() =>
                                  void resolverDecisionPersistida(
                                    "AUTORIZAR_EXCEPCION",
                                  )
                                }
                              >
                                {procesando
                                  ? "Procesando..."
                                  : "Aceptar excepción"}
                              </Button>
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                              La autorización de excepción está sujeta al permiso específico
                              validado por el backend.
                            </p>
                          </div>
                        ) : null}

                      </div>
                    </div>
                  ) : undefined
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <OcrValidationModal
        open={ocrResultado !== null}
        resultado={ocrResultado}
        fallbackArchivoId={archivoIdPersistido ?? undefined}
        formularioContexto="FINANZAS"
        tiposDocumentalesPermitidos={["TRANSFERENCIA", "PAGO_TRANSFERENCIA", "PAGO_DETRACCION"]}
        tipoDocumentalInicial="PAGO_TRANSFERENCIA"
        onClose={() => {
          if (!procesando) setOcrResultado(null);
        }}
        onSave={async form => {
          if (!ocrResultadoId) return;
          setProcesando(true);
          setMensajePipeline(null);
          try {
            await editarOcrResultado(ocrResultadoId, {
              metadata: metadataPago(form),
              observacion: form.observacion?.trim() || undefined,
            });
            setOcrResultado(await getOcrResultado(ocrResultadoId));
          } catch (error) {
            setMensajePipeline(
              error instanceof Error
                ? error.message
                : "No se pudo guardar la validación OCR.",
            );
          } finally {
            setProcesando(false);
          }
        }}
        onConfirm={form => confirmarDesdeModal(form)}
      />

      {previewSustento ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${previewSustento.nombre}`}
          onMouseDown={event => { if (event.target === event.currentTarget) setPreviewSustento(null); }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa" onClick={() => setPreviewSustento(null)}>
              <X className="h-5 w-5" />
            </Button>
            <PreviewDocumento archivoId={previewSustento.archivoId} title={previewSustento.nombre} className="max-h-[80vh]" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
