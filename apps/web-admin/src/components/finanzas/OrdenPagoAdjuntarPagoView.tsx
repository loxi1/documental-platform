"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ReceiptText, Eye, FileText, X } from "lucide-react";

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
  observarPagoConfirmadoOp,
  getUploadPendienteOrdenPago,
  type UploadPendienteOrdenPago,
} from "@/services/finanzas";
import { Dato, formatDate, documentoEconomicoResumen } from "@/components/finanzas/OrdenPagoVerView";
import type { OrdenPagoDetalle } from "@/services/finanzas";
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

type DocumentoEconomico = ReturnType<typeof documentoEconomicoResumen>;

type SustentoOrdenPago = {
  archivoId?: number | null;
  nombre?: string | null;
  tipo?: string | null;
  visualizable?: boolean;
};

type SustentoPago = {
  vinculoId?: number | null;
  documentoId?: number | null;
  ocrResultadoId?: number | null;
  id: string | number;
  fecha?: string | null;
  banco?: string | null;
  referencia?: string | null;
  monto?: string | number | null;
  moneda?: string | null;
  estado?: "CONFIRMADO" | "OBSERVADO" | "ANULADO" | string | null;
  observacion?: string | null;
  visualizable?: boolean;
  archivoId?: number | null;
};

type Props = {
  detalleDocumental?: OrdenPagoDetalle;
  documentoEconomicoLoading?: boolean;
  documentoEconomicoError?: boolean;
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
  detalleDocumental,
  documentoEconomicoLoading = false,
  documentoEconomicoError = false,
  sustentoOrden = null,
  sustentos = [],
}: Props) {
  const expedienteOcrContexto = useMemo(() => ({ id: expedienteId }), [expedienteId]);
  const ocrInicialDespachados = useRef(new Set<number>());
  const cargaEnCurso = useRef(false);
  const cargaVersion = useRef(0);
  const [ocrInicialArchivoId, setOcrInicialArchivoId] = useState<number | null>(null);
  const recuperacionOcr = useRef({ version: 0, ocupada: false });
  const [archivoDuplicado, setArchivoDuplicado] = useState<{ archivoId: number; nombre: string } | null>(null);
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
  const [observacionPreparada, setObservacionPreparada] = useState<{ ocrResultadoId: number; documentoId: number; archivoId: number; metadata: Record<string, unknown> } | null>(null);
  const observacionEnCurso = useRef(false);
  const [pagoConfirmadoAObservar, setPagoConfirmadoAObservar] = useState<number | null>(null);
  const [motivoConfirmado, setMotivoConfirmado] = useState("");
  const inputAdjuntarRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => { setPagoConfirmadoAObservar(null); setMotivoConfirmado(""); }, [ordenPagoId]);

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


  function cancelarRecuperacionOcr() {
    recuperacionOcr.current.version += 1;
    if (recuperacionOcr.current.ocupada) {
      recuperacionOcr.current.ocupada = false;
      setProcesando(false);
    }
  }

  function cancelarCargaInicial() {
    cargaVersion.current += 1;
    if (cargaEnCurso.current) {
      cargaEnCurso.current = false;
      if (!recuperacionOcr.current.ocupada) setProcesando(false);
    }
  }

  useEffect(() => {
    const id = Number(ordenPagoId);
    let activo = true;

    cancelarCargaInicial();
    cancelarRecuperacionOcr();
    setOcrInicialArchivoId(null);
    setObservacionPreparada(null);
    setEstadoRecuperacion("CARGANDO");
    setArchivoDuplicado(null);
    setMensajePipeline(null);
    setOcrResultado(null);
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
      .then(async (resultado) => {
        if (!activo) return;

        if (resultado.existe !== true) {
          if (resultado.existe !== false) throw new Error("No se pudo verificar el estado del sustento pendiente.");
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
            (validacionPendiente?.request?.metadata ?? validacionPendiente?.metadata ?? {}) as OcrValidationFormState,
          );
          setMotivoDecision("");
        } else if (ocrId && ["editado", "confirmado"].includes(String(resultado.ocr?.estado).toLowerCase())) {
          const recuperado = await getOcrResultado(ocrId);
          if (!activo) return;
          const value = recuperado as unknown as Record<string, any>;
          if (numeroPositivo(value.id) !== ocrId || numeroPositivo(value.documentoId ?? value.documento_id) !== resultado.upload.documentoId || numeroPositivo(value.archivoId ?? value.archivo_id) !== archivoId || value.metadata?.validacionPendientePago?.estado === "CONSUMIDO") throw new Error("La validación OCR no corresponde al sustento pendiente.");
          setDecisionPendienteForm((value.metadata?.metadata ?? value.metadata ?? {}) as OcrValidationFormState);
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
      cancelarCargaInicial();
      cancelarRecuperacionOcr();
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
      setRecuperacionUpload(null);
      setEstadoRecuperacion("SIN_UPLOAD");
      setOcrInicialArchivoId(null);
      await refrescarFinanzas().catch(() => { setEstadoRecuperacion("ERROR"); setErrorRecuperacion("Sustento resuelto. Actualiza la vista para consultar el saldo vigente antes de otro pago."); setMostrarFormulario(true); });
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

      const codigoConflicto = JSON.stringify(responseData ?? {}).includes('"DECISION_CORRESPONDENCIA_REQUERIDA"')
        ? "DECISION_CORRESPONDENCIA_REQUERIDA" : String(
        responseData?.error?.details?.code ??
          responseData?.error?.code ??
          "",
      ).trim();

      if (
        response?.status === 409 &&
        codigoConflicto === "DECISION_CORRESPONDENCIA_REQUERIDA"
      ) {
        let errorLectura: unknown = null;
        const pendiente = await getUploadPendienteOrdenPago(Number(ordenPagoId)).catch(error => { errorLectura = error; return null; });
        const coincide = pendiente?.existe && pendiente.upload?.archivoId === archivoIdPersistido &&
          pendiente.upload?.documentoId === recuperacionUpload?.upload?.documentoId &&
          pendiente.ocr?.ocrResultadoId === ocrResultadoId;
        if (coincide) setRecuperacionUpload(pendiente);
        setDecisionPendienteForm(coincide && pendiente.ocr?.validacionPendientePago?.estado === "PENDIENTE_DECISION"
          ? (pendiente.ocr.validacionPendientePago.request?.metadata ?? pendiente.ocr.validacionPendientePago.metadata ?? form) as OcrValidationFormState : null);
        setMotivoDecision("");
        setOcrResultado(null);
        setOcrInicialArchivoId(null);
        const mensaje = errorLectura
          ? `El pago requiere una decisión, pero no pudo recuperarse el sustento: ${errorLectura instanceof Error ? errorLectura.message : "error de consulta"}`
          : coincide ? "El pago requiere una decisión de correspondencia. Puede aceptarlo u observarlo usando el mismo OCR, sin volver a cargar el archivo."
            : "La decisión pendiente cambió. Actualiza la vista para recuperar el sustento correcto.";
        setMensajePipeline(mensaje);
        if (!coincide) { setEstadoRecuperacion("ERROR"); setErrorRecuperacion(mensaje); }
        return;
      }

      const duplicate = JSON.stringify(responseData ?? {}).includes('"DOCUMENTO_DUPLICADO_EN_EXPEDIENTE"');
      setMensajePipeline(duplicate
        ? "Ya existe un comprobante con el mismo banco y número de operación. Revisa los datos antes de continuar."
        : error instanceof Error ? error.message : "No se pudo confirmar el sustento de pago.");
    } finally {
      setProcesando(false);
    }
  }

  async function observarConfirmado() {
    const motivo = motivoConfirmado.trim();
    const vinculoId = pagoConfirmadoAObservar;
    if (!vinculoId || !motivo || observacionEnCurso.current || procesando) return;
    if (!pagosActivos.some(p => p.vinculoId === vinculoId)) return;
    observacionEnCurso.current = true;
    const version = cargaVersion.current;
    setProcesando(true);
    setMensajePipeline(null);
    try {
      await observarPagoConfirmadoOp(Number(ordenPagoId), vinculoId, motivo);
      if (version !== cargaVersion.current) return;
      setPagoConfirmadoAObservar(null);
      setMotivoConfirmado("");
      await refrescarFinanzas();
    } catch (error) {
      if (version === cargaVersion.current) setMensajePipeline(error instanceof Error ? error.message : "No se pudo observar el pago confirmado.");
    } finally {
      observacionEnCurso.current = false;
      if (version === cargaVersion.current) setProcesando(false);
    }
  }

  async function prepararObservacion() {
    if (procesando || observacionEnCurso.current) return;
    const version = cargaVersion.current;
    setProcesando(true);
    setMensajePipeline(null);
    try {
      const pendiente = await getUploadPendienteOrdenPago(Number(ordenPagoId));
      if (version !== cargaVersion.current) return;
      const id = numeroPositivo(pendiente.ocr?.ocrResultadoId);
      const doc = numeroPositivo(pendiente.upload?.documentoId);
      const file = numeroPositivo(pendiente.upload?.archivoId);
      if (!pendiente.existe || !id || !doc || !file || file !== archivoIdPersistido) throw new Error("No hay un sustento pendiente con identidad válida para observar.");
      const result = await getOcrResultado(id);
      if (version !== cargaVersion.current) return;
      const value = result as unknown as Record<string, any>;
      if (numeroPositivo(value.id) !== id || numeroPositivo(value.documentoId ?? value.documento_id) !== doc || numeroPositivo(value.archivoId ?? value.archivo_id) !== file) throw new Error("El OCR no corresponde al sustento pendiente.");
      if (String(value.metadata?.validacionPendientePago?.estado ?? "").toUpperCase() === "CONSUMIDO") throw new Error("El sustento ya está resuelto.");
      setObservacionPreparada({ ocrResultadoId: id, documentoId: doc, archivoId: file,
        metadata: pendiente.ocr?.validacionPendientePago?.request?.metadata ?? value.metadata?.metadata ?? value.metadata ?? {} });
      setRecuperacionUpload(pendiente);
      setMotivoDecision("");
      setOcrResultado(null);
      setOcrInicialArchivoId(null);
    } catch (error) {
      if (version === cargaVersion.current) setMensajePipeline(error instanceof Error ? error.message : "No se pudo recuperar el sustento para observar.");
    } finally { if (version === cargaVersion.current) setProcesando(false); }
  }

  async function resolverDecisionPersistida(
    accion: "OBSERVAR" | "AUTORIZAR_EXCEPCION",
  ) {
    const motivo = motivoDecision.trim();
    const observacion = accion === "OBSERVAR" ? observacionPreparada : null;
    const id = numeroPositivo(observacion?.ocrResultadoId ?? recuperacionUpload?.ocr?.ocrResultadoId);
    const validacionPendiente =
      recuperacionUpload?.ocr?.validacionPendientePago ?? null;
    const identidad = validacionPendiente?.identidad ?? null;

    const contextoValido = observacion
      ? motivo.length > 0 && Number(observacion.archivoId) === Number(recuperacionUpload?.upload?.archivoId) && Number(observacion.documentoId) === Number(recuperacionUpload?.upload?.documentoId) && Number(observacion.ocrResultadoId) === Number(recuperacionUpload?.ocr?.ocrResultadoId)
      : motivo.length > 0 &&
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

    if (observacionEnCurso.current) return;
    observacionEnCurso.current = true;
    const version = cargaVersion.current;
    setProcesando(true);
    setMensajePipeline(null);

    try {
      await confirmarPagoOrdenPago(Number(ordenPagoId), {
        ocrResultadoId: id,
        metadata: observacion?.metadata ?? validacionPendiente?.request?.metadata ?? validacionPendiente?.metadata ?? {},
        observacion:
          accion === "OBSERVAR"
            ? "Pago observado desde Finanzas"
            : "Excepción de pago autorizada desde Finanzas",
        decisionCorrespondencia: {
          accion,
          motivo,
        },
      });

      if (version !== cargaVersion.current) return;
      setObservacionPreparada(null);
      setOcrInicialArchivoId(null);
      setDecisionPendienteForm(null);
      setMotivoDecision("");
      setOcrResultado(null);
      setOcrResultadoId(null);
      setArchivoIdPersistido(null);
      setRecuperacionUpload(null);
      setArchivo(null);
      setMostrarFormulario(false);
      setEstadoRecuperacion("SIN_UPLOAD");

      await refrescarFinanzas().catch(() => { setEstadoRecuperacion("ERROR"); setErrorRecuperacion("Sustento resuelto. Actualiza la vista para consultar el saldo vigente."); setMostrarFormulario(true); });
    } catch (error) {
      if (version !== cargaVersion.current) return;
      setMensajePipeline(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la decisión sobre el sustento de pago.",
      );
    } finally {
      observacionEnCurso.current = false;
      if (version === cargaVersion.current) setProcesando(false);
    }
  }

  async function continuarValidacion(upload: UploadPendienteOrdenPago = recuperacionUpload ?? { existe: false }) {
    const persistedId = numeroPositivo(upload.upload?.archivoId);
    const documentoId = numeroPositivo(upload.upload?.documentoId);
    if (!upload.existe || !persistedId || !documentoId || expedienteId === null) {
      setMensajePipeline("No se pudo recuperar el archivo persistido. No vuelva a cargarlo.");
      return;
    }
    setProcesando(true);
    setMensajePipeline(null);
    setArchivoIdPersistido(persistedId);
    setOcrInicialArchivoId(null);
    setOcrResultado(null);
    setOcrResultadoId(null);
    const version = ++recuperacionOcr.current.version;
    recuperacionOcr.current.ocupada = true;
    try {
      // Re-read first: a previous OCR may have completed after F5 or a timeout.
      const actual = await getUploadPendienteOrdenPago(Number(ordenPagoId));
      if (version !== recuperacionOcr.current.version) return;
      if (!actual.existe || actual.upload?.archivoId !== persistedId || actual.upload?.documentoId !== documentoId) throw new Error("El sustento pendiente cambió. Actualice la vista antes de continuar.");
      setRecuperacionUpload(actual);
      const id = numeroPositivo(actual.ocr?.ocrResultadoId);
      if (String(actual.ocr?.validacionPendientePago?.estado ?? "").toUpperCase() === "CONSUMIDO") throw new Error("Este sustento ya está resuelto y no puede editarse desde la recuperación pendiente.");
      if (id && ["procesando", "processing", "en_proceso"].includes(String(actual.ocr?.estado).toLowerCase())) {
        setOcrInicialArchivoId(persistedId);
        setMensajePipeline("El PDF está guardado y su OCR sigue en proceso. Puedes completar campos; la confirmación requiere un resultado persistido y validado.");
        return;
      }
      if (!id) {
        setOcrInicialArchivoId(persistedId);
        setMensajePipeline("El PDF está guardado, pero no tiene un resultado OCR persistido. Puedes consultar el archivo y completar campos sin guardar ni confirmar. Inicializar OCR requiere autorización y verificar antes que no exista procesamiento activo; esta recuperación no lo inicia.");
        return;
      }
      const resultado = await getOcrResultado(id);
      if (version !== recuperacionOcr.current.version) return;
      const value = resultado as unknown as Record<string, any>;
      if (numeroPositivo(value.id) !== id || numeroPositivo(value.documentoId ?? value.documento_id) !== documentoId || numeroPositivo(value.archivoId ?? value.archivo_id) !== persistedId) throw new Error("El OCR recibido no corresponde al documento y archivo del sustento pendiente.");
      if (String(value.metadata?.validacionPendientePago?.estado ?? value.validacionPendientePago?.estado ?? "").toUpperCase() === "CONSUMIDO") throw new Error("Este sustento ya está resuelto y no puede editarse desde la recuperación pendiente.");
      setOcrInicialArchivoId(persistedId);
      setOcrResultadoId(id);
      setOcrResultado(resultado);
      setMensajePipeline(null);
    } catch (error) {
      if (version === recuperacionOcr.current.version) setMensajePipeline(error instanceof Error ? error.message : "El archivo está guardado. Continúe su validación sin volver a cargarlo.");
    } finally {
      if (version === recuperacionOcr.current.version && recuperacionOcr.current.ocupada) {
        recuperacionOcr.current.ocupada = false;
        setProcesando(false);
      }
    }
  }

  async function iniciarOcrCargaNueva(upload: UploadPendienteOrdenPago) {
    const archivoId = numeroPositivo(upload.upload?.archivoId);
    const documentoId = numeroPositivo(upload.upload?.documentoId);
    if (!upload.existe || !archivoId || !documentoId) throw new Error("Identidad de carga nueva inválida.");
    if (String(upload.ocr?.validacionPendientePago?.estado ?? "").toUpperCase() === "CONSUMIDO") throw new Error("El sustento ya está resuelto.");
    if (ocrInicialDespachados.current.has(archivoId)) return;
    ocrInicialDespachados.current.add(archivoId);
    const version = ++recuperacionOcr.current.version;
    recuperacionOcr.current.ocupada = true;
    setOcrResultado(null);
    setOcrResultadoId(null);
    setArchivoIdPersistido(archivoId);
    setOcrInicialArchivoId(archivoId);
    setMensajePipeline("El PDF está guardado. Esperando OCR inicial; puedes completar los campos mientras tanto.");
    try {
      const respuesta = await procesarArchivoOcr(archivoId, {
        tipoEsperado: "TRANSFERENCIA", areaOrigen: "FINANZAS", expedienteId: expedienteId!,
        documentoBaseId, tipoRelacionSugerida: "adjunto_transferencia", canalIngreso: "WEB_ADMIN_GUIADO",
      });
      if (version !== recuperacionOcr.current.version) return;
      const id = resolverOcrResultadoId(respuesta);
      if (!id) throw new Error("El PDF está guardado, pero el OCR inicial no devolvió un resultado persistido. No puede confirmarse todavía.");
      const resultado = await getOcrResultado(id);
      if (version !== recuperacionOcr.current.version) return;
      const value = resultado as unknown as Record<string, any>;
      if (numeroPositivo(value.id) !== id || numeroPositivo(value.documentoId ?? value.documento_id) !== documentoId || numeroPositivo(value.archivoId ?? value.archivo_id) !== archivoId) throw new Error("El OCR inicial no corresponde al documento y archivo persistidos.");
      if (String(value.metadata?.validacionPendientePago?.estado ?? value.validacionPendientePago?.estado ?? "").toUpperCase() === "CONSUMIDO") throw new Error("El sustento ya está resuelto.");
      setOcrResultadoId(id);
      setOcrResultado(resultado);
      setMensajePipeline(null);
    } catch (error) {
      if (version === recuperacionOcr.current.version) setMensajePipeline(error instanceof Error ? error.message : "El PDF está guardado, pero no se pudo obtener OCR. Sin un resultado persistido no puede confirmarse.");
    } finally {
      if (version === recuperacionOcr.current.version && recuperacionOcr.current.ocupada) {
        recuperacionOcr.current.ocupada = false;
        setProcesando(false);
      }
    }
  }

  async function revisarOcrRecuperado() {
    await continuarValidacion();
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

    if (cargaEnCurso.current) return;
    cargaEnCurso.current = true;
    const versionCarga = ++cargaVersion.current;
    setProcesando(true);
    setMensajePipeline("Cargando archivo…");
    setArchivoDuplicado(null);
    let archivoGuardado = false;
    let recuperandoExistente = false;

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
      if (versionCarga !== cargaVersion.current) return;

      const accionSugerida = String(
        prevalidacion.accionSugerida ?? "",
      ).trim();

      if (accionSugerida === "abrir_existente") {
        recuperandoExistente = true;
        // Hash identity does not prove membership in this OP. The scoped
        // recovery endpoint remains the authority for a pending validation.
        const pendiente = await getUploadPendienteOrdenPago(Number(ordenPagoId));
        if (versionCarga !== cargaVersion.current) return;
        if (pendiente.existe !== true && pendiente.existe !== false) throw new Error("No se pudo verificar si existe una validación pendiente de esta OP.");
        const duplicados = prevalidacion.duplicados ?? [];
        const mismoArchivo = pendiente.existe && pendiente.upload && duplicados.some(item =>
          numeroPositivo(item.archivoId ?? item.archivo_id) === numeroPositivo(pendiente.upload?.archivoId) &&
          numeroPositivo(item.documentoId ?? item.documento_id) === numeroPositivo(pendiente.upload?.documentoId));
        setArchivo(null);
        setErrorRecuperacion(null);
        setOcrResultado(null);
        setDecisionPendienteForm(null);
        if (pendiente.existe) {
          if (!numeroPositivo(pendiente.upload?.archivoId) || !numeroPositivo(pendiente.upload?.documentoId)) throw new Error("No se pudo recuperar la identidad del sustento pendiente de esta OP.");
          setRecuperacionUpload(pendiente);
          setArchivoIdPersistido(pendiente.upload!.archivoId);
          setOcrResultadoId(numeroPositivo(pendiente.ocr?.ocrResultadoId));
          setEstadoRecuperacion("UPLOAD_PERSISTIDO");
          setMostrarFormulario(true);
          setMensajePipeline(mismoArchivo
            ? "Archivo recuperado para esta Orden de Pago. Continúe su validación."
            : "El archivo seleccionado ya existe, pero no es el sustento pendiente de esta OP. Continúe la validación existente.");
          if (mismoArchivo && pendiente.ocr?.ocrResultadoId) await continuarValidacion(pendiente);
        } else {
          setRecuperacionUpload(pendiente);
          setArchivoIdPersistido(null);
          setOcrResultadoId(null);
          setEstadoRecuperacion("SIN_UPLOAD");
          setMostrarFormulario(true);
          const existente = duplicados.length === 1 ? duplicados[0] : null;
          const existenteId = numeroPositivo(existente?.archivoId ?? existente?.archivo_id);
          if (existenteId) setArchivoDuplicado({ archivoId: existenteId, nombre: archivoPipeline.name });
          setMensajePipeline("Este archivo ya existe, pero no hay una validación pendiente para esta Orden de Pago. No se ha asociado ni registrado un pago. Puedes consultar el archivo existente o seleccionar otro sustento.");
        }
        return;
      }

      let archivoId: number | null = null;
      let documentoNuevoId: number | null = null;
      let cargaCreada = false;

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

        if (versionCarga !== cargaVersion.current) {
          // The server may already have persisted this upload. Keep its
          // identifiers for reconciliation; never delete or treat it as aborted.
          console.info("OP_UPLOAD_COMPLETED_AFTER_INVALIDATION", {
            ordenPagoId,
            documentoId: carga.documentoId ?? carga.documento_id ?? null,
            archivoId: carga.archivoId ?? carga.archivo_id ?? null,
            cargaOperacionId: carga.cargaOperacionId ?? carga.operacionId ?? null,
          });
          return;
        }
        cargaCreada = carga.kind === "CREATED";
        documentoNuevoId = numeroPositivo(carga.documentoId ?? carga.documento_id);
        archivoId = numeroPositivo(
          carga.archivoId ?? carga.archivo_id,
        );
      }

      if (!archivoId) {
        throw new Error("No se pudo resolver archivoId del sustento.");
      }

      setArchivoIdPersistido(archivoId);
      archivoGuardado = true;
      setEstadoRecuperacion("UPLOAD_PERSISTIDO");

      const uploadPersistido = await getUploadPendienteOrdenPago(
        Number(ordenPagoId),
      );

      if (versionCarga !== cargaVersion.current) return;
      if (
        uploadPersistido.existe !== true ||
        !uploadPersistido.upload ||
        numeroPositivo(uploadPersistido.upload.archivoId) !== archivoId ||
        (cargaCreada && (!documentoNuevoId || numeroPositivo(uploadPersistido.upload.documentoId) !== documentoNuevoId))
      ) {
        throw new Error(
          "El archivo fue persistido, pero no pudo reconstruirse de forma canónica. No vuelva a cargarlo.",
        );
      }

      setRecuperacionUpload(uploadPersistido);
      setEstadoRecuperacion("UPLOAD_PERSISTIDO");
      setErrorRecuperacion(null);
      if (cargaCreada && !uploadPersistido.ocr?.ocrResultadoId) {
        await iniciarOcrCargaNueva(uploadPersistido);
      } else {
        await continuarValidacion(uploadPersistido);
      }
    } catch (error) {
      if (versionCarga !== cargaVersion.current) return;
      if (archivoGuardado || recuperandoExistente) {
        setEstadoRecuperacion("ERROR");
        setErrorRecuperacion(archivoGuardado
          ? "El archivo está persistido. Actualiza la vista para recuperar su validación sin cargarlo nuevamente."
          : "No se pudo consultar la validación pendiente de esta OP. Actualiza la vista antes de continuar; no se ha asociado el archivo existente.");
      }
      setMensajePipeline(error instanceof Error ? error.message : "No se pudo continuar la validación del sustento.");
    } finally {
      if (versionCarga === cargaVersion.current) {
        cargaEnCurso.current = false;
        if (!recuperacionOcr.current.ocupada) setProcesando(false);
      }
    }
  }

  const pagosActivos = useMemo(
    () =>
      sustentos.filter((item) => {
        const estado = String(item.estado ?? "").toUpperCase();
        return estado === "CONFIRMADO" || estado === "ACTIVO";
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
        onObservar: numeroPositivo(item.vinculoId) ? () => { if (procesando) return; setPagoConfirmadoAObservar(item.vinculoId!); setMotivoConfirmado(""); setMensajePipeline(null); } : undefined,
        montoLabel: formatMontoFinanzas(item.monto, item.moneda),
        banco: item.banco,
        operacion: item.referencia,
        observacion: item.observacion,
        contenidoExtra: item.fecha ? <span className="text-xs text-muted-foreground">{item.fecha}</span> : undefined,
        visualizable: item.visualizable === true && numeroPositivo(item.archivoId) !== null,
      })),
    [pagosActivos, procesando],
  );

  const observadosPaymentPanel = useMemo<FinanzasPaymentObservedItem[]>(
    () =>
      observados.map((item) => ({
        id: item.id,
        montoLabel: formatMontoFinanzas(item.monto, item.moneda),
        banco: item.banco,
        operacion: item.referencia,
        motivo: item.observacion,
        fechaDecision: item.fecha,
        visualizable: item.visualizable === true && numeroPositivo(item.archivoId) !== null,
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
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Documento principal</p>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-semibold">OP {text(detalleDocumental?.numero, codigo)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">Orden de pago</Badge>
                      {sustentoOrden?.visualizable && Number.isSafeInteger(sustentoOrden.archivoId) && (sustentoOrden.archivoId ?? 0) > 0 ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewSustento({ archivoId: sustentoOrden.archivoId!, nombre: text(sustentoOrden.nombre, "Orden de Pago") })}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />Ver
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Dato label="Periodo" value={detalleDocumental?.periodoAnio ? (detalleDocumental.periodoMes ? `${String(detalleDocumental.periodoMes).padStart(2, "0")}/${detalleDocumental.periodoAnio}` : String(detalleDocumental.periodoAnio)) : "—"} />
                    <Dato label="Beneficiario" value={text(detalleDocumental?.proveedorRazonSocial || detalleDocumental?.beneficiarioNombreLibre)} />
                    <Dato label="RUC beneficiario" value={text(detalleDocumental?.proveedorRuc)} />
                    <Dato label="Estado regularización" value={text(detalleDocumental?.estadoRegularizacion)} />
                    <Dato label="Concepto" value={text(detalleDocumental?.conceptoNombre ?? resumen?.conceptoNombre, "Sin concepto asociado")} />
                    <Dato label="Clasificación" value={text(detalleDocumental?.conceptoClasificacion)} />
                    <Dato label="Moneda" value={text(detalleDocumental?.moneda ?? resumen?.moneda)} />
                    <Dato label="Monto" value={formatMontoFinanzas(detalleDocumental?.monto ?? resumen?.monto, detalleDocumental?.moneda ?? resumen?.moneda)} />
                  </dl>
                  <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
                    <Dato label="Fecha emisión" value={formatDate(text(detalleDocumental?.fechaEmision ?? resumen?.fechaEmision, ""))} />
                    <Dato label="Referencia" value={text(detalleDocumental?.codigoPago)} />
                  </dl>
                  <div className="mt-4"><Dato label="Observación" value={text(detalleDocumental?.observacion)} /></div>
                </div>
              </section>
              <section className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Documento económico</p>
                {documentoEconomicoLoading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Cargando documento económico…</p>
                  : documentoEconomicoError ? <p role="alert" className="mt-3 text-sm text-muted-foreground">No se pudo cargar el documento económico.</p>
                  : documentoEconomico ? (
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <p className="font-semibold">{documentoEconomico.label} {documentoEconomico.numero}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{documentoEconomico.label}</Badge>
                          {documentoEconomico.archivoId ? <Button type="button" variant="outline" size="sm" onClick={() => setPreviewSustento({ archivoId: documentoEconomico.archivoId!, nombre: `${documentoEconomico.label} ${documentoEconomico.numero}` })}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />Ver
                          </Button> : null}
                        </div>
                      </div>
                      <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                        <Dato label="Emisor" value={documentoEconomico.emisor} />
                        <Dato label="RUC emisor" value={documentoEconomico.ruc} />
                        <Dato label="Fecha" value={formatDate(documentoEconomico.fecha)} />
                        <Dato label="Importe" value={documentoEconomico.moneda ? formatMontoFinanzas(documentoEconomico.monto, documentoEconomico.moneda) : text(documentoEconomico.monto)} />
                        <Dato label="Moneda" value={text(documentoEconomico.moneda)} />
                      </dl>
                    </div>
                  ) : <div className="mt-3 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    {detalleDocumental?.estadoRegularizacion === "PENDIENTE" ? "Pendiente de regularización" : "Sin documento económico confirmado asociado."}
                  </div>}
              </section>
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
                onVerPago={(item) => {
                  const sustento = pagosActivos.find(pago => pago.id === item.id);
                  if (sustento?.archivoId) setPreviewSustento({ archivoId: sustento.archivoId, nombre: `Sustento ${sustento.referencia ?? sustento.id}` });
                }}
                onVerObservado={(item) => {
                  const sustento = observados.find(pago => pago.id === item.id);
                  if (sustento?.archivoId) setPreviewSustento({ archivoId: sustento.archivoId, nombre: `Sustento observado ${sustento.referencia ?? sustento.id}` });
                }}
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
                          recuperacionUpload?.upload ? (!decisionPendienteForm ? (
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
                                  {decisionPendienteForm ? "Pendiente de decisión financiera" : "Pendiente de validación"}
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

                                {!decisionPendienteForm && recuperacionUpload.upload ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={procesando}
                                    onClick={() => void revisarOcrRecuperado()}
                                  >
                                    Editar OCR
                                  </Button>
                                ) : null}
                                {!decisionPendienteForm && (recuperacionUpload.ocr?.ocrResultadoId || ocrResultadoId) ? (
                                  <Button type="button" variant="outline" size="sm" disabled={procesando} onClick={() => void prepararObservacion()}>Observar</Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : null) : archivo ? (
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
                          <div role="status" className="space-y-2 text-sm text-muted-foreground">
                            <p>{mensajePipeline}</p>
                            {archivoDuplicado ? <Button type="button" variant="outline" size="sm" onClick={() => setPreviewSustento(archivoDuplicado)}>Ver archivo existente</Button> : null}
                          </div>
                        ) : null}

                        {decisionPendienteForm ? (
                          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm">
                            <div>
                              <p className="font-semibold text-amber-900">
                                Decisión requerida
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <span className="break-all">{recuperacionUpload?.upload?.nombreArchivo}</span>
                                <div className="flex shrink-0 gap-2">
                                  {recuperacionUpload?.upload?.puedePrevisualizar ? <Button type="button" variant="outline" size="sm" onClick={() => setPreviewSustento({ archivoId: recuperacionUpload.upload!.archivoId, nombre: recuperacionUpload.upload!.nombreArchivo })}>Ver PDF</Button> : null}
                                  {recuperacionUpload?.ocr?.validacionPendientePago?.estado !== "PENDIENTE_DECISION" ? <Button type="button" variant="outline" size="sm" disabled={procesando} onClick={() => void revisarOcrRecuperado()}>Editar</Button> : null}
                                </div>
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                Moneda de la OP: {text(resumen?.moneda)} · Moneda del sustento: {text(decisionPendienteForm.moneda)}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Revise el sustento y confirme o registre una observación sin reabrir la validación OCR.
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
                                disabled={procesando}
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
                                  (recuperacionUpload?.ocr?.validacionPendientePago?.estado === "PENDIENTE_DECISION" && motivoDecision.trim().length === 0)
                                }
                                onClick={() =>
                                  recuperacionUpload?.ocr?.validacionPendientePago?.estado === "PENDIENTE_DECISION"
                                    ? void resolverDecisionPersistida("AUTORIZAR_EXCEPCION")
                                    : void confirmarDesdeModal(decisionPendienteForm)
                                }
                              >
                                {procesando
                                  ? "Procesando..."
                                  : recuperacionUpload?.ocr?.validacionPendientePago?.estado === "PENDIENTE_DECISION" ? "Aceptar excepción" : "Confirmar pago"}
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
        open={ocrResultado !== null || ocrInicialArchivoId !== null}
        resultado={ocrResultado}
        fallbackArchivoId={archivoIdPersistido ?? undefined}
        preserveEditedFieldsOnResult={ocrInicialArchivoId !== null}
        expedienteContexto={expedienteOcrContexto}
        actionsDisabled={!ocrResultadoId}
        statusMessage={ocrInicialArchivoId !== null ? mensajePipeline : null}
        formularioContexto="FINANZAS"
        tiposDocumentalesPermitidos={["TRANSFERENCIA", "PAGO_TRANSFERENCIA", "PAGO_DETRACCION"]}
        tipoDocumentalInicial="PAGO_TRANSFERENCIA"
        onClose={() => {
          if (procesando && !recuperacionOcr.current.ocupada) return;
          if (ocrInicialArchivoId !== null) {
            cancelarRecuperacionOcr();
            setOcrInicialArchivoId(null);
            setOcrResultado(null);
          } else if (!procesando) setOcrResultado(null);
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

      {observacionPreparada || pagoConfirmadoAObservar ? (
        <div role="dialog" aria-modal="true" aria-labelledby="observacion-pago-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl bg-background p-6">
            <h2 id="observacion-pago-titulo" className="font-semibold">Observar sustento de pago</h2>
            <label className="block space-y-2">Motivo obligatorio
              <textarea value={pagoConfirmadoAObservar ? motivoConfirmado : motivoDecision} onChange={event => pagoConfirmadoAObservar ? setMotivoConfirmado(event.target.value) : setMotivoDecision(event.target.value)} disabled={procesando} className="w-full rounded border p-2" rows={3} />
            </label>
            {mensajePipeline ? <p role="alert" className="text-sm text-destructive">{mensajePipeline}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={procesando} onClick={() => { if (pagoConfirmadoAObservar) { setPagoConfirmadoAObservar(null); setMotivoConfirmado(""); } else { setObservacionPreparada(null); setMotivoDecision(""); } }}>Cancelar</Button>
              <Button disabled={procesando || !(pagoConfirmadoAObservar ? motivoConfirmado : motivoDecision).trim()} onClick={() => pagoConfirmadoAObservar ? void observarConfirmado() : void resolverDecisionPersistida("OBSERVAR")}>Confirmar observación</Button>
            </div>
          </div>
        </div>
      ) : null}

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
