"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  ShoppingCart,
  UploadCloud,
} from "lucide-react";

import { OcrProcessingDialog, type OcrProcessingStep } from "@/components/ocr/OcrProcessingDialog";
import { OcrValidationModal, type OcrValidationFormState } from "@/components/ocr/OcrValidationModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prevalidarDocumentoGuiado, subirDocumentoGuiado } from "@/services/carga-guiada";
import { agregarArchivoComoVersion } from "@/services/documentos";
import {
  buscarExpedientes,
  crearExpediente,
  type ExpedienteSearchResult,
} from "@/services/expedientes";
import {
  confirmarOcrConExpediente,
  editarOcrResultado,
  procesarArchivoOcr,
  rechazarOcrResultado,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";
import type { CargaGuiadaPayloadPreview, CargaGuiadaPrevalidacionResponse } from "@/types/carga-guiada";

type TipoInicio = "OC" | "OS" | "FACTURA";

type OpcionInicio = {
  tipo: TipoInicio;
  title: string;
  shortLabel: string;
  description: string;
  icon: typeof ShoppingCart;
  tipoRelacionPrincipal: "principal_oc" | "principal_os" | "principal_factura";
  codigoHint: string;
  codigoPrefix?: string;
};

type PrevalidacionExistenteUI = {
  documentoId?: string | number | null;
  archivoId?: string | number | null;
  expedienteId?: string | number | null;
};

const OPTIONS: OpcionInicio[] = [
  {
    tipo: "OC",
    title: "Orden de Compra",
    shortLabel: "OC principal",
    description: "Registrar una OC y asociarla a una OP / PR con código 05*.",
    icon: ShoppingCart,
    tipoRelacionPrincipal: "principal_oc",
    codigoHint: "Ejemplo: 050201",
    codigoPrefix: "05",
  },
  {
    tipo: "OS",
    title: "Orden de Servicio",
    shortLabel: "OS principal",
    description: "Registrar una OS y asociarla a un centro de costo con código 03*.",
    icon: FileText,
    tipoRelacionPrincipal: "principal_os",
    codigoHint: "Ejemplo: 030120",
    codigoPrefix: "03",
  },
  {
    tipo: "FACTURA",
    title: "Factura directa",
    shortLabel: "Factura principal",
    description: "Registrar una factura sin OC/OS como gasto directo.",
    icon: ReceiptText,
    tipoRelacionPrincipal: "principal_factura",
    codigoHint: "Ejemplo: GD-2026-001 o 050201",
  },
];

const CLIENTES = [
  {
    label: "BBTEC · BB TECNOLOGIA INDUSTRIAL S.A.C.",
    empresaCodigo: "BBTEC",
    clienteDestinoId: 1,
  },
  {
    label: "BBTI · BBTI S.A.C.",
    empresaCodigo: "BBTI",
    clienteDestinoId: 2,
  },
  {
    label: "CIMA · CONSORCIO CIMA ENERGY",
    empresaCodigo: "CIMA",
    clienteDestinoId: 3,
  },
  {
    label: "TARMA · CONSORCIO ILUMINACION TARMA 2025",
    empresaCodigo: "TARMA",
    clienteDestinoId: 4,
  },
  {
    label: "HUANCA · CONSORCIO HUANCAVELICA",
    empresaCodigo: "HUANCA",
    clienteDestinoId: 5,
  },
  {
    label: "KIMBIRI · Consorcio Kimbiri",
    empresaCodigo: "KIMBIRI",
    clienteDestinoId: 6,
  },
];

const RUC_COMPRADOR_POR_EMPRESA: Record<string, string> = {
  BBTEC: "20299922821",
  BBTI: "20565747356",
  CIMA: "20613521004",
  TARMA: "20614307197",
  HUANCA: "20612122416",
  KIMBIRI: "20609856140",
};

function getErrorMessage(error: unknown) {
  const data = (error as any)?.response?.data;
  return (
    data?.error?.message ??
    data?.message ??
    (error instanceof Error ? error.message : null) ??
    "No se pudo completar la operación"
  );
}

function prevalidacionMessage(resultado: CargaGuiadaPrevalidacionResponse) {
  const accion = String(resultado.accionSugerida ?? "");
  const motivo = String(resultado.motivo ?? "");
  const duplicado = resultado.duplicados?.[0];
  const principal = resultado.principalActivo;

  if (accion === "abrir_existente" || resultado.duplicadoArchivo || motivo.includes("DUPLICADO")) {
    return [
      "Este archivo ya fue cargado anteriormente. Puedes abrir el documento existente.",
      duplicado?.documentoId ? `Documento existente: ${duplicado.documentoId}.` : null,
      duplicado?.archivoId ? `Archivo existente: ${duplicado.archivoId}.` : null,
      duplicado?.expedienteId ? `Centro de costo vinculado: ${duplicado.expedienteId}.` : null,
      "No se volvió a subir a R2.",
    ].filter(Boolean).join("\n");
  }

  if (resultado.expedienteTienePrincipal || motivo === "EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL") {
    return [
      "Este centro de costo ya tiene un documento principal activo.",
      principal?.numero ? `Principal actual: ${String(principal.numero)}.` : null,
      "No se reemplazará automáticamente. Cancela o gestiona el expediente.",
    ].filter(Boolean).join("\n");
  }

  if (resultado.codigoExpedienteCoincide === false || motivo === "CODIGO_EXPEDIENTE_NO_COINCIDE") {
    return [
      "El código detectado en el documento no coincide con el centro de costo seleccionado.",
      resultado.codigoExpedienteSeleccionado ? `Centro de costo seleccionado: ${resultado.codigoExpedienteSeleccionado}.` : null,
      resultado.codigoExpedienteDetectado ? `Código detectado en documento: ${resultado.codigoExpedienteDetectado}.` : null,
      "Revisa el documento o cambia el centro de costo seleccionado antes de confirmar.",
    ].filter(Boolean).join("\n");
  }

  if (accion === "vincular_existente") {
    return "El documento ya existe. La vinculación de existentes queda pendiente de contrato funcional.";
  }

  if (accion === "requiere_confirmacion") {
    return "La prevalidación requiere confirmación explícita. No se continuará automáticamente.";
  }

  if (accion === "bloquear") {
    return "La prevalidación bloqueó la carga. Revisa el centro de costo o el documento seleccionado.";
  }

  return "La prevalidación no autorizó continuar con la carga.";
}

function toIdValue(value: unknown): string | number | null | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (value === null || value === undefined) {
    return value;
  }

  return undefined;
}

