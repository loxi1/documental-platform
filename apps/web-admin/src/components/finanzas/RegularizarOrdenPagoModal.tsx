"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarProveedoresCatalogo } from "@/services/ocr-procesamiento";
import {
  materializarFacturaTemporalOrdenPago,
  materializarReciboHonorarioTemporalOrdenPago,
  procesarOcrTemporalOrdenPago,
  recuperarTempRegularizacionOrdenPago,
  reemplazarTempRegularizacionOrdenPago,
  regularizarOrdenPagoFactura,
  regularizarOrdenPagoReciboHonorario,
  subirArchivoInicialOrdenPago,
  vincularTempRegularizacionOrdenPago,
  type OrdenPagoDetalle,
} from "@/services/finanzas";

type RegularizadorOperativo = "FACTURA" | "RECIBO_HONORARIO";

type SustentoPagoResumen = {
  id: string | number;
  banco?: string | null;
  operacion?: string | null;
  moneda?: string | null;
  monto?: string | number | null;
};

type FacturaValidationState = {
  serie: string;
  numero: string;
  fechaEmision: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  montoTotal: string;
  moneda: string;
};

type ReciboHonorarioValidationState = {
  serie: string;
  numero: string;
  fechaEmision: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  moneda: string;
  montoTotal: string;
};

type Props = {
  open: boolean;
  ordenPago: OrdenPagoDetalle | null;
  sustentos?: SustentoPagoResumen[];
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
};

const SUPPORTED_REGULARIZERS: readonly RegularizadorOperativo[] = [
  "FACTURA",
  "RECIBO_HONORARIO",
];

function formatMonto(value: string | number | null | undefined, moneda?: string | null) {
  if (value === null || value === undefined || value === "") return "—";

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);

  const currency = String(moneda || "PEN").toUpperCase() === "USD" ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
  }).format(parsed);
}

function labelTipo(tipo: string) {
  if (tipo === "FACTURA") return "Factura";
  if (tipo === "RECIBO_HONORARIO") return "Recibo por honorarios";
  return tipo;
}

type OcrStage =
  | "IDLE"
  | "UPLOADING"
  | "PROCESSING"
  | "DONE"
  | "PARTIAL"
  | "EMPTY"
  | "ERROR";

function recordOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function firstText(
  sources: Record<string, unknown>[],
  keys: string[],
): string {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
}

