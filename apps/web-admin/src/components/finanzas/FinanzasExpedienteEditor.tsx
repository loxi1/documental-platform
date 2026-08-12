"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  FilePlus2,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanzasDocumentoPrincipalOperativoCard } from "@/components/finanzas/FinanzasDocumentoPrincipalOperativoCard";
import { FinanzasGrupoFacturaPagoPanel } from "@/components/finanzas/FinanzasGrupoFacturaPagoPanel";
import {
  OcrProcessingDialog,
  type OcrProcessingStep,
} from "@/components/ocr/OcrProcessingDialog";
import {
  OcrValidationModal,
  type OcrValidationFormState,
} from "@/components/ocr/OcrValidationModal";
import { BANCO_OPTIONS, MONEDA_OPTIONS, hasCatalogValue } from "@/constants/catalogos";
import {
  DOCUMENTO_FINANZAS_ADJUNTO_OPTIONS,
  getDocumentoSummary,
  getDocumentoVisualState,
  type DocumentoCargaOption,
} from "@/constants/documentos";
import { useExpediente } from "@/hooks/useExpedientes";
import { api } from "@/services/api";
import { subirDocumentoGuiado } from "@/services/carga-guiada";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  agregarArchivoComoVersion,
  actualizarDocumentoManual,
} from "@/services/documentos";
import { getDocumentoArchivoPreviewUrl } from "@/services/documentos-preview";
import {
  confirmarOcrConExpediente,
  OcrApiError,
  editarOcrResultado,
  procesarArchivoOcr,
  rechazarOcrResultado,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";
import { getOcrResultado } from "@/services/ocr-resultados";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";
import {
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaPersistidoId,
  getGruposFactura,
} from "@/components/documental-v2/workspace-v2-utils";

type DocumentoVinculado = Record<string, any>;

type AccionFinanzas = DocumentoCargaOption & {
  grupo: "adjunto";
};

type UploadYProcesarArgs = {
  accion: AccionFinanzas;
  file: File;
};

type PagoEditForm = {
  numeroOperacion: string;
  fechaPago: string;
  banco: string;
  rucProveedor: string;
  montoTotal: string;
  moneda: string;
  comprobante: string;
  observacion: string;
};


const FINANZAS_TIPOS_DOCUMENTALES_PERMITIDOS = [
  "PAGO_TRANSFERENCIA",
  "PAGO_DETRACCION",
  "TRANSFERENCIA",
  "DETRACCION",
] as const;

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCompare(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMetadataRecordFromResultado(
  resultado: Record<string, unknown> | null | undefined,
) {
  const metadata = resultado?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function getClienteDetectadoEnOcr(
  resultado: Record<string, unknown> | null | undefined,
) {
  const metadata = getMetadataRecordFromResultado(resultado);
  return {
    abreviatura: text(
      resultado?.clienteAbreviatura ??
        resultado?.cliente_abreviatura ??
        metadata.clienteAbreviatura ??
        metadata.cliente_abreviatura,
      "",
    ),
    ruc: text(
      resultado?.clienteRuc ??
        resultado?.cliente_ruc ??
        metadata.clienteRuc ??
        metadata.cliente_ruc,
      "",
    ),
  };
}

function getMensajeMismatchCliente(
  resultado: Record<string, unknown> | null | undefined,
  empresaExpediente: string,
  rucCompradorExpediente: string,
) {
  const detectado = getClienteDetectadoEnOcr(resultado);
  const empresaDetectada = normalizeCompare(detectado.abreviatura);
  const empresaEsperada = normalizeCompare(empresaExpediente);
  const rucDetectado = normalizeCompare(detectado.ruc);
  const rucEsperado = normalizeCompare(rucCompradorExpediente);

  if (
    empresaDetectada &&
    empresaEsperada &&
    empresaDetectada !== empresaEsperada
  ) {
    return `El OCR detectó cliente ${detectado.abreviatura}, pero el expediente seleccionado es ${empresaExpediente}. No confirmes este documento en este expediente.`;
  }

  if (rucDetectado && rucEsperado && rucDetectado !== rucEsperado) {
    return `El OCR detectó RUC comprador ${detectado.ruc}, pero el expediente seleccionado usa ${rucCompradorExpediente}. No confirmes este documento en este expediente.`;
  }

  return null;
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function unwrapDocumentos(payload: unknown): DocumentoVinculado[] {
  if (Array.isArray(payload)) return payload as DocumentoVinculado[];
  if (payload && typeof payload === "object") {
    const obj = payload as any;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.data?.data)) return obj.data.data;
    if (Array.isArray(obj.documentos)) return obj.documentos;
  }
  return [];
}

function getRelacion(doc: DocumentoVinculado) {
  return text(doc.tipo_relacion ?? doc.tipoRelacion ?? doc.relacion, "");
}

function getCreatedTime(doc: DocumentoVinculado) {
  const raw = String(
    doc.creado_en ?? doc.creadoEn ?? doc.createdAt ?? doc.actualizado_en ?? "",
  );
  const time = raw ? new Date(raw.replace(" ", "T")).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function ordenarDocumentosPorFecha(documentos: DocumentoVinculado[] = []) {
  return [...documentos].sort((a, b) => getCreatedTime(b) - getCreatedTime(a));
}

function getDocumentosPorRelacion(documentos: DocumentoVinculado[]) {
  const map = new Map<string, DocumentoVinculado[]>();

  for (const doc of documentos) {
    const relacion = getRelacion(doc);
    if (!relacion) continue;
    const current = map.get(relacion) ?? [];
    current.push(doc);
    map.set(relacion, current);
  }

  for (const [relacion, docs] of map.entries()) {
    map.set(relacion, ordenarDocumentosPorFecha(docs));
  }

  return map;
}

function isPrincipal(doc: DocumentoVinculado) {
  const relacion = getRelacion(doc).toLowerCase();
  return Boolean(
    doc.es_principal === true ||
    doc.esPrincipal === true ||
    String(doc.es_principal).toLowerCase() === "t" ||
    relacion.startsWith("principal_"),
  );
}

function pickPrincipal(documentos: DocumentoVinculado[]) {
  return ordenarDocumentosPorFecha(documentos).find(isPrincipal) ?? null;
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

function getRecordValue(
  source: Record<string, unknown> | null | undefined,
  path: string[],
) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function getTipoRelacionResultado(
  resultado: Record<string, unknown> | null,
  accion: AccionFinanzas | null,
) {
  return text(
    accion?.tipoRelacionSugerida ??
      resultado?.tipoRelacionSugerida ??
      getRecordValue(resultado, ["contextoCarga", "tipoRelacionSugerida"]) ??
      getRecordValue(resultado, [
        "metadata",
        "contextoCarga",
        "tipoRelacionSugerida",
      ]),
    "adjunto_transferencia",
  );
}

function normalizeTipoDocumentalParaBackend(tipoDocumental: string) {
  const tipo = String(tipoDocumental || "")
    .trim()
    .toUpperCase();
  if (tipo === "PAGO_TRANSFERENCIA") return "TRANSFERENCIA";
  if (tipo === "DETRACCION" || tipo === "DETRACCIÓN") return "PAGO_DETRACCION";
  return tipo;
}

function getTipoRelacionPorTipoDocumental(
  tipoDocumental: string,
  fallback: string,
) {
  const tipo = normalizeTipoDocumentalParaBackend(tipoDocumental);
  if (tipo === "TRANSFERENCIA" || tipo === "PAGO_TRANSFERENCIA") {
    return "adjunto_transferencia";
  }
  if (tipo === "PAGO_DETRACCION") return "adjunto_detraccion";
  return fallback || "adjunto_transferencia";
}

function normalizeAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  return normalized || undefined;
}

function emptyToUndefined(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
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
  const tipo = normalizeTipoDocumentalParaBackend(
    String(form.tipoDocumental || ""),
  );
  const codigoExpediente =
    emptyToUndefined(form.codigoExpediente) ??
    emptyToUndefined(context.codigoExpediente);
  const rucComprador =
    emptyToUndefined(form.rucComprador) ??
    emptyToUndefined(context.rucComprador);
  const rucEmisor = emptyToUndefined(form.rucEmisor);
  const rucProveedor = emptyToUndefined(form.rucProveedor) ?? rucEmisor;
  const razonSocial = emptyToUndefined(form.razonSocial);
  const proveedor = emptyToUndefined(form.proveedor) ?? razonSocial;
  const numeroOperacion =
    emptyToUndefined(form.numeroOperacion) ?? emptyToUndefined(form.numero);
  const fechaPago =
    emptyToUndefined(form.fechaPago) ?? emptyToUndefined(form.fechaEmision);
  const banco =
    emptyToUndefined(form.banco) ?? emptyToUndefined(form.cotizacion);
  const esDocumentoPago =
    tipo === "TRANSFERENCIA" || tipo === "PAGO_DETRACCION";
  const comprobante =
    emptyToUndefined(form.comprobante) ??
    emptyToUndefined(form.documentoRelacionado);

  return {
    tipoDocumental: tipo,
    clienteAbreviatura: emptyToUndefined(context.clienteAbreviatura),
    numero: esDocumentoPago
      ? numeroOperacion
      : emptyToUndefined(form.numero),
    numeroOperacion,
    numeroConstancia: tipo === "PAGO_DETRACCION" ? numeroOperacion : undefined,
    serie: emptyToUndefined(form.serie),
    fechaEmision: esDocumentoPago
      ? fechaPago
      : emptyToUndefined(form.fechaEmision),
    fechaPago,
    banco,
    comprobante,
    proveedor,
    razonSocial,
    ruc: rucProveedor ?? rucEmisor,
    rucEmisor,
    rucProveedor,
    rucComprador,
    montoTotal: normalizeAmount(form.montoTotal),
    moneda: emptyToUndefined(form.moneda),
    cotizacion: emptyToUndefined(form.cotizacion),
    codigoExpediente,
    claveDocumental: emptyToUndefined(form.claveDocumental),
    documentoRelacionado:
      comprobante ?? emptyToUndefined(form.documentoRelacionado),
    contextoValidacion: {
      origen: "FINANZAS_EDITAR_MODAL",
      expedienteId: context.expedienteId,
      codigoExpediente,
      tipoRelacionSugerida: context.tipoRelacion,
      confirmadoDesde: "finanzas_editar",
    },
  };
}

function buildResultadoConContexto(
  resultado: ProcesarOcrResultado,
  accion: AccionFinanzas,
  extra: {
    archivoId: string;
    filename: string;
    uploadResponse: Record<string, unknown>;
  },
) {
  const metadataOriginal = resultado.metadata;
  const metadata =
    metadataOriginal &&
    typeof metadataOriginal === "object" &&
    !Array.isArray(metadataOriginal)
      ? metadataOriginal
      : {};

  return {
    ...resultado,
    archivoId: resultado.archivoId ?? extra.archivoId,
    tipoRelacionSugerida: accion.tipoRelacionSugerida,
    contextoCarga: {
      origen: "FINANZAS_EDITAR_UPLOAD",
      grupo: "adjunto",
      accion: accion.label,
      archivoId: extra.archivoId,
      filename: extra.filename,
      tipoEsperado: accion.tipoEsperado,
      tipoRelacionSugerida: accion.tipoRelacionSugerida,
      confiabilidad: accion.confiabilidad,
      upload: extra.uploadResponse,
    },
    metadata: {
      ...metadata,
      contextoCarga: {
        origen: "FINANZAS_EDITAR_UPLOAD",
        grupo: "adjunto",
        accion: accion.label,
        archivoId: extra.archivoId,
        filename: extra.filename,
        tipoEsperado: accion.tipoEsperado,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
        confiabilidad: accion.confiabilidad,
        upload: extra.uploadResponse,
      },
    },
  };
}

function getRucComprador(expediente: any, empresa: string) {
  const rucs: Record<string, string> = {
    BBTEC: "20299922821",
    BBTI: "20565747356",
    CIMA: "20613521004",
    TARMA: "20614307197",
    HUANCA: "20612122416",
    KIMBIRI: "20609856140",
  };

  return text(
    expediente?.rucComprador ??
      expediente?.ruc_comprador ??
      expediente?.clienteDestinoRuc ??
      expediente?.cliente_destino_ruc ??
      expediente?.ruc ??
      rucs[empresa],
    "",
  );
}

function getDocumentoId(doc: DocumentoVinculado) {
  return text(doc.documento_id ?? doc.documentoId ?? doc.id, "");
}

function getTipoDocumentalDoc(doc: DocumentoVinculado) {
  return normalizeTipoDocumentalParaBackend(
    text(doc.tipo_documental ?? doc.tipoDocumental, ""),
  );
}


function getDocOcrMetadata(doc: DocumentoVinculado) {
  const metadata = doc.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return {};
  const root = metadata as Record<string, any>;
  const ocr = root.ocr && typeof root.ocr === "object" ? root.ocr : {};
  const ocrMetadata =
    ocr.metadata && typeof ocr.metadata === "object" ? ocr.metadata : {};
  return { ...root, ...ocrMetadata } as Record<string, any>;
}

function getPagoEditForm(doc: DocumentoVinculado): PagoEditForm {
  const metadata = getDocOcrMetadata(doc);
  return {
    numeroOperacion: text(
      metadata.numeroOperacion ?? metadata.numeroConstancia ?? doc.numero,
      "",
    ),
    fechaPago: text(
      metadata.fechaPago ?? metadata.fechaEmision ?? doc.fecha_emision,
      "",
    ),
    banco: text(metadata.banco, ""),
    rucProveedor: text(
      metadata.rucProveedor ?? metadata.ruc_proveedor ?? metadata.proveedorRuc ?? metadata.proveedor_ruc ?? doc.ruc_emisor,
      "",
    ),
    montoTotal: text(metadata.montoTotal ?? doc.monto_total, ""),
    moneda: text(metadata.moneda ?? doc.moneda, ""),
    comprobante: text(
      metadata.comprobante ?? metadata.documentoRelacionado,
      "",
    ),
    observacion: "",
  };
}

function getPagoResumen(doc: DocumentoVinculado) {
  const metadata = getDocOcrMetadata(doc);
  const tipo = getTipoDocumentalDoc(doc);
  return {
    id: getDocumentoId(doc),
    archivoId: getArchivoId(doc as Record<string, unknown>),
    tipo,
    label: tipo === "PAGO_DETRACCION" ? "Detracción" : "Transferencia",
    numero: text(
      metadata.numeroOperacion ?? metadata.numeroConstancia ?? doc.numero,
      "Sin operación",
    ),
    fecha: text(
      metadata.fechaPago ?? metadata.fechaEmision ?? doc.fecha_emision,
      "Sin fecha",
    ),
    banco: text(metadata.banco, ""),
    proveedor: text(
      metadata.proveedor ?? metadata.proveedorNombre ?? doc.razon_social_emisor,
      "",
    ),
    monto: text(metadata.montoTotal ?? doc.monto_total, ""),
    moneda: text(metadata.moneda ?? doc.moneda, ""),
    archivo: text(doc.nombre_archivo ?? doc.nombreArchivo, ""),
  };
}

function DocumentoResumen({
  doc,
  option,
  onVer,
  onEditar,
  onQuitar,
  loadingPreviewId,
}: {
  doc?: DocumentoVinculado | null;
  option?: DocumentoCargaOption;
  onVer?: (doc: DocumentoVinculado) => void;
  onEditar?: (doc: DocumentoVinculado) => void;
  onQuitar?: (doc: DocumentoVinculado) => void;
  loadingPreviewId?: string | null;
}) {
  if (!doc) {
    const visual = getDocumentoVisualState(null);
    return (
      <div
        className={`mt-3 rounded-lg border border-dashed px-3 py-2 text-xs ${visual.className}`}
      >
        <div className="font-medium text-muted-foreground">
          Pendiente de carga
        </div>
      </div>
    );
  }

  const visual = getDocumentoVisualState(doc);
  const summary = getDocumentoSummary(doc, option);
  const archivoId = getArchivoId(doc as Record<string, unknown>);

  return (
    <div
      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${visual.className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">
            {summary.title}
          </div>
          <div className="mt-1 truncate text-muted-foreground">
            {summary.providerLine}
          </div>
          {summary.details ? (
            <div className="mt-1 text-muted-foreground">{summary.details}</div>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${visual.badgeClassName}`}
        >
          {visual.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap justify-end gap-1 border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Ver"
          aria-label="Ver documento"
          onClick={() => onVer?.(doc)}
          disabled={!archivoId || loadingPreviewId === archivoId}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Editar"
          aria-label="Editar documento"
          onClick={() => onEditar?.(doc)}
          disabled={!archivoId}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Quitar del expediente"
          aria-label="Quitar documento del expediente"
          onClick={() => onQuitar?.(doc)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DocumentosExistentes({
  documentos,
  option,
  onVer,
  onEditar,
  onQuitar,
  loadingPreviewId,
}: {
  documentos?: DocumentoVinculado[];
  option: DocumentoCargaOption;
  onVer?: (doc: DocumentoVinculado) => void;
  onEditar?: (doc: DocumentoVinculado) => void;
  onQuitar?: (doc: DocumentoVinculado) => void;
  loadingPreviewId?: string | null;
}) {
  const ordenados = ordenarDocumentosPorFecha(documentos ?? []);

  if (!ordenados.length) return <DocumentoResumen option={option} />;

  return (
    <div className="mt-3 space-y-2">
      {ordenados.map((doc, index) => (
        <DocumentoResumen
          key={String(doc.documento_id ?? doc.documentoId ?? index)}
          doc={doc}
          option={option}
          onVer={onVer}
          onEditar={onEditar}
          onQuitar={onQuitar}
          loadingPreviewId={loadingPreviewId}
        />
      ))}
    </div>
  );
}

export function FinanzasExpedienteEditor({ id }: { id: string | number }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { data: expediente, isLoading, error } = useExpediente(id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const decisionHumanaRef = useRef<HTMLDivElement | null>(null);
  const expedienteContextoOcrRef = useRef<{
    id: string | number;
    codigo: string;
    descripcion: string;
    empresa: string;
    rucComprador: string;
  }>({
    id,
    codigo: "",
    descripcion: "",
    empresa: "",
    rucComprador: "",
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultadoModal, setResultadoModal] =
    useState<ProcesarOcrResultado | null>(null);
  const [accionActual, setAccionActual] = useState<AccionFinanzas | null>(null);
  const [decisionCorrespondencia, setDecisionCorrespondencia] = useState<{
    accion: "ACEPTAR" | "OBSERVAR";
    motivo: string;
  } | null>(null);
  const [decisionCorrespondenciaRequerida, setDecisionCorrespondenciaRequerida] =
    useState(false);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(
    null,
  );
  const [processingStep, setProcessingStep] =
    useState<OcrProcessingStep>("idle");
  const [processingFileName, setProcessingFileName] = useState<string | null>(
    null,
  );
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [pagoModalDoc, setPagoModalDoc] = useState<DocumentoVinculado | null>(
    null,
  );
  const [pagoModalMode, setPagoModalMode] = useState<"ver" | "editar" | null>(
    null,
  );
  const [pagoModalUrl, setPagoModalUrl] = useState<string | null>(null);
  const [pagoModalError, setPagoModalError] = useState<string | null>(null);
  const [pagoEditForm, setPagoEditForm] = useState<PagoEditForm>({
    numeroOperacion: "",
    fechaPago: "",
    banco: "",
    rucProveedor: "",
    montoTotal: "",
    moneda: "",
    comprobante: "",
    observacion: "",
  });

  useEffect(() => {
    if (!decisionCorrespondenciaRequerida) return;

    const frame = window.requestAnimationFrame(() => {
      const node = decisionHumanaRef.current;
      if (!node) return;

      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      node.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [decisionCorrespondenciaRequerida]);

  const grupoFacturaId = positiveInteger(searchParams.get("grupoFacturaId"));
  const ocrResultadoIdRecuperar = positiveInteger(
    searchParams.get("ocrResultadoId"),
  );

  const workspaceQuery = useQuery({
    queryKey: ["finanzas-editor-workspace-v2", String(id)],
    enabled: Boolean(id),
    queryFn: () => getWorkspaceDocumentalV2(id),
  });

  const gruposFactura = useMemo(
    () => (workspaceQuery.data ? getGruposFactura(workspaceQuery.data) : []),
    [workspaceQuery.data],
  );

  const grupoFacturaSeleccionado = useMemo(
    () =>
      grupoFacturaId === null
        ? null
        : gruposFactura.find(
            (grupo) =>
              positiveInteger(getGrupoFacturaPersistidoId(grupo)) ===
              grupoFacturaId,
          ) ?? null,
    [grupoFacturaId, gruposFactura],
  );

  const documentoBaseId = positiveInteger(
    grupoFacturaSeleccionado
      ? getGrupoDocumentoPrincipalDocumentoId(grupoFacturaSeleccionado)
      : null,
  );

  function requireContextoV2() {
    if (grupoFacturaId === null) {
      throw new Error(
        "Falta grupoFacturaId. Vuelva a abrir Finanzas desde el Grupo de Factura correspondiente.",
      );
    }

    if (workspaceQuery.isLoading) {
      throw new Error("El Grupo de Factura todavía se está validando.");
    }

    if (workspaceQuery.isError || !grupoFacturaSeleccionado) {
      throw new Error(
        "No se pudo resolver el Grupo de Factura seleccionado en este expediente.",
      );
    }

    if (documentoBaseId === null) {
      throw new Error(
        "No se pudo resolver el documento principal del Grupo de Factura.",
      );
    }

    return { grupoFacturaId, documentoBaseId };
  }

  const ocrRecuperacionQuery = useQuery({
    queryKey: ["finanzas-recuperar-ocr", ocrResultadoIdRecuperar],
    enabled: ocrResultadoIdRecuperar !== null,
    queryFn: () => getOcrResultado(ocrResultadoIdRecuperar!),
  });

  const ocrRecuperadoRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      ocrResultadoIdRecuperar === null ||
      !ocrRecuperacionQuery.data ||
      ocrRecuperadoRef.current === ocrResultadoIdRecuperar
    ) {
      return;
    }

    const ocr = ocrRecuperacionQuery.data as unknown as Record<
      string,
      unknown
    >;

    const metadataPersistida =
      ocr.metadata &&
      typeof ocr.metadata === "object" &&
      !Array.isArray(ocr.metadata)
        ? (ocr.metadata as Record<string, unknown>)
        : {};

    const resultadoProcesamiento = {
      ...metadataPersistida,
      ocrResultadoId: ocr.id ?? ocrResultadoIdRecuperar,
      archivoId: ocr.archivo_id ?? ocr.archivoId,
      documentoId: ocr.documento_id ?? ocr.documentoId,
      tipoDocumental:
        metadataPersistida.tipoDocumental ??
        ocr.tipo_propuesto ??
        ocr.tipoPropuesto,
      claveDocumental:
        metadataPersistida.claveDocumental ??
        ocr.clave_documental ??
        ocr.claveDocumental,
    } as unknown as ProcesarOcrResultado;

    const tipoRecuperado = normalizeTipoDocumentalParaBackend(
      String(
        ocr.tipo_propuesto ??
          ocr.tipoPropuesto ??
          resultadoProcesamiento.tipoDocumental ??
          "",
      ),
    );

    const option = DOCUMENTO_FINANZAS_ADJUNTO_OPTIONS.find(
      (candidate) =>
        normalizeTipoDocumentalParaBackend(
          String(candidate.tipoEsperado ?? ""),
        ) === tipoRecuperado,
    );

    if (!option) {
      setMensajeValidacion(
        `No se pudo resolver la acción de Finanzas para el OCR ${ocrResultadoIdRecuperar}.`,
      );
      return;
    }

    const accion = { ...option, grupo: "adjunto" as const };

    setAccionActual(accion);
    setResultadoModal(
      buildResultadoConContexto(resultadoProcesamiento, accion, {
        archivoId: String(
          ocr.archivo_id ?? ocr.archivoId ?? resultadoProcesamiento.archivoId,
        ),
        filename: String(
          ocr.nombre_archivo ??
            ocr.nombreArchivo ??
            getRecordValue(metadataPersistida, ["archivo", "filename"]) ??
            "documento.pdf",
        ),
        uploadResponse: {},
      }),
    );

    setMensajeValidacion(
      `OCR ${ocrResultadoIdRecuperar} recuperado para continuar su validación en Finanzas.`,
    );
    setModalAbierto(true);
    ocrRecuperadoRef.current = ocrResultadoIdRecuperar;
  }, [
    ocrResultadoIdRecuperar,
    ocrRecuperacionQuery.data,
  ]);

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", String(id)],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get(`/expedientes/${id}/documentos`);
      return unwrapDocumentos(data);
    },
  });

  const documentos = documentosQuery.data ?? [];
  const documentosPorRelacion = useMemo(
    () => getDocumentosPorRelacion(documentos),
    [documentos],
  );
  const principal = useMemo(() => pickPrincipal(documentos), [documentos]);
  const actualizarPagoMutation = useMutation({
    mutationFn: async ({
      doc,
      form,
    }: {
      doc: DocumentoVinculado;
      form: PagoEditForm;
    }) => {
      const documentoId = getDocumentoId(doc);
      if (!documentoId) throw new Error("No se encontró documentoId del pago.");

      const tipoDocumental = normalizeTipoDocumentalParaBackend(
        getTipoDocumentalDoc(doc) || "TRANSFERENCIA",
      );
      const metadata = {
        tipoDocumental,
        clienteAbreviatura: empresa,
        numero: form.numeroOperacion,
        numeroOperacion: form.numeroOperacion,
        numeroConstancia:
          tipoDocumental === "PAGO_DETRACCION"
            ? form.numeroOperacion
            : undefined,
        fechaEmision: form.fechaPago,
        fechaPago: form.fechaPago,
        banco: form.banco,
        rucProveedor: form.rucProveedor,
        proveedorRuc: form.rucProveedor,
        montoTotal: normalizeAmount(form.montoTotal),
        moneda: form.moneda,
        comprobante: form.comprobante,
        documentoRelacionado: form.comprobante,
        rucComprador,
        codigoExpediente: codigo,
        contextoValidacion: {
          origen: "FINANZAS_EDITAR_DOCUMENTO",
          expedienteId: id,
          codigoExpediente: codigo,
          tipoRelacionSugerida: getRelacion(doc),
          confirmadoDesde: "finanzas_editar_documento",
        },
      };

      return actualizarDocumentoManual(documentoId, {
        tipoDocumental,
        metadata,
        observacion: form.observacion || "Edición de pago desde Finanzas",
      });
    },
    onSuccess: () => {
      cerrarPagoModal();
      setMensajeValidacion("Pago actualizado correctamente.");
      queryClient.invalidateQueries({
        queryKey: ["expediente-documentos", String(id)],
      });
    },
    onError: (err: Error) => {
      setMensajeValidacion(`No se pudo actualizar el pago. ${err.message}`);
    },
  });

  const cargaRealMutation = useMutation<
    ProcesarOcrResultado,
    Error,
    UploadYProcesarArgs
  >({
    mutationFn: async ({ accion, file }) => {
      const contextoV2 = requireContextoV2();

      setProcessingFileName(file.name);
      setProcessingError(null);
      setProcessingStep("uploading");

      const clienteAbreviatura = text(
        (expediente as any)?.empresa_codigo ??
          (expediente as any)?.empresaCodigo ??
          (expediente as any)?.cliente_abreviatura ??
          (expediente as any)?.clienteAbreviatura,
        "",
      );

      if (!clienteAbreviatura) {
        throw new Error(
          "No se pudo resolver clienteAbreviatura del expediente.",
        );
      }

      const uploadPayload: CargaGuiadaPayloadPreview = {
        areaOrigen: "FINANZAS",
        clienteAbreviatura,
        tipoEsperado:
          accion.tipoEsperado as CargaGuiadaPayloadPreview["tipoEsperado"],
        expedienteId: id,
        documentoBaseId: contextoV2.documentoBaseId,
        grupoFacturaId: contextoV2.grupoFacturaId,
        tipoRelacionSugerida:
          accion.tipoRelacionSugerida as CargaGuiadaPayloadPreview["tipoRelacionSugerida"],
        canalIngreso: "FINANZAS_EDITAR_UPLOAD",
        observacion: `Carga desde Finanzas: ${accion.label}`,
      };

      const uploadResponse = await subirDocumentoGuiado(uploadPayload, file);
      const archivoId = getArchivoId(uploadResponse as Record<string, unknown>);

      if (!archivoId) {
        throw new Error("El upload no devolvió archivoId.");
      }

      setProcessingStep("processing_ocr");

      const resultado = await procesarArchivoOcr(archivoId, {
        tipoEsperado: accion.tipoEsperado,
        areaOrigen: "FINANZAS",
        clienteAbreviatura,
        expedienteId: id,
        documentoBaseId: contextoV2.documentoBaseId,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
        canalIngreso: "FINANZAS_EDITAR_UPLOAD",
        reprocesar: true,
      });

      setProcessingStep("preparing_preview");

      return buildResultadoConContexto(resultado, accion, {
        archivoId,
        filename: file.name,
        uploadResponse: uploadResponse as Record<string, unknown>,
      });
    },
    onSuccess: (resultado, { accion }) => {
      const empresaActual = text(
        (expediente as any)?.empresa_codigo ??
          (expediente as any)?.empresaCodigo,
        "",
      );
      const rucCompradorActual = getRucComprador(expediente, empresaActual);
      const mismatch = getMensajeMismatchCliente(
        resultado as Record<string, unknown>,
        empresaActual,
        rucCompradorActual,
      );

      setAccionActual(accion);
      setResultadoModal(resultado);
      setMensajeValidacion(mismatch);
      setProcessingStep("ready");
      queryClient.invalidateQueries({
        queryKey: ["expediente-documentos", String(id)],
      });

      window.setTimeout(() => {
        setProcessingStep("idle");
        setModalAbierto(true);
      }, 450);
    },
    onError: (err, { accion }) => {
      const message = `No se pudo cargar/procesar OCR para ${accion.label}. ${err.message}`;
      setAccionActual(accion);
      setProcessingStep("error");
      setProcessingError(message);
      setMensajeValidacion(message);
    },
  });

  function iniciarSeleccionArchivo(option: DocumentoCargaOption) {
    setAccionActual({ ...option, grupo: "adjunto" });
    setMensajeValidacion(null);
    fileInputRef.current?.click();
  }

  function iniciarAdjuntarTransferencia(grupoSolicitado: string | number) {
    const contextoV2 = requireContextoV2();
    const grupoSolicitadoId = positiveInteger(grupoSolicitado);

    if (grupoSolicitadoId !== contextoV2.grupoFacturaId) {
      throw new Error(
        "La Factura seleccionada no coincide con el contexto documental abierto.",
      );
    }

    const transferencia = DOCUMENTO_FINANZAS_ADJUNTO_OPTIONS.find(
      (item) =>
        String(item.tipoEsperado).toUpperCase() === "TRANSFERENCIA" ||
        String(item.tipoRelacionSugerida).toLowerCase() === "adjunto_transferencia",
    );

    if (!transferencia) {
      throw new Error(
        "No se encontró la opción TRANSFERENCIA configurada para Finanzas.",
      );
    }

    iniciarSeleccionArchivo(transferencia);
  }

  function onArchivoSeleccionado(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !accionActual) return;
    cargaRealMutation.mutate({ accion: accionActual, file });
  }

  if (isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (error || !expediente) {
    return (
      <main className="p-6 text-red-600">No se pudo cargar el expediente.</main>
    );
  }

  const codigo = text(
    (expediente as any).codigo_expediente ??
      (expediente as any).codigoExpediente,
    "",
  );
  const empresa = text(
    (expediente as any).empresa_codigo ?? (expediente as any).empresaCodigo,
    "",
  );
  const descripcion = text((expediente as any).descripcion, "");
  const rucComprador = getRucComprador(expediente, empresa);

  expedienteContextoOcrRef.current.id = id;
  expedienteContextoOcrRef.current.codigo = codigo;
  expedienteContextoOcrRef.current.descripcion = descripcion;
  expedienteContextoOcrRef.current.empresa = empresa;
  expedienteContextoOcrRef.current.rucComprador = rucComprador;

  const procesando = cargaRealMutation.isPending;
  const archivoIdModal =
    getArchivoId(resultadoModal as Record<string, unknown> | null) ?? undefined;

  async function persistirEdicionOcr(
    form: OcrValidationFormState,
    observacion: string,
  ) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error(
        "No se encontró ocrResultadoId para guardar la validación.",
      );
    }

    const tipoRelacion = getTipoRelacionResultado(
      resultadoActual,
      accionActual,
    );
    const metadata = buildMetadataDesdeFormulario(form, {
      codigoExpediente: codigo,
      rucComprador,
      clienteAbreviatura: empresa,
      expedienteId: id,
      tipoRelacion,
    });

    await editarOcrResultado(ocrResultadoId, {
      tipoPropuesto: normalizeTipoDocumentalParaBackend(
        String(form.tipoDocumental || accionActual?.tipoEsperado || ""),
      ),
      metadata,
      observacion,
    });

    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({
      queryKey: ["expediente-documentos", String(id)],
    });

    return { ocrResultadoId, tipoRelacion, metadata };
  }

  async function guardarCambiosOcr(form: OcrValidationFormState) {
    await persistirEdicionOcr(form, "Edición manual desde Finanzas > Adjuntar");
    setMensajeValidacion(
      `Cambios OCR guardados para ${accionActual?.label ?? "documento"}.`,
    );
  }

  function preservarFormularioCorregidoParaDecision(
    metadataCorregida: Record<string, unknown>,
  ) {
    setResultadoModal((current) => {
      if (!current) return current;

      const raw = current as unknown as Record<string, unknown>;
      const metadataActual =
        raw.metadata &&
        typeof raw.metadata === "object" &&
        !Array.isArray(raw.metadata)
          ? (raw.metadata as Record<string, unknown>)
          : {};

      return {
        ...raw,
        ...metadataCorregida,
        metadata: {
          ...metadataActual,
          ...metadataCorregida,
        },
      } as unknown as ProcesarOcrResultado;
    });
  }

  async function confirmarOcrFinal(form: OcrValidationFormState) {
    const contextoV2 = requireContextoV2();
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error(
        "No se encontró ocrResultadoId para confirmar la validación.",
      );
    }

    const mismatch = getMensajeMismatchCliente(
      resultadoActual,
      empresa,
      rucComprador,
    );
    if (mismatch) {
      setMensajeValidacion(mismatch);
      throw new Error(mismatch);
    }

    const tipoRelacionBase = getTipoRelacionResultado(
      resultadoActual,
      accionActual,
    );
    const tipoRelacionFinal = getTipoRelacionPorTipoDocumental(
      normalizeTipoDocumentalParaBackend(
        String(form.tipoDocumental || accionActual?.tipoEsperado || ""),
      ),
      tipoRelacionBase,
    );

    const metadata = buildMetadataDesdeFormulario(
      {
        ...form,
        codigoExpediente: text(form.codigoExpediente, codigo),
        rucComprador: text(form.rucComprador, rucComprador),
      },
      {
        codigoExpediente: text(form.codigoExpediente, codigo),
        rucComprador,
        clienteAbreviatura: empresa,
        expedienteId: id,
        tipoRelacion: tipoRelacionFinal,
      },
    );

    try {
      await confirmarOcrConExpediente(ocrResultadoId, {
        expedienteId: id,
        documentoBaseId: contextoV2.documentoBaseId,
        grupoFacturaId: contextoV2.grupoFacturaId,
        tipoRelacion: tipoRelacionFinal,
        esPrincipal: false,
        orden: 20,
        metadata,
        observacion: "Guardar y confirmar pago desde Finanzas",
        ...(decisionCorrespondencia
          ? {
              decisionCorrespondencia: {
                accion: decisionCorrespondencia.accion,
                motivo: decisionCorrespondencia.motivo.trim(),
              },
            }
          : {}),
      });
    } catch (error) {
      if (
        error instanceof OcrApiError &&
        error.code === "DECISION_CORRESPONDENCIA_REQUERIDA"
      ) {
        preservarFormularioCorregidoParaDecision(
          metadata as Record<string, unknown>,
        );
        setDecisionCorrespondenciaRequerida(true);
        setMensajeValidacion(
          "La transferencia requiere una decisión humana de correspondencia antes de asociarse al grupo.",
        );
        setModalAbierto(false);
        return;
      }
      throw error;
    }

    setDecisionCorrespondenciaRequerida(false);
    setDecisionCorrespondencia(null);
    setModalAbierto(false);
    setMensajeValidacion(
      `Documento confirmado y vinculado al expediente ${codigo || id}.`,
    );
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({
      queryKey: ["expediente-documentos", String(id)],
    });
  }

  async function agregarDuplicadoComoVersion(details: {
    documentoIdExistente?: number | string;
    archivoIdActual?: number | string;
  }) {
    const documentoIdExistente = details.documentoIdExistente;
    const archivoIdActual = details.archivoIdActual;

    if (!documentoIdExistente || !archivoIdActual) {
      throw new Error(
        "No se encontró el documento existente o el archivo nuevo para agregar como versión.",
      );
    }

    await agregarArchivoComoVersion(documentoIdExistente, archivoIdActual, {
      tipoVersion: "escaneado",
      observacion: "Pago agregado como nueva versión desde Finanzas",
      marcarComoActual: true,
    });

    setModalAbierto(false);
    setMensajeValidacion(
      `Archivo agregado como nueva versión del documento ${documentoIdExistente}.`,
    );
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({
      queryKey: ["expediente-documentos", String(id)],
    });
  }

  async function rechazarOcrFinal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para rechazar el OCR.");
    }

    await rechazarOcrResultado(
      ocrResultadoId,
      `Rechazado desde Finanzas. Tipo: ${form.tipoDocumental}. Documento: ${form.serie ? `${form.serie}-` : ""}${form.numero || "sin número"}`,
    );

    setModalAbierto(false);
    setMensajeValidacion(
      `OCR rechazado para ${accionActual?.label ?? "documento"}.`,
    );
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({
      queryKey: ["expediente-documentos", String(id)],
    });
  }

  async function abrirPagoModal(
    doc: DocumentoVinculado,
    mode: "ver" | "editar",
  ) {
    const archivoId = getArchivoId(doc as Record<string, unknown>);
    if (!archivoId) {
      setMensajeValidacion(
        "Este documento no tiene archivo asociado para visualizar.",
      );
      return;
    }

    setPagoModalDoc(doc);
    setPagoModalMode(mode);
    setPagoModalUrl(null);
    setPagoModalError(null);

    if (mode === "editar") {
      setPagoEditForm(getPagoEditForm(doc));
    }

    try {
      setPreviewLoadingId(archivoId);
      const preview = await getDocumentoArchivoPreviewUrl(archivoId);
      setPagoModalUrl(preview.signedUrl);
    } catch (err) {
      setPagoModalError(
        `No se pudo abrir el documento. ${(err as Error).message}`,
      );
    } finally {
      setPreviewLoadingId(null);
    }
  }

  function cerrarPagoModal() {
    setPagoModalDoc(null);
    setPagoModalMode(null);
    setPagoModalUrl(null);
    setPagoModalError(null);
  }

  function quitarPagoDelExpediente(doc: DocumentoVinculado) {
    const resumen = getPagoResumen(doc);
    setMensajeValidacion(
      `Quitar del expediente todavía está pendiente de backend. Documento: ${resumen.label} ${resumen.numero}.`,
    );
  }

  function setPagoField<K extends keyof PagoEditForm>(
    field: K,
    value: PagoEditForm[K],
  ) {
    setPagoEditForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={onArchivoSeleccionado}
      />

      <main className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-1 px-0">
              <Link href="/finanzas">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Finanzas</h1>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                {codigo || "SIN EXPEDIENTE"}
              </span>
              {empresa ? (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {empresa}
                </span>
              ) : null}
              {descripcion ? (
                <p className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {descripcion}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {decisionCorrespondenciaRequerida ? (
          <div
            ref={decisionHumanaRef}
            tabIndex={-1}
            className="mb-4 rounded-xl border p-4"
          >
            <p className="font-medium">
              Revise la factura y el sustento de pago antes de confirmar.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              La validación automática necesita su revisión para completar esta operación.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={
                  decisionCorrespondencia?.accion === "ACEPTAR"
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  setDecisionCorrespondencia((current) => ({
                    accion: "ACEPTAR",
                    motivo: current?.motivo ?? "",
                  }));
                  setModalAbierto(true);
                }}
              >
                Validar pago
              </Button>

              <Button
                type="button"
                variant={
                  decisionCorrespondencia?.accion === "OBSERVAR"
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  setDecisionCorrespondencia((current) => ({
                    accion: "OBSERVAR",
                    motivo: current?.motivo ?? "",
                  }));
                  setModalAbierto(true);
                }}
              >
                Observar
              </Button>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Comentario</label>
              <Input
                className="mt-1"
                value={decisionCorrespondencia?.motivo ?? ""}
                onChange={(e) =>
                  setDecisionCorrespondencia((current) => ({
                    accion: current?.accion ?? "ACEPTAR",
                    motivo: e.target.value,
                  }))
                }
                placeholder="Agrega un comentario si es necesario"
              />
            </div>
          </div>
        ) : null}

        {mensajeValidacion ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {mensajeValidacion}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <FinanzasDocumentoPrincipalOperativoCard id={id} />

          <Card className="hidden">
            <CardContent className="grid gap-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Empresa
                  </label>
                  <Input value={empresa} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Expediente
                  </label>
                  <Input value={codigo || "SIN EXPEDIENTE"} readOnly />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Descripción
                </label>
                <Input value={descripcion} readOnly />
              </div>
            </CardContent>
          </Card>
        </section>

        <FinanzasGrupoFacturaPagoPanel
          id={id}
          editable
          onAdjuntarTransferencia={iniciarAdjuntarTransferencia}
        />

        <Card className="hidden border-dashed bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle>Carga legacy de Finanzas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Uso operativo auxiliar / diagnóstico. La asociación documental definitiva se realiza desde el grupo documental persistido superior mediante “Agregar pago”. No reemplaza el flujo V2.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Flujo legacy auxiliar. Para documentos de pago vigentes usa el grupo persistido de arriba y la acción “Agregar pago”.
            </div>
            <div className="grid gap-3 md:grid-cols-3">
            {DOCUMENTO_FINANZAS_ADJUNTO_OPTIONS.map((item) => {
              const documentosItem = documentosPorRelacion.get(
                item.tipoRelacionSugerida,
              );
              return (
                <div
                  key={item.tipoRelacionSugerida}
                  className="rounded-xl border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{item.label}</div>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.tipoEsperado}
                    </span>
                  </div>

                  <DocumentosExistentes
                    documentos={documentosItem}
                    option={item}
                    onVer={(doc) => abrirPagoModal(doc, "ver")}
                    onEditar={(doc) => abrirPagoModal(doc, "editar")}
                    onQuitar={quitarPagoDelExpediente}
                    loadingPreviewId={previewLoadingId}
                  />

                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    size="sm"
                    disabled={procesando || !principal}
                    onClick={() => iniciarSeleccionArchivo(item)}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {procesando &&
                    accionActual?.tipoRelacionSugerida ===
                      item.tipoRelacionSugerida
                      ? "Subiendo/procesando..."
                      : documentosItem?.length
                        ? "Adjuntar otro legacy"
                        : "Adjuntar legacy"}
                  </Button>
                </div>
              );
            })}
            </div>
          </CardContent>
        </Card>
      </main>

      {pagoModalDoc && pagoModalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[88vh] w-full max-w-[min(1500px,96vw)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold">
                    {pagoModalMode === "editar" ? "Editar pago" : "Ver pago"}
                  </h2>
                  <Badge variant="secondary">
                    {getPagoResumen(pagoModalDoc).label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getPagoResumen(pagoModalDoc).numero}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {getPagoResumen(pagoModalDoc).proveedor || "Sin beneficiario"}{" "}
                  · {getPagoResumen(pagoModalDoc).moneda}{" "}
                  {getPagoResumen(pagoModalDoc).monto || "—"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cerrarPagoModal}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>

            {pagoModalMode === "ver" ? (
              <div className="min-h-0 flex-1 p-4">
                {pagoModalError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {pagoModalError}
                  </div>
                ) : pagoModalUrl ? (
                  <iframe
                    title="Documento de pago"
                    src={pagoModalUrl}
                    className="h-full w-full rounded-xl border bg-muted"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
                    Cargando documento...
                  </div>
                )}
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-3">
                <div className="min-h-0 lg:col-span-2">
                  {pagoModalError ? (
                    <div className="h-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {pagoModalError}
                    </div>
                  ) : pagoModalUrl ? (
                    <iframe
                      title="Documento de pago"
                      src={pagoModalUrl}
                      className="h-full w-full rounded-xl border bg-muted"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
                      Cargando documento...
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-col rounded-xl border bg-muted/20 p-4">
                  <div className="shrink-0">
                    <h3 className="font-semibold">Datos del pago</h3>
                    <p className="text-xs text-muted-foreground">
                      Corrige la metadata sin salir de la pantalla.
                    </p>
                  </div>

                  <div className="mt-3 grid shrink-0 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        Operación / constancia
                      </label>
                      <Input
                        className="h-8"
                        value={pagoEditForm.numeroOperacion}
                        onChange={(e) =>
                          setPagoField("numeroOperacion", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase text-muted-foreground">
                          Fecha pago
                        </label>
                        <Input
                          className="h-8"
                          type="date"
                          value={pagoEditForm.fechaPago}
                          onChange={(e) =>
                            setPagoField("fechaPago", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase text-muted-foreground">
                          Moneda
                        </label>
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={pagoEditForm.moneda}
                          onChange={(e) =>
                            setPagoField("moneda", e.target.value)
                          }
                        >
                          <option value="">Seleccionar moneda</option>
                          {pagoEditForm.moneda && !hasCatalogValue(MONEDA_OPTIONS, pagoEditForm.moneda) ? (
                            <option value={pagoEditForm.moneda}>{pagoEditForm.moneda}</option>
                          ) : null}
                          {MONEDA_OPTIONS.map((moneda) => (
                            <option key={moneda.codigo} value={moneda.nombre}>
                              {moneda.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        Banco
                      </label>
                      <select
                        className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={pagoEditForm.banco}
                        onChange={(e) => setPagoField("banco", e.target.value)}
                      >
                        <option value="">Selecciona banco</option>
                        {pagoEditForm.banco && !hasCatalogValue(BANCO_OPTIONS, pagoEditForm.banco) ? (
                          <option value={pagoEditForm.banco}>{pagoEditForm.banco}</option>
                        ) : null}
                        {BANCO_OPTIONS.map((banco) => (
                          <option key={banco.codigo} value={banco.nombre}>
                            {banco.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        RUC proveedor
                      </label>
                      <Input
                        className="h-8"
                        value={pagoEditForm.rucProveedor}
                        onChange={(e) =>
                          setPagoField("rucProveedor", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        Monto total
                      </label>
                      <Input
                        className="h-8"
                        value={pagoEditForm.montoTotal}
                        onChange={(e) =>
                          setPagoField("montoTotal", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        Factura / documento relacionado
                      </label>
                      <Input
                        className="h-8"
                        value={pagoEditForm.comprobante}
                        onChange={(e) =>
                          setPagoField("comprobante", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase text-muted-foreground">
                        Observación
                      </label>
                      <Input
                        className="h-8"
                        value={pagoEditForm.observacion}
                        onChange={(e) =>
                          setPagoField("observacion", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex shrink-0 justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cerrarPagoModal}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={actualizarPagoMutation.isPending}
                      onClick={() =>
                        actualizarPagoMutation.mutate({
                          doc: pagoModalDoc,
                          form: pagoEditForm,
                        })
                      }
                    >
                      <Save className="h-4 w-4" />
                      {actualizarPagoMutation.isPending
                        ? "Guardando..."
                        : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <OcrProcessingDialog
        open={processingStep !== "idle"}
        step={processingStep}
        filename={processingFileName}
        documentLabel={accionActual?.label}
        errorMessage={processingError}
        onClose={() => {
          setProcessingStep("idle");
          setProcessingError(null);
        }}
      />

      <OcrValidationModal
        open={modalAbierto}
        resultado={resultadoModal}
        fallbackArchivoId={archivoIdModal}
        expedienteContexto={expedienteContextoOcrRef.current}
        onClose={() => setModalAbierto(false)}
        onSave={guardarCambiosOcr}
        onConfirm={confirmarOcrFinal}
        onReject={rechazarOcrFinal}
        onAgregarComoVersion={agregarDuplicadoComoVersion}
        tiposDocumentalesPermitidos={FINANZAS_TIPOS_DOCUMENTALES_PERMITIDOS}
        tipoDocumentalBloqueado={Boolean(accionActual?.tipoEsperado)}
        formularioContexto="FINANZAS"
      />
    </>
  );
}