function getPrevalidacionExistente(resultado: CargaGuiadaPrevalidacionResponse): PrevalidacionExistenteUI | null {
  const duplicado = resultado.duplicados?.[0];
  const documentoExistente = resultado.documentoExistente as Record<string, unknown> | null | undefined;

  const documentoId =
    toIdValue(duplicado?.documentoId) ??
    toIdValue(documentoExistente?.documentoId) ??
    toIdValue(documentoExistente?.documento_id) ??
    toIdValue(documentoExistente?.id) ??
    toIdValue(resultado.documentoId);

  const archivoId = 
  toIdValue(duplicado?.archivoId) ?? 
  toIdValue(documentoExistente?.archivoId) ?? 
  toIdValue(documentoExistente?.archivo_id);

  const expedienteId = 
  toIdValue(duplicado?.expedienteId) ?? 
  toIdValue(documentoExistente?.expedienteId) ?? 
  toIdValue(documentoExistente?.expediente_id) ?? 
  toIdValue(resultado.expedienteId);

  if (!documentoId && !archivoId && !expedienteId) return null;

  return { documentoId, archivoId, expedienteId };
}

function expedienteLabel(expediente: ExpedienteSearchResult) {
  return [
    `#${expediente.id}`,
    expediente.codigoExpediente,
    expediente.descripcion,
    expediente.empresaCodigo,
  ]
    .filter(Boolean)
    .join(" · ");
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function emptyToUndefined(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function normalizeAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  return normalized || undefined;
}

function normalizeTipoDocumentalParaBackend(tipoDocumental: string) {
  const tipo = String(tipoDocumental || "").trim().toUpperCase();
  if (tipo === "GUIA" || tipo === "GUÍA") return "GUIA_REMISION";
  return tipo;
}

function getArchivoId(source: Record<string, unknown> | null | undefined) {
  const value = source?.archivoId ?? source?.archivo_id ?? source?.id;
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function getOcrResultadoId(source: Record<string, unknown> | null | undefined) {
  const value =
    source?.ocrResultadoId ??
    source?.ocr_resultado_id ??
    source?.ocrId ??
    source?.id;

  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function buildMetadataDesdeFormulario(
  form: OcrValidationFormState,
  context: {
    codigoExpediente?: string;
    rucComprador?: string;
    clienteAbreviatura?: string;
    expedienteId?: string | number;
    tipoRelacion?: string;
  },
) {
  const tipo = normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || ""));
  const codigoExpediente = emptyToUndefined(form.codigoExpediente) ?? emptyToUndefined(context.codigoExpediente);
  const rucComprador = emptyToUndefined(form.rucComprador) ?? emptyToUndefined(context.rucComprador);
  const rucEmisor = emptyToUndefined(form.rucEmisor);
  const rucProveedor = emptyToUndefined(form.rucProveedor) ?? rucEmisor;
  const razonSocial = emptyToUndefined(form.razonSocial);
  const proveedor = emptyToUndefined(form.proveedor) ?? razonSocial;

  return {
    tipoDocumental: tipo,
    clienteAbreviatura: emptyToUndefined(context.clienteAbreviatura),
    numero: emptyToUndefined(form.numero),
    serie: emptyToUndefined(form.serie),
    fechaEmision: emptyToUndefined(form.fechaEmision),
    proveedor,
    razonSocial,
    ruc: tipo === "FACTURA" || tipo === "GUIA_REMISION" ? rucEmisor ?? rucProveedor : undefined,
    rucEmisor,
    rucProveedor,
    rucComprador,
    montoTotal: normalizeAmount(form.montoTotal),
    moneda: emptyToUndefined(form.moneda),
    cotizacion: emptyToUndefined(form.cotizacion),
    codigoExpediente,
    claveDocumental: emptyToUndefined(form.claveDocumental),
    documentoRelacionado: emptyToUndefined(form.documentoRelacionado),
    contextoValidacion: {
      origen: "COMPRAS_NUEVO_MODAL_PRINCIPAL",
      expedienteId: context.expedienteId,
      codigoExpediente,
      tipoRelacionSugerida: context.tipoRelacion,
      confirmadoDesde: "compras_nuevo",
    },
  };
}

function buildResultadoConContexto(
  resultado: ProcesarOcrResultado,
  option: OpcionInicio,
  expediente: ExpedienteSearchResult,
  extra: {
    archivoId: string;
    filename: string;
    uploadResponse: Record<string, unknown>;
  },
): ProcesarOcrResultado {
  const metadataOriginal = resultado.metadata;
  const metadata =
    metadataOriginal && typeof metadataOriginal === "object" && !Array.isArray(metadataOriginal)
      ? metadataOriginal
      : {};

  return {
    ...resultado,
    archivoId: resultado.archivoId ?? extra.archivoId,
    tipoRelacionSugerida: option.tipoRelacionPrincipal,
    contextoCarga: {
      origen: "COMPRAS_NUEVO_UPLOAD_PRINCIPAL",
      grupo: "principal",
      accion: option.title,
      archivoId: extra.archivoId,
      filename: extra.filename,
      tipoEsperado: option.tipo,
      tipoRelacionSugerida: option.tipoRelacionPrincipal,
      expedienteId: expediente.id,
      upload: extra.uploadResponse,
    },
    metadata: {
      ...metadata,
      rucComprador:
        (metadata as any).rucComprador ??
        RUC_COMPRADOR_POR_EMPRESA[expediente.empresaCodigo] ??
        undefined,
      codigoExpediente:
        (metadata as any).codigoExpediente ??
        expediente.codigoExpediente,
      clienteAbreviatura:
        (metadata as any).clienteAbreviatura ??
        expediente.empresaCodigo,
      contextoCarga: {
        origen: "COMPRAS_NUEVO_UPLOAD_PRINCIPAL",
        grupo: "principal",
        accion: option.title,
        archivoId: extra.archivoId,
        filename: extra.filename,
        tipoEsperado: option.tipo,
        tipoRelacionSugerida: option.tipoRelacionPrincipal,
        expedienteId: expediente.id,
        upload: extra.uploadResponse,
      },
    },
  };
}

export function NuevoExpedienteWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoInicio>("OC");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ExpedienteSearchResult[]>([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] =
    useState<ExpedienteSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [codigoExpediente, setCodigoExpediente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [clienteKey, setClienteKey] = useState("BBTI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inicioModalAbierto, setInicioModalAbierto] = useState(false);
  const [processingStep, setProcessingStep] = useState<OcrProcessingStep>("idle");
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [resultadoModal, setResultadoModal] = useState<ProcesarOcrResultado | null>(null);
  const [archivoIdModal, setArchivoIdModal] = useState<string | number | null>(null);
  const [validacionAbierta, setValidacionAbierta] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [prevalidacionExistente, setPrevalidacionExistente] = useState<PrevalidacionExistenteUI | null>(null);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);

  const selectedOption = useMemo(
    () => OPTIONS.find((option) => option.tipo === selectedTipo) ?? OPTIONS[0],
    [selectedTipo],
  );

  const selectedCliente = useMemo(
    () => CLIENTES.find((cliente) => cliente.empresaCodigo === clienteKey) ?? CLIENTES[1],
    [clienteKey],
  );

  const codigoNormalizado = codigoExpediente.trim().toUpperCase();
  const codigoPrefixWarning =
    selectedOption.codigoPrefix && codigoNormalizado && !codigoNormalizado.startsWith(selectedOption.codigoPrefix)
      ? `Para ${selectedOption.title}, el código normalmente inicia con ${selectedOption.codigoPrefix}.`
      : null;

  useEffect(() => {
    const term = query.trim();
    setError(null);

    if (expedienteSeleccionado) {
      setResultados([]);
      setIsSearching(false);
      return;
    }

    if (term.length < 2) {
      setResultados([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await buscarExpedientes(term, 10);
        if (!cancelled) {
          setResultados(data);
        }
      } catch (searchError) {
        if (!cancelled) {
          setError(getErrorMessage(searchError));
          setResultados([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, expedienteSeleccionado]);

  function handleSelectExpediente(expediente: ExpedienteSearchResult) {
    setExpedienteSeleccionado(expediente);
    setQuery(expediente.codigoExpediente || expedienteLabel(expediente));
    setResultados([]);
    setError(null);
  }

  function handleSelectTipo(option: OpcionInicio) {
    setSelectedTipo(option.tipo);
    setError(null);
  }

  function handleAbrirInicioPrincipal() {
    setError(null);

    if (!expedienteSeleccionado?.id) {
      setError("Primero selecciona un expediente existente. Luego carga el documento principal.");
      return;
    }

    setInicioModalAbierto(true);
  }

  function handleAbrirEditorSinCarga() {
    if (!expedienteSeleccionado?.id) {
      setError("Selecciona un expediente existente para abrirlo.");
      return;
    }
    setIsOpeningEditor(true);
    router.push(`/compras/${expedienteSeleccionado.id}/editar`);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!codigoNormalizado) {
      setError("Ingresa el código de expediente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const expediente = await crearExpediente({
        clienteDestinoId: selectedCliente.clienteDestinoId,
        empresaCodigo: selectedCliente.empresaCodigo,
        codigoExpediente: codigoNormalizado,
        descripcion: descripcion.trim() || null,
        metadata: {
          modulo: "COMPRAS",
          tipoInicio: selectedOption.tipo,
          tipoRelacionPrincipal: selectedOption.tipoRelacionPrincipal,
          creadoDesde: "compras_nuevo",
        },
      });

      const id = (expediente as any)?.id ?? (expediente as any)?.expediente?.id;

      if (!id) {
        throw new Error("El backend no devolvió el id del expediente creado.");
      }

      const creado: ExpedienteSearchResult = {
        id,
        codigoExpediente: String((expediente as any)?.codigo_expediente ?? (expediente as any)?.codigoExpediente ?? codigoNormalizado),
        descripcion: String((expediente as any)?.descripcion ?? descripcion.trim() ?? ""),
        empresaCodigo: String((expediente as any)?.empresa_codigo ?? (expediente as any)?.empresaCodigo ?? selectedCliente.empresaCodigo),
        clienteDestinoId: (expediente as any)?.cliente_destino_id ?? (expediente as any)?.clienteDestinoId ?? selectedCliente.clienteDestinoId,
        clienteNombre: selectedCliente.label,
        estado: String((expediente as any)?.estado ?? "abierto"),
        documentos: 0,
        alertas: 0,
      };

      setExpedienteSeleccionado(creado);
      setQuery(creado.codigoExpediente);
      setShowCreateNew(false);
      setInicioModalAbierto(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function procesarArchivoPrincipal(file: File) {
    if (!expedienteSeleccionado?.id) {
      setAccionError("Selecciona un expediente antes de procesar el documento principal.");
      return;
    }

    setProcessingFileName(file.name);
    setProcessingError(null);
    setAccionError(null);
    setPrevalidacionExistente(null);
    setProcessingStep("prevalidating");

    try {
      const clienteAbreviatura = expedienteSeleccionado.empresaCodigo;
      const uploadPayload: CargaGuiadaPayloadPreview = {
        areaOrigen: "COMPRAS",
        clienteAbreviatura,
        tipoEsperado: selectedOption.tipo as CargaGuiadaPayloadPreview["tipoEsperado"],
        expedienteId: expedienteSeleccionado.id,
        tipoRelacionSugerida: selectedOption.tipoRelacionPrincipal,
        canalIngreso: "COMPRAS_NUEVO_UPLOAD_PRINCIPAL",
        observacion: `Carga desde Compras Nuevo: ${selectedOption.shortLabel}`,
        esPrincipal: true,
      };

      const prevalidacion = await prevalidarDocumentoGuiado(uploadPayload, file);

      if (prevalidacion.accionSugerida !== "cargar_nuevo") {
        const message = prevalidacionMessage(prevalidacion);
        setProcessingStep("idle");
        setProcessingError(null);
        setAccionError(message);
        setPrevalidacionExistente(getPrevalidacionExistente(prevalidacion));
        return;
      }

      setProcessingStep("uploading");
      const uploadResponse = await subirDocumentoGuiado(uploadPayload, file);
      const archivoId = getArchivoId(uploadResponse as Record<string, unknown>);

      if (!archivoId) {
        throw new Error("El upload no devolvió archivoId.");
      }

      setArchivoIdModal(archivoId);
      setProcessingStep("processing_ocr");

      const resultado = await procesarArchivoOcr(archivoId, {
        tipoEsperado: selectedOption.tipo,
        areaOrigen: "COMPRAS",
        clienteAbreviatura,
        expedienteId: expedienteSeleccionado.id,
        tipoRelacionSugerida: selectedOption.tipoRelacionPrincipal,
        canalIngreso: "COMPRAS_NUEVO_UPLOAD_PRINCIPAL",
        reprocesar: true,
      });

      setProcessingStep("preparing_preview");
      setResultadoModal(
        buildResultadoConContexto(resultado, selectedOption, expedienteSeleccionado, {
          archivoId,
          filename: file.name,
          uploadResponse: uploadResponse as Record<string, unknown>,
        }),
      );

      setProcessingStep("ready");
      window.setTimeout(() => {
        setProcessingStep("idle");
        setInicioModalAbierto(false);
        setValidacionAbierta(true);
      }, 450);
    } catch (processError) {
      const message = getErrorMessage(processError);
      setProcessingStep("error");
      setProcessingError(message);
      setAccionError(message);
    }
  }

  function onArchivoPrincipalSeleccionado(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    void procesarArchivoPrincipal(file);
  }

  async function guardarCambiosOcr(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para guardar cambios.");
    }

    await editarOcrResultado(ocrResultadoId, {
      tipoPropuesto: normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || selectedOption.tipo)),
      metadata: buildMetadataDesdeFormulario(form, {
        codigoExpediente: expedienteSeleccionado?.codigoExpediente,
        rucComprador: RUC_COMPRADOR_POR_EMPRESA[expedienteSeleccionado?.empresaCodigo ?? ""],
        clienteAbreviatura: expedienteSeleccionado?.empresaCodigo,
        expedienteId: expedienteSeleccionado?.id,
        tipoRelacion: selectedOption.tipoRelacionPrincipal,
      }),
      observacion: "Edición manual desde Compras > Nuevo",
    });
  }

  async function confirmarOcrPrincipal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para confirmar.");
    }

    if (!expedienteSeleccionado?.id) {
      throw new Error("Selecciona un expediente antes de confirmar el documento principal.");
    }

    const metadata = buildMetadataDesdeFormulario(form, {
      codigoExpediente: expedienteSeleccionado.codigoExpediente,
      rucComprador: RUC_COMPRADOR_POR_EMPRESA[expedienteSeleccionado.empresaCodigo],
      clienteAbreviatura: expedienteSeleccionado.empresaCodigo,
      expedienteId: expedienteSeleccionado.id,
      tipoRelacion: selectedOption.tipoRelacionPrincipal,
    });

    await confirmarOcrConExpediente(ocrResultadoId, {
      expedienteId: expedienteSeleccionado.id,
      tipoRelacion: selectedOption.tipoRelacionPrincipal,
      esPrincipal: true,
      orden: 1,
      metadata,
      observacion: "Guardar y confirmar principal desde Compras > Nuevo",
    });

    setValidacionAbierta(false);
    router.push(`/compras/${expedienteSeleccionado.id}/editar`);
  }

  async function rechazarOcrPrincipal() {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para rechazar.");
    }

    await rechazarOcrResultado(ocrResultadoId, "Rechazado desde Compras > Nuevo");
    setValidacionAbierta(false);
  }

  async function agregarDuplicadoComoVersion(details: { documentoIdExistente?: number | string; archivoIdActual?: number | string }) {
    const documentoIdExistente = details.documentoIdExistente;
    const archivoIdActual = details.archivoIdActual;

    if (!documentoIdExistente || !archivoIdActual) {
      throw new Error("No se encontró el documento existente o el archivo nuevo para agregar como versión.");
    }

    await agregarArchivoComoVersion(documentoIdExistente, archivoIdActual, {
      tipoVersion: "escaneado",
      observacion: "Archivo duplicado agregado como versión desde Compras > Nuevo",
      marcarComoActual: true,
    });

    setValidacionAbierta(false);

    if (expedienteSeleccionado?.id) {
      router.push(`/compras/${expedienteSeleccionado.id}/editar`);
    }
  }

  return (
    <>
      <main className="space-y-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
            <Link href="/compras">
              <ArrowLeft className="h-4 w-4" />
              Volver a compras
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Iniciar carga documental de compras</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona el documento principal, vincúlalo a un expediente real y valida OCR antes de pasar a adjuntos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedOption.tipo === option.tipo;

            return (
              <button
                key={option.tipo}
                type="button"
                onClick={() => handleSelectTipo(option)}
                className={`rounded-xl text-left transition ${
                  isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40"
                }`}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{option.title}</CardTitle>
                      {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      Principal sugerido: {option.tipoRelacionPrincipal}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Buscar expediente existente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Código, descripción, empresa o cliente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setExpedienteSeleccionado(null);
                    }}
                    placeholder="Buscar 050201, PRODUCCION, BBTI..."
                    className="pl-9"
                    disabled={processingStep !== "idle"}
                  />
                </div>
              </div>

              {isSearching ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando expedientes...
                </div>
              ) : null}

              {resultados.length > 0 ? (
                <div className="overflow-hidden rounded-xl border">
                  {resultados.map((expediente) => (
                    <button
                      key={String(expediente.id)}
                      type="button"
                      onClick={() => handleSelectExpediente(expediente)}
                      className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            #{expediente.id} · {expediente.codigoExpediente}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {expediente.descripcion ?? "Sin descripción"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {expediente.empresaCodigo} · {expediente.clienteNombre ?? expediente.clienteAbreviatura ?? "Cliente no informado"}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{expediente.documentos ?? 0} documentos</p>
                          <p>{expediente.alertas ?? 0} alertas</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim().length >= 2 && !isSearching && !expedienteSeleccionado ? (
                <div className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                  No se encontraron expedientes con ese criterio.
                </div>
              ) : null}

              {expedienteSeleccionado ? (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Expediente seleccionado</p>
                  <p className="mt-1 font-semibold">
                    #{expedienteSeleccionado.id} · {expedienteSeleccionado.codigoExpediente}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {expedienteSeleccionado.descripcion ?? "Sin descripción"}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Empresa:</span> {expedienteSeleccionado.empresaCodigo}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Cliente:</span> {expedienteSeleccionado.clienteNombre ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Documentos:</span> {expedienteSeleccionado.documentos ?? 0}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Alertas:</span> {expedienteSeleccionado.alertas ?? 0}
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/compras">Cancelar</Link>
                </Button>
                <Button
                  type="button"
                  onClick={handleAbrirEditorSinCarga}
                  disabled={isOpeningEditor || !expedienteSeleccionado}
                  variant="outline"
                >
                  {isOpeningEditor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Gestionar expediente
                </Button>
                <Button type="button" onClick={handleAbrirInicioPrincipal} disabled={!expedienteSeleccionado}>
                  <UploadCloud className="h-4 w-4" />
                  Continuar con carga
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flujo seleccionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Documento principal</p>
                <p className="font-medium">{selectedOption.title}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Relación principal</p>
                <p className="font-mono text-xs">{selectedOption.tipoRelacionPrincipal}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Siguiente paso</p>
                <p className="text-muted-foreground">
                  Carga el PDF principal aquí. Al confirmar OCR, se validará como candidato a principal. Si ya existe un principal activo, el backend bloqueará el reemplazo silencioso.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              No encuentro el expediente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crear expediente nuevo es una opción secundaria. Antes de crear, busca por código, descripción y empresa.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateNew((value) => !value)}
            >
              {showCreateNew ? "Ocultar creación manual" : "Crear expediente nuevo"}
            </Button>

            {showCreateNew ? (
              <form onSubmit={handleCreateSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase text-muted-foreground">
                        Empresa / cliente
                      </label>
                      <Select value={clienteKey} onValueChange={setClienteKey}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENTES.map((cliente) => (
                            <SelectItem key={cliente.empresaCodigo} value={cliente.empresaCodigo}>
                              {cliente.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase text-muted-foreground">
                        Código expediente
                      </label>
                      <Input
                        value={codigoExpediente}
                        onChange={(event) => setCodigoExpediente(event.target.value)}
                        placeholder={selectedOption.codigoHint}
                        disabled={isSubmitting}
                      />
                      {codigoPrefixWarning ? (
                        <p className="text-xs text-amber-600">{codigoPrefixWarning}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-muted-foreground">
                      Descripción
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(event) => setDescripcion(event.target.value)}
                      placeholder="Ejemplo: PRODUCCION C X DISTRIBUIR"
                      disabled={isSubmitting}
                      rows={4}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Crear y continuar con carga
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </main>

      {inicioModalAbierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Documento principal
                </p>
                <h2 className="mt-1 text-xl font-bold">Iniciar con {selectedOption.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sube el PDF o imagen principal. Luego se abrirá la validación OCR antes de guardar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInicioModalAbierto(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>

            {expedienteSeleccionado ? (
              <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Expediente vinculado</p>
                <p className="mt-1 font-semibold">
                  #{expedienteSeleccionado.id} · {expedienteSeleccionado.codigoExpediente}
                </p>
                <p className="text-muted-foreground">{expedienteSeleccionado.descripcion ?? "Sin descripción"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Empresa: {expedienteSeleccionado.empresaCodigo} · Cliente: {expedienteSeleccionado.clienteNombre ?? expedienteSeleccionado.clienteAbreviatura ?? "—"}
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-dashed p-5 text-center">
              <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-medium">Selecciona el archivo principal</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Se prevalidará antes de subir. No se reemplazará un principal activo sin flujo explícito.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={onArchivoPrincipalSeleccionado}
              />
              <Button className="mt-4" type="button" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-4 w-4" />
                Elegir archivo
              </Button>
            </div>

            {accionError ? (
              <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="whitespace-pre-line">{accionError}</p>
                {prevalidacionExistente ? (
                  <div className="flex flex-wrap gap-2">
                    {prevalidacionExistente.expedienteId ? (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/compras/${prevalidacionExistente.expedienteId}/ver`}>Ver en Compras</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/compras/${prevalidacionExistente.expedienteId}/editar`}>Editar en Compras</Link>
                        </Button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <OcrProcessingDialog
        open={processingStep !== "idle"}
        step={processingStep}
        filename={processingFileName}
        documentLabel={selectedOption.title}
        errorMessage={processingError}
        onClose={() => {
          setProcessingStep("idle");
          setProcessingError(null);
        }}
      />

      <OcrValidationModal
        open={validacionAbierta}
        resultado={resultadoModal}
        fallbackArchivoId={archivoIdModal ?? undefined}
        expedienteContexto={{
          id: expedienteSeleccionado?.id,
          codigo: expedienteSeleccionado?.codigoExpediente,
          descripcion: expedienteSeleccionado?.descripcion,
          empresa: expedienteSeleccionado?.empresaCodigo,
          rucComprador: RUC_COMPRADOR_POR_EMPRESA[expedienteSeleccionado?.empresaCodigo ?? ""],
        }}
        onClose={() => setValidacionAbierta(false)}
        onSave={guardarCambiosOcr}
        onConfirm={confirmarOcrPrincipal}
        onReject={rechazarOcrPrincipal}
        onAgregarComoVersion={agregarDuplicadoComoVersion}
      />
    </>
  );
}