function normalizeFechaInput(value: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value.slice(0, 10) : value;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function facturaDesdeOcr(value: unknown): Partial<FacturaValidationState> {
  const root = recordOf(value);
  const resultado = recordOf(root.resultado);
  const rootMetadata = recordOf(root.metadata);
  const resultMetadata = recordOf(resultado.metadata);

  // Algunos resultados históricos llegan con metadata.metadata.
  const nestedRootMetadata = recordOf(rootMetadata.metadata);
  const nestedResultMetadata = recordOf(resultMetadata.metadata);

  const sources = [
    root,
    resultado,
    rootMetadata,
    resultMetadata,
    nestedRootMetadata,
    nestedResultMetadata,
  ];

  const serie = firstText(sources, ["serie"]);
  const numero = firstText(sources, ["numero"]);
  const fechaEmision = normalizeFechaInput(
    firstText(sources, ["fechaEmision", "fecha_emision"]),
  );
  const rucEmisor = firstText(sources, [
    "rucProveedor",
    "rucEmisor",
    "ruc_emisor",
    "ruc",
  ]);
  const razonSocialEmisor = firstText(sources, [
    "proveedor",
    "razonSocial",
    "razonSocialEmisor",
    "razon_social_emisor",
    "emisor",
  ]);
  const montoTotal = firstText(sources, [
    "montoTotal",
    "monto_total",
    "total",
  ]);
  const monedaRaw = firstText(sources, ["moneda"]).toUpperCase();
  const moneda =
    monedaRaw === "USD" || monedaRaw.includes("DOLAR")
      ? "USD"
      : monedaRaw === "PEN" || monedaRaw.includes("SOL")
        ? "PEN"
        : "";

  return {
    ...(serie ? { serie } : {}),
    ...(numero ? { numero } : {}),
    ...(fechaEmision ? { fechaEmision } : {}),
    ...(rucEmisor ? { rucEmisor } : {}),
    ...(razonSocialEmisor ? { razonSocialEmisor } : {}),
    ...(montoTotal ? { montoTotal } : {}),
    ...(moneda ? { moneda } : {}),
  };
}

function reciboHonorarioDesdeOcr(
  value: unknown,
): Partial<ReciboHonorarioValidationState> {
  const root = recordOf(value);
  const resultado = recordOf(root.resultado);
  const rootMetadata = recordOf(root.metadata);
  const resultMetadata = recordOf(resultado.metadata);
  const nestedRootMetadata = recordOf(rootMetadata.metadata);
  const nestedResultMetadata = recordOf(resultMetadata.metadata);

  const sources = [
    root,
    resultado,
    rootMetadata,
    resultMetadata,
    nestedRootMetadata,
    nestedResultMetadata,
  ];

  const serie = firstText(sources, ["serie"]);
  const numero = firstText(sources, ["numero"]);
  const fechaEmision = normalizeFechaInput(
    firstText(sources, ["fechaEmision", "fecha_emision"]),
  );
  const rucEmisor = firstText(sources, ["rucEmisor", "ruc_emisor", "ruc"]);
  const razonSocialEmisor = firstText(sources, [
    "persona",
    "razonSocialEmisor",
    "razon_social_emisor",
    "razonSocial",
  ]);
  const montoTotal = firstText(sources, [
    "montoTotal",
    "monto_total",
    "total",
  ]);

  const monedaRaw = firstText(sources, ["moneda"]).toUpperCase();
  const moneda =
    monedaRaw === "USD" || monedaRaw.includes("DOLAR")
      ? "USD"
      : monedaRaw === "PEN" || monedaRaw.includes("SOL")
        ? "PEN"
        : "";

  return {
    ...(serie ? { serie } : {}),
    ...(numero ? { numero } : {}),
    ...(fechaEmision ? { fechaEmision } : {}),
    ...(rucEmisor ? { rucEmisor } : {}),
    ...(razonSocialEmisor ? { razonSocialEmisor } : {}),
    ...(montoTotal ? { montoTotal } : {}),
    ...(moneda ? { moneda } : {}),
  };
}

function estadoOcr(value: unknown): string {
  const root = recordOf(value);
  const resultado = recordOf(root.resultado);

  return firstText(
    [root, resultado],
    ["estado", "ocrEstado", "ocr_estado", "status"],
  ).toUpperCase();
}

function mensajeError(error: unknown) {
  const raw = recordOf(error);
  const response = recordOf(raw.response);
  const data = recordOf(response.data);

  return (
    firstText([data, raw], ["message", "mensaje", "error"]) ||
    "No se pudo completar la operación."
  );
}

function newIdempotencyKey(prefix: string) {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${uuid}`;
}

export function RegularizarOrdenPagoModal({
  open,
  ordenPago,
  sustentos = [],
  onClose,
  onCompleted,
}: Props) {
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<RegularizadorOperativo | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);

  const [factura, setFactura] = useState<FacturaValidationState>({
    serie: "",
    numero: "",
    fechaEmision: "",
    rucEmisor: "",
    razonSocialEmisor: "",
    montoTotal: "",
    moneda: "PEN",
  });

  const [reciboHonorario, setReciboHonorario] =
    useState<ReciboHonorarioValidationState>({
      serie: "",
      numero: "",
      fechaEmision: "",
      rucEmisor: "",
      razonSocialEmisor: "",
      moneda: "PEN",
      montoTotal: "",
    });

  const [tempId, setTempId] = useState<string | null>(null);
  const [ocrStage, setOcrStage] = useState<OcrStage>("IDLE");
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrRaw, setOcrRaw] = useState<unknown>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNombre, setPreviewNombre] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [tempIdReutilizable, setTempIdReutilizable] =
    useState<string | null>(null);

  const [materializedDocumentoId, setMaterializedDocumentoId] =
    useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Impide un segundo dispatch OCR para el mismo TEMP durante esta sesión.
  const ocrDispatchedTempRef = useRef<string | null>(null);

  const permitidos = useMemo(
    () =>
      new Set(
        (ordenPago?.tiposDocumentalesRegularizadoresPermitidos ?? []).map(
          (tipo) => String(tipo).trim().toUpperCase(),
        ),
      ),
    [ordenPago?.tiposDocumentalesRegularizadoresPermitidos],
  );

  const tiposOperativos = useMemo(
    () =>
      SUPPORTED_REGULARIZERS.filter((tipo) => permitidos.has(tipo)),
    [permitidos],
  );

  // Si el snapshot congelado permite un único regularizador,
  // no obligamos al usuario a seleccionarlo manualmente.
  useEffect(() => {
    if (!open || tipoSeleccionado || tiposOperativos.length !== 1) return;
    setTipoSeleccionado(tiposOperativos[0]);
  }, [open, tipoSeleccionado, tiposOperativos]);

  // Mismo catálogo de proveedores usado por OC/OS/Factura.
  // Solo resuelve la razón social visual; NO compara contra el beneficiario OP.
  useEffect(() => {
    if (!open || tipoSeleccionado !== "FACTURA") return;

    const ruc = factura.rucEmisor.replace(/\D/g, "").trim();

    if (!/^\d{11}$/.test(ruc)) {
      setFactura((current) =>
        current.razonSocialEmisor
          ? { ...current, razonSocialEmisor: "" }
          : current,
      );
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const proveedores = await buscarProveedoresCatalogo(ruc, 20);
        const exacto = proveedores.find((item) => item.ruc === ruc);

        if (cancelled) return;

        setFactura((current) => ({
          ...current,
          rucEmisor: ruc,
          razonSocialEmisor: exacto?.razonSocial ?? "",
        }));
      } catch {
        if (cancelled) return;

        setFactura((current) => ({
          ...current,
          rucEmisor: ruc,
          razonSocialEmisor: "",
        }));
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, tipoSeleccionado, factura.rucEmisor]);

  useEffect(() => {
    if (open) return;

    setTipoSeleccionado(null);
    setArchivo(null);
    setTempId(null);
    setOcrStage("IDLE");
    setOcrMessage(null);
    setOcrRaw(null);
    setPreviewUrl(null);
    setPreviewNombre(null);
    setPreviewMime(null);
    setTempIdReutilizable(null);
    setMaterializedDocumentoId(null);
    setConfirmando(false);
    setConfirmError(null);
    ocrDispatchedTempRef.current = null;

    setFactura({
      serie: "",
      numero: "",
      fechaEmision: "",
      rucEmisor: "",
      razonSocialEmisor: "",
      montoTotal: "",
      moneda: "PEN",
    });

    setReciboHonorario({
      serie: "",
      numero: "",
      fechaEmision: "",
      rucEmisor: "",
      razonSocialEmisor: "",
      moneda: "PEN",
      montoTotal: "",
    });
  }, [open]);

  useEffect(() => {
    if (!archivo) return;

    const url = URL.createObjectURL(archivo);
    setPreviewUrl(url);
    setPreviewNombre(archivo.name);
    setPreviewMime(archivo.type || null);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  useEffect(() => {
    if (!open || !ordenPago || !tipoSeleccionado) return;

    let cancelled = false;

    void (async () => {
      try {
        const recovered = await recuperarTempRegularizacionOrdenPago(
          ordenPago.ordenPagoId,
          tipoSeleccionado,
        );

        if (cancelled || !recovered) return;

        if (!recovered.disponible) {
          const reusableTempId =
            recovered.tempId !== null &&
            recovered.tempId !== undefined &&
            String(recovered.tempId).trim() !== ""
              ? String(recovered.tempId)
              : null;

          setArchivo(null);
          setTempId(null);
          setTempIdReutilizable(reusableTempId);
          setPreviewUrl(null);
          setPreviewNombre(null);
          setPreviewMime(null);
          setOcrRaw(null);
          setOcrStage("IDLE");
          setOcrMessage(null);
          ocrDispatchedTempRef.current = null;
          return;
        }

        const recoveredTempId = String(recovered.tempId);

        setArchivo(null);
        setTempId(recoveredTempId);
        setTempIdReutilizable(null);
        setPreviewUrl(recovered.preview?.signedUrl ?? null);
        setPreviewNombre(
          recovered.preview?.filename ?? recovered.nombreOriginal ?? null,
        );
        setPreviewMime(
          recovered.preview?.contentType ?? recovered.mime ?? null,
        );

        // Un TEMP recuperado jamás vuelve a despachar OCR.
        ocrDispatchedTempRef.current = recoveredTempId;

        const candidate = recovered.ocrCandidate ?? null;
        const resultado = candidate?.resultado ?? null;

        setOcrRaw(resultado);

        if (!candidate) {
          setOcrStage("IDLE");
          setOcrMessage(
            "Documento temporal recuperado. Completa y valida los datos manualmente.",
          );
          return;
        }

        const candidateStatus = String(candidate.status ?? "").toUpperCase();

        if (candidateStatus === "PROCESSING") {
          setOcrStage("PROCESSING");
          setOcrMessage(
            "El OCR quedó en procesamiento. El documento fue recuperado y puedes validar los datos manualmente.",
          );
          return;
        }

        if (candidateStatus !== "DONE") {
          setOcrStage("IDLE");
          setOcrMessage(
            "Documento temporal recuperado. Completa y valida los datos manualmente.",
          );
          return;
        }

        const extracted =
          tipoSeleccionado === "FACTURA"
            ? facturaDesdeOcr(resultado)
            : reciboHonorarioDesdeOcr(resultado);

        const hasAnyValue = Object.values(extracted).some(
          (value) => String(value ?? "").trim() !== "",
        );

        if (hasAnyValue) {
          if (tipoSeleccionado === "FACTURA") {
            const facturaExtraida =
              extracted as Partial<FacturaValidationState>;

            setFactura((current) => ({
              ...current,
              ...facturaExtraida,
              moneda: facturaExtraida.moneda || current.moneda,
            }));
          } else {
            const reciboExtraido =
              extracted as Partial<ReciboHonorarioValidationState>;

            setReciboHonorario((current) => ({
              ...current,
              ...reciboExtraido,
              moneda: reciboExtraido.moneda || current.moneda,
            }));
          }

          setOcrStage("DONE");
          setOcrMessage(
            "Documento y datos OCR recuperados. Revisa y corrige antes de confirmar.",
          );
        } else {
          setOcrStage("EMPTY");
          setOcrMessage(
            "Documento recuperado. El OCR no dejó datos utilizables; completa los campos manualmente.",
          );
        }
      } catch {
        if (cancelled) return;

        // La recuperación no bloquea una nueva selección manual.
        setArchivo(null);
        setTempId(null);
        setPreviewUrl(null);
        setPreviewNombre(null);
        setPreviewMime(null);
        setOcrRaw(null);
        setOcrStage("IDLE");
        setOcrMessage(null);
        ocrDispatchedTempRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, ordenPago?.ordenPagoId, tipoSeleccionado]);

  if (!open || !ordenPago) return null;

  const pendiente = ordenPago.estadoRegularizacion === "PENDIENTE";

  const puedeRegularizar =
    pendiente &&
    tiposOperativos.length > 0;

  async function iniciarCargaYOcr(file: File) {
    if (!tipoSeleccionado || !ordenPago) return;

    const ordenPagoId = ordenPago.ordenPagoId;

    setArchivo(file);
    setTempId(null);
    setPreviewNombre(file.name);
    setPreviewMime(file.type || null);
    setOcrRaw(null);
    setOcrMessage(null);
    setOcrStage("UPLOADING");
    ocrDispatchedTempRef.current = null;

    try {
      let nextTempId: string;

      if (tempIdReutilizable) {
        const replaced = await reemplazarTempRegularizacionOrdenPago(
          tempIdReutilizable,
          ordenPagoId,
          tipoSeleccionado,
          file,
          newIdempotencyKey("op-regularizador-reemplazo"),
        );

        nextTempId = String(replaced.tempId);
        setTempIdReutilizable(null);
      } else {
        const upload = await subirArchivoInicialOrdenPago(
          file,
          newIdempotencyKey("op-regularizador-upload"),
        );

        nextTempId = String(upload.tempId);

        await vincularTempRegularizacionOrdenPago(
          nextTempId,
          ordenPagoId,
          tipoSeleccionado,
          newIdempotencyKey("op-regularizador-bind"),
        );
      }

      setTempId(nextTempId);

      // El OCR se despacha exactamente una vez por generación física.
      if (ocrDispatchedTempRef.current === nextTempId) return;
      ocrDispatchedTempRef.current = nextTempId;

      setOcrStage("PROCESSING");

      const resultado = await procesarOcrTemporalOrdenPago(
        nextTempId,
        { tipoEsperado: tipoSeleccionado },
        newIdempotencyKey("op-regularizador-ocr"),
      );

      setOcrRaw(resultado);

      const extracted =
        tipoSeleccionado === "FACTURA"
          ? facturaDesdeOcr(resultado)
          : reciboHonorarioDesdeOcr(resultado);

      const hasAnyValue = Object.values(extracted).some(
        (value) => String(value ?? "").trim() !== "",
      );

      if (hasAnyValue) {
        if (tipoSeleccionado === "FACTURA") {
          const facturaExtraida = extracted as Partial<FacturaValidationState>;
          setFactura((current) => ({
            ...current,
            ...facturaExtraida,
            moneda: facturaExtraida.moneda || current.moneda,
          }));
        } else {
          const reciboExtraido =
            extracted as Partial<ReciboHonorarioValidationState>;
          setReciboHonorario((current) => ({
            ...current,
            ...reciboExtraido,
            moneda: reciboExtraido.moneda || current.moneda,
          }));
        }
      }

      const backendEstado = estadoOcr(resultado);

      if (
        backendEstado.includes("PROCESSING") ||
        backendEstado.includes("PROCES")
      ) {
        setOcrStage("PROCESSING");
        setOcrMessage(
          "El OCR continúa procesándose. El archivo TEMP se conserva; no vuelvas a subirlo.",
        );
        return;
      }

      if (
        backendEstado.includes("EMPTY") ||
        backendEstado.includes("VACIO") ||
        backendEstado.includes("VACÍO")
      ) {
        setOcrStage("EMPTY");
        setOcrMessage(
          "El OCR no obtuvo datos utilizables. Completa los campos manualmente.",
        );
        return;
      }

      if (
        backendEstado.includes("PARTIAL") ||
        backendEstado.includes("PARCIAL")
      ) {
        setOcrStage("PARTIAL");
        setOcrMessage(
          "El OCR recuperó información parcial. Revisa y completa los campos antes de confirmar.",
        );
        return;
      }

      if (hasAnyValue) {
        setOcrStage("DONE");
        setOcrMessage(
          "OCR completado. Revisa y corrige los datos antes de confirmar.",
        );
      } else {
        // No fabricamos metadata si el backend no devolvió valores.
        setOcrStage("EMPTY");
        setOcrMessage(
          "No se encontraron datos para prellenar. Completa los campos manualmente.",
        );
      }
    } catch (error) {
      setOcrStage("ERROR");
      setOcrMessage(mensajeError(error));
    }
  }

  function handleTipoChange(value: string) {
    const nextTipo = (value || null) as RegularizadorOperativo | null;

    setTipoSeleccionado(nextTipo);
    setArchivo(null);
    setTempId(null);
    setTempIdReutilizable(null);
    setPreviewUrl(null);
    setPreviewNombre(null);
    setPreviewMime(null);
    setOcrRaw(null);
    setOcrMessage(null);
    setOcrStage("IDLE");
    setMaterializedDocumentoId(null);
    setConfirmando(false);
    setConfirmError(null);
    ocrDispatchedTempRef.current = null;

    setFactura({
      serie: "",
      numero: "",
      fechaEmision: "",
      rucEmisor: "",
      razonSocialEmisor: "",
      montoTotal: "",
      moneda: "PEN",
    });

    setReciboHonorario({
      serie: "",
      numero: "",
      fechaEmision: "",
      rucEmisor: "",
      razonSocialEmisor: "",
      moneda: "PEN",
      montoTotal: "",
    });
  }

  const facturaCompleta =
    Boolean(factura.serie.trim()) &&
    Boolean(factura.numero.trim()) &&
    Boolean(factura.fechaEmision.trim()) &&
    Boolean(factura.rucEmisor.trim()) &&
    Boolean(factura.razonSocialEmisor.trim()) &&
    Boolean(factura.montoTotal.trim());

  const puedeConfirmarFactura =
    tipoSeleccionado === "FACTURA" &&
    Boolean(tempId) &&
    facturaCompleta &&
    !confirmando;

  const reciboHonorarioCompleto =
    Boolean(reciboHonorario.serie.trim()) &&
    Boolean(reciboHonorario.numero.trim()) &&
    Boolean(reciboHonorario.fechaEmision.trim()) &&
    Boolean(reciboHonorario.rucEmisor.trim()) &&
    Boolean(reciboHonorario.razonSocialEmisor.trim()) &&
    Boolean(reciboHonorario.moneda.trim()) &&
    Boolean(reciboHonorario.montoTotal.trim());

  const puedeConfirmarReciboHonorario =
    tipoSeleccionado === "RECIBO_HONORARIO" &&
    Boolean(tempId) &&
    reciboHonorarioCompleto &&
    !confirmando;

  async function confirmarRegularizacion() {
    if (
      !ordenPago ||
      !tipoSeleccionado ||
      !tempId ||
      confirmando ||
      (tipoSeleccionado === "FACTURA" && !facturaCompleta) ||
      (tipoSeleccionado === "RECIBO_HONORARIO" &&
        !reciboHonorarioCompleto)
    ) {
      return;
    }

    setConfirmando(true);
    setConfirmError(null);

    try {
      let documentoId = materializedDocumentoId;

      if (!documentoId) {
        const materializada =
          tipoSeleccionado === "FACTURA"
            ? await materializarFacturaTemporalOrdenPago(
                tempId,
                {
                  metadata: {
                    fechaEmision: factura.fechaEmision.trim(),
                    serie: factura.serie.trim(),
                    numero: factura.numero.trim(),
                    rucProveedor: factura.rucEmisor.trim(),
                    proveedor: factura.razonSocialEmisor.trim(),
                    moneda: factura.moneda.trim(),
                    montoTotal: factura.montoTotal.trim(),
                  },
                },
                newIdempotencyKey("op-factura-materializar"),
              )
            : await materializarReciboHonorarioTemporalOrdenPago(
                tempId,
                {
                  metadata: {
                    rucEmisor: reciboHonorario.rucEmisor.trim(),
                    razonSocialEmisor:
                      reciboHonorario.razonSocialEmisor.trim() || undefined,
                    serie: reciboHonorario.serie.trim(),
                    numero: reciboHonorario.numero.trim(),
                    fechaEmision: reciboHonorario.fechaEmision.trim(),
                    moneda: reciboHonorario.moneda.trim(),
                    montoTotal: reciboHonorario.montoTotal.trim(),
                  },
                },
                newIdempotencyKey("op-recibo-honorario-materializar"),
              );

        documentoId = Number(materializada.documentoId);

        if (!Number.isInteger(documentoId) || documentoId <= 0) {
          throw new Error(
            "La materialización no devolvió un documentoId canónico válido.",
          );
        }

        setMaterializedDocumentoId(documentoId);
      }

      if (tipoSeleccionado === "FACTURA") {
        await regularizarOrdenPagoFactura(
          ordenPago.grupoFacturaId,
          documentoId,
        );
      } else {
        await regularizarOrdenPagoReciboHonorario(
          ordenPago.grupoFacturaId,
          documentoId,
        );
      }

      await onCompleted?.();
      onClose();
    } catch (error) {
      setConfirmError(mensajeError(error));
    } finally {
      setConfirmando(false);
    }
  }

  function handleClose() {
    if (!open || confirmando) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regularizar-op-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2
              id="regularizar-op-title"
              className="text-xl font-semibold text-foreground"
            >
              Regularizar Orden de Pago
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Adjunta el documento regularizador, revisa la información y
              confirma los datos antes de registrar.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
          <section className="flex min-h-[520px] flex-col border-b bg-muted/20 lg:border-b-0 lg:border-r">
            <div className="border-b bg-background px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Documento regularizador
              </p>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[220px] text-sm">
                  <span className="mb-1 block font-medium">
                    Tipo de documento
                  </span>

                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={tipoSeleccionado ?? ""}
                    disabled={!puedeRegularizar}
                    onChange={(event) =>
                      handleTipoChange(event.target.value)
                    }
                  >
                    <option value="">Seleccionar</option>

                    {tiposOperativos.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {labelTipo(tipo)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium">Archivo</span>

                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    disabled={!tipoSeleccionado}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      if (file) void iniciarCargaYOcr(file);
                    }}
                  />
                </label>
              </div>

              {!puedeRegularizar ? (
                <p className="mt-3 text-sm text-amber-700">
                  Esta obligación no tiene actualmente un tipo regularizador
                  operativo habilitado.
                </p>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center p-5">
              {previewUrl && previewNombre ? (
                <div className="flex h-full min-h-[430px] w-full flex-col overflow-hidden rounded-xl border bg-background">
                  <div className="flex items-center gap-2 border-b px-4 py-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {previewNombre}
                    </span>
                  </div>

                  {previewMime === "application/pdf" ? (
                    <iframe
                      title={`Vista previa de ${previewNombre}`}
                      src={previewUrl}
                      className="min-h-[430px] flex-1 bg-muted/20"
                    />
                  ) : previewMime?.startsWith("image/") ? (
                    <div className="flex min-h-[430px] flex-1 items-center justify-center overflow-auto bg-muted/20 p-4">
                      <img
                        src={previewUrl}
                        alt={previewNombre}
                        className="max-h-[68vh] max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[430px] flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                      Vista previa no disponible para este formato.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[430px] w-full flex-col items-center justify-center rounded-xl border border-dashed bg-background p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />

                  <p className="mt-4 font-medium">
                    Selecciona el documento regularizador
                  </p>

                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    El documento permanecerá visible durante la validación.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto">
            <div className="space-y-6 p-5">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Orden de Pago
                </p>

                <div className="mt-3 rounded-xl border bg-muted/20 p-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Número</dt>
                      <dd className="mt-1 font-semibold">{ordenPago.numero}</dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Estado</dt>
                      <dd className="mt-1 font-semibold">
                        {ordenPago.estadoRegularizacion ?? "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Concepto</dt>
                      <dd className="mt-1">
                        {ordenPago.conceptoNombre ??
                          ordenPago.conceptoCodigo ??
                          "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Período</dt>
                      <dd className="mt-1">
                        {ordenPago.periodoMes && ordenPago.periodoAnio
                          ? `${String(ordenPago.periodoMes).padStart(2, "0")}/${ordenPago.periodoAnio}`
                          : "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Monto</dt>
                      <dd className="mt-1 font-semibold">
                        {formatMonto(ordenPago.monto, ordenPago.moneda)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Moneda</dt>
                      <dd className="mt-1">{ordenPago.moneda || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Sustentos de pago {sustentos.length ? `(${sustentos.length})` : ""}
                </p>

                <div className="mt-3 space-y-2">
                  {sustentos.length ? (
                    sustentos.map((sustento, index) => (
                      <div
                        key={String(sustento.id)}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">Pago {index + 1}</span>

                          <span className="font-semibold">
                            {formatMonto(sustento.monto, sustento.moneda)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {[
                            sustento.banco,
                            sustento.operacion
                              ? `Op. ${sustento.operacion}`
                              : null,
                            sustento.moneda,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Sin detalle adicional"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      No hay sustentos de pago para mostrar.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Datos del documento regularizador
                </p>

                {ocrStage !== "IDLE" ? (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {ocrStage === "UPLOADING"
                          ? "Cargando archivo temporal..."
                          : ocrStage === "PROCESSING"
                            ? "Procesando OCR..."
                            : ocrStage === "DONE"
                              ? "OCR completado"
                              : ocrStage === "PARTIAL"
                                ? "OCR parcial"
                                : ocrStage === "EMPTY"
                                  ? "OCR sin datos"
                                  : "OCR no disponible"}
                      </span>

                      {tempId ? (
                        <span className="text-xs text-muted-foreground">
                          Archivo temporal preservado
                        </span>
                      ) : null}
                    </div>

                    {ocrMessage ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ocrMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!tipoSeleccionado ? (
                  <div className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Selecciona un tipo documental para continuar.
                  </div>
                ) : null}

                {tipoSeleccionado === "FACTURA" ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Serie</span>
                      <Input
                        value={factura.serie}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            serie: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Número</span>
                      <Input
                        value={factura.numero}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            numero: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Fecha de emisión
                      </span>
                      <Input
                        type="date"
                        value={factura.fechaEmision}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            fechaEmision: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">RUC emisor</span>
                      <Input
                        inputMode="numeric"
                        maxLength={11}
                        value={factura.rucEmisor}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            rucEmisor: event.target.value.replace(/\D/g, "").slice(0, 11),
                          }))
                        }
                      />
                    </label>

                    <label className="col-span-2 text-sm">
                      <span className="mb-1 block font-medium">
                        Razón social
                      </span>
                      <Input
                        value={factura.razonSocialEmisor}
                        readOnly
                        placeholder="Se completa desde el catálogo por RUC"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Monto total</span>
                      <Input
                        inputMode="decimal"
                        value={factura.montoTotal}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            montoTotal: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Moneda</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={factura.moneda}
                        onChange={(event) =>
                          setFactura((current) => ({
                            ...current,
                            moneda: event.target.value,
                          }))
                        }
                      >
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>
                ) : null}

                {tipoSeleccionado === "RECIBO_HONORARIO" ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Serie</span>
                      <Input
                        value={reciboHonorario.serie}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            serie: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Número</span>
                      <Input
                        value={reciboHonorario.numero}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            numero: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Fecha de emisión
                      </span>
                      <Input
                        type="date"
                        value={reciboHonorario.fechaEmision}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            fechaEmision: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">RUC emisor</span>
                      <Input
                        value={reciboHonorario.rucEmisor}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            rucEmisor: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="col-span-2 text-sm">
                      <span className="mb-1 block font-medium">
                        Nombre completo
                      </span>
                      <Input
                        value={reciboHonorario.razonSocialEmisor}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            razonSocialEmisor: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Monto total</span>
                      <Input
                        inputMode="decimal"
                        value={reciboHonorario.montoTotal}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            montoTotal: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Moneda</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={reciboHonorario.moneda}
                        onChange={(event) =>
                          setReciboHonorario((current) => ({
                            ...current,
                            moneda: event.target.value,
                          }))
                        }
                      >
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>
                ) : null}

                <p className="mt-3 text-xs text-muted-foreground">
                  Los datos obtenidos por OCR serán una ayuda para completar
                  este formulario. La confirmación final siempre será humana.
                </p>

                {materializedDocumentoId ? (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <p className="font-medium">
                      Documento validado y materializado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      El documento ya tiene identidad documental canónica.
                      Si la asociación falla, reintentar no vuelve a cargar,
                      procesar OCR ni materializar el documento.
                    </p>
                  </div>
                ) : null}

                {confirmError ? (
                  <div
                    className="mt-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {confirmError}
                  </div>
                ) : null}
              </section>
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            La clave documental será derivada y validada por el backend.
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={
                    tipoSeleccionado === "FACTURA"
                      ? !puedeConfirmarFactura
                      : tipoSeleccionado === "RECIBO_HONORARIO"
                        ? !puedeConfirmarReciboHonorario
                        : true
                  }
              onClick={() => void confirmarRegularizacion()}
            >
              {confirmando
                ? materializedDocumentoId
                  ? "Asociando documento..."
                  : tipoSeleccionado === "RECIBO_HONORARIO"
                    ? "Materializando recibo por honorarios..."
                    : "Materializando factura..."
                : materializedDocumentoId
                  ? "Reintentar asociación"
                  : "Confirmar regularización"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
