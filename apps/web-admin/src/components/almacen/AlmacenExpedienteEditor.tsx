"use client";

import Link from "next/link";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OcrProcessingDialog, type OcrProcessingStep } from "@/components/ocr/OcrProcessingDialog";
import { OcrValidationModal, type OcrValidationFormState } from "@/components/ocr/OcrValidationModal";
import {
  DOCUMENTO_ALMACEN_ADJUNTO_OPTIONS,
  getDocumentoSummary,
  getDocumentoVisualState,
  type DocumentoCargaOption,
} from "@/constants/documentos";
import { useExpediente } from "@/hooks/useExpedientes";
import { api } from "@/services/api";
import { subirDocumentoGuiado } from "@/services/carga-guiada";
import { agregarArchivoComoVersion } from "@/services/documentos";
import {
  confirmarOcrConExpediente,
  editarOcrResultado,
  procesarArchivoOcr,
  rechazarOcrResultado,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";

type DocumentoVinculado = Record<string, any>;

type AccionAlmacen = DocumentoCargaOption & {
  grupo: "adjunto";
};

type UploadYProcesarArgs = {
  accion: AccionAlmacen;
  file: File;
};
const ALMACEN_TIPOS_DOCUMENTALES_PERMITIDOS = ["FACTURA", "GUIA", "NOTA_INGRESO"] as const;

function normalizeCompare(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMetadataRecordFromResultado(resultado: Record<string, unknown> | null | undefined) {
  const metadata = resultado?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function getClienteDetectadoEnOcr(resultado: Record<string, unknown> | null | undefined) {
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

  if (empresaDetectada && empresaEsperada && empresaDetectada !== empresaEsperada) {
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
  const raw = String(doc.creado_en ?? doc.creadoEn ?? doc.createdAt ?? doc.actualizado_en ?? "");
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

function getRecordValue(source: Record<string, unknown> | null | undefined, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function getTipoRelacionResultado(resultado: Record<string, unknown> | null, accion: AccionAlmacen | null) {
  return text(
    accion?.tipoRelacionSugerida ??
      resultado?.tipoRelacionSugerida ??
      getRecordValue(resultado, ["contextoCarga", "tipoRelacionSugerida"]) ??
      getRecordValue(resultado, ["metadata", "contextoCarga", "tipoRelacionSugerida"]),
    "adjunto_guia",
  );
}

function normalizeTipoDocumentalParaBackend(tipoDocumental: string) {
  const tipo = String(tipoDocumental || "").trim().toUpperCase();
  if (tipo === "GUIA" || tipo === "GUÍA") return "GUIA_REMISION";
  if (tipo === "NI" || tipo === "NOTA INGRESO") return "NOTA_INGRESO";
  return tipo;
}

function getTipoRelacionPorTipoDocumental(tipoDocumental: string, fallback: string) {
  const tipo = normalizeTipoDocumentalParaBackend(tipoDocumental);
  if (tipo === "FACTURA") return "adjunto_factura";
  if (tipo === "GUIA_REMISION") return "adjunto_guia";
  if (tipo === "NOTA_INGRESO") return "adjunto_nota_ingreso";
  return fallback || "adjunto_guia";
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
      origen: "ALMACEN_EDITAR_MODAL",
      expedienteId: context.expedienteId,
      codigoExpediente,
      tipoRelacionSugerida: context.tipoRelacion,
      confirmadoDesde: "almacen_editar",
    },
  };
}

function buildResultadoConContexto(
  resultado: ProcesarOcrResultado,
  accion: AccionAlmacen,
  extra: {
    archivoId: string;
    filename: string;
    uploadResponse: Record<string, unknown>;
  },
) {
  const metadataOriginal = resultado.metadata;
  const metadata =
    metadataOriginal && typeof metadataOriginal === "object" && !Array.isArray(metadataOriginal)
      ? metadataOriginal
      : {};

  return {
    ...resultado,
    archivoId: resultado.archivoId ?? extra.archivoId,
    tipoRelacionSugerida: accion.tipoRelacionSugerida,
    contextoCarga: {
      origen: "ALMACEN_EDITAR_UPLOAD",
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
        origen: "ALMACEN_EDITAR_UPLOAD",
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

function DocumentoResumen({ doc, option }: { doc?: DocumentoVinculado | null; option?: DocumentoCargaOption }) {
  if (!doc) {
    const visual = getDocumentoVisualState(null);
    return (
      <div className={`mt-3 rounded-lg border border-dashed px-3 py-2 text-xs ${visual.className}`}>
        <div className="font-medium text-muted-foreground">Pendiente de carga</div>
      </div>
    );
  }

  const visual = getDocumentoVisualState(doc);
  const summary = getDocumentoSummary(doc, option);

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${visual.className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{summary.title}</div>
          <div className="mt-1 truncate text-muted-foreground">{summary.providerLine}</div>
          {summary.details ? <div className="mt-1 text-muted-foreground">{summary.details}</div> : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${visual.badgeClassName}`}>
          {visual.label}
        </span>
      </div>
      <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
        {summary.archivo ? <div className="truncate">Archivo: {summary.archivo}</div> : null}
        {summary.archivoId ? <div>Archivo ID: {summary.archivoId}</div> : null}
      </div>
    </div>
  );
}

function DocumentosExistentes({ documentos, option }: { documentos?: DocumentoVinculado[]; option: DocumentoCargaOption }) {
  const ordenados = ordenarDocumentosPorFecha(documentos ?? []);

  if (!ordenados.length) return <DocumentoResumen option={option} />;

  return (
    <div className="mt-3 space-y-2">
      {ordenados.map((doc, index) => (
        <DocumentoResumen key={String(doc.documento_id ?? doc.documentoId ?? index)} doc={doc} option={option} />
      ))}
    </div>
  );
}

export function AlmacenExpedienteEditor({ id }: { id: string | number }) {
  const queryClient = useQueryClient();
  const { data: expediente, isLoading, error } = useExpediente(id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultadoModal, setResultadoModal] = useState<ProcesarOcrResultado | null>(null);
  const [accionActual, setAccionActual] = useState<AccionAlmacen | null>(null);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<OcrProcessingStep>("idle");
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", String(id)],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get(`/expedientes/${id}/documentos`);
      return unwrapDocumentos(data);
    },
  });

  const documentos = documentosQuery.data ?? [];
  const documentosPorRelacion = useMemo(() => getDocumentosPorRelacion(documentos), [documentos]);
  const principal = useMemo(() => pickPrincipal(documentos), [documentos]);

  const cargaRealMutation = useMutation<ProcesarOcrResultado, Error, UploadYProcesarArgs>({
    mutationFn: async ({ accion, file }) => {
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
        throw new Error("No se pudo resolver clienteAbreviatura del expediente.");
      }

      const uploadPayload: CargaGuiadaPayloadPreview = {
        areaOrigen: "ALMACEN",
        clienteAbreviatura,
        tipoEsperado: accion.tipoEsperado as CargaGuiadaPayloadPreview["tipoEsperado"],
        expedienteId: id,
        tipoRelacionSugerida: accion.tipoRelacionSugerida as CargaGuiadaPayloadPreview["tipoRelacionSugerida"],
        canalIngreso: "ALMACEN_EDITAR_UPLOAD",
        observacion: `Carga desde Almacén: ${accion.label}`,
      };

      const uploadResponse = await subirDocumentoGuiado(uploadPayload, file);
      const archivoId = getArchivoId(uploadResponse as Record<string, unknown>);

      if (!archivoId) {
        throw new Error("El upload no devolvió archivoId.");
      }

      setProcessingStep("processing_ocr");

      const resultado = await procesarArchivoOcr(archivoId, {
        tipoEsperado: accion.tipoEsperado,
        areaOrigen: "ALMACEN",
        clienteAbreviatura,
        expedienteId: id,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
        canalIngreso: "ALMACEN_EDITAR_UPLOAD",
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
      const empresaActual = text((expediente as any)?.empresa_codigo ?? (expediente as any)?.empresaCodigo, "");
      const rucCompradorActual = getRucComprador(expediente, empresaActual);
      const mismatch = getMensajeMismatchCliente(resultado as Record<string, unknown>, empresaActual, rucCompradorActual);

      setAccionActual(accion);
      setResultadoModal(resultado);
      setMensajeValidacion(mismatch);
      setProcessingStep("ready");
      queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });

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
    return <main className="p-6 text-red-600">No se pudo cargar el expediente.</main>;
  }

  const codigo = text((expediente as any).codigo_expediente ?? (expediente as any).codigoExpediente, "");
  const empresa = text((expediente as any).empresa_codigo ?? (expediente as any).empresaCodigo, "");
  const descripcion = text((expediente as any).descripcion, "");
  const rucComprador = getRucComprador(expediente, empresa);
  const procesando = cargaRealMutation.isPending;
  const archivoIdModal = getArchivoId(resultadoModal as Record<string, unknown> | null) ?? undefined;

  async function persistirEdicionOcr(form: OcrValidationFormState, observacion: string) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para guardar la validación.");
    }

    const tipoRelacion = getTipoRelacionResultado(resultadoActual, accionActual);
    const metadata = buildMetadataDesdeFormulario(form, {
      codigoExpediente: codigo,
      rucComprador,
      clienteAbreviatura: empresa,
      expedienteId: id,
      tipoRelacion,
    });

    await editarOcrResultado(ocrResultadoId, {
      tipoPropuesto: normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || accionActual?.tipoEsperado || "")),
      metadata,
      observacion,
    });

    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });

    return { ocrResultadoId, tipoRelacion, metadata };
  }

  async function guardarCambiosOcr(form: OcrValidationFormState) {
    await persistirEdicionOcr(form, "Edición manual desde Almacén > Adjuntar");
    setMensajeValidacion(`Cambios OCR guardados para ${accionActual?.label ?? "documento"}.`);
  }

  async function confirmarOcrFinal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para confirmar la validación.");
    }

    const mismatch = getMensajeMismatchCliente(resultadoActual, empresa, rucComprador);
    if (mismatch) {
      setMensajeValidacion(mismatch);
      throw new Error(mismatch);
    }

    const tipoRelacionBase = getTipoRelacionResultado(resultadoActual, accionActual);
    const tipoRelacionFinal = getTipoRelacionPorTipoDocumental(
      normalizeTipoDocumentalParaBackend(String(form.tipoDocumental || accionActual?.tipoEsperado || "")),
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

    await confirmarOcrConExpediente(ocrResultadoId, {
      expedienteId: id,
      tipoRelacion: tipoRelacionFinal,
      esPrincipal: false,
      orden: 20,
      metadata,
      observacion: "Guardar y confirmar adjunto desde Almacén",
    });

    setModalAbierto(false);
    setMensajeValidacion(`Documento confirmado y vinculado al expediente ${codigo || id}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
  }

  async function agregarDuplicadoComoVersion(details: { documentoIdExistente?: number | string; archivoIdActual?: number | string }) {
    const documentoIdExistente = details.documentoIdExistente;
    const archivoIdActual = details.archivoIdActual;

    if (!documentoIdExistente || !archivoIdActual) {
      throw new Error("No se encontró el documento existente o el archivo nuevo para agregar como versión.");
    }

    await agregarArchivoComoVersion(documentoIdExistente, archivoIdActual, {
      tipoVersion: "escaneado",
      observacion: "Archivo escaneado agregado como versión desde Almacén",
      marcarComoActual: true,
    });

    setModalAbierto(false);
    setMensajeValidacion(`Archivo agregado como nueva versión del documento ${documentoIdExistente}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
  }

  async function rechazarOcrFinal(form: OcrValidationFormState) {
    const resultadoActual = resultadoModal as Record<string, unknown> | null;
    const ocrResultadoId = getOcrResultadoId(resultadoActual);

    if (!ocrResultadoId) {
      throw new Error("No se encontró ocrResultadoId para rechazar el OCR.");
    }

    await rechazarOcrResultado(
      ocrResultadoId,
      `Rechazado desde Almacén. Tipo: ${form.tipoDocumental}. Documento: ${form.serie ? `${form.serie}-` : ""}${form.numero || "sin número"}`,
    );

    setModalAbierto(false);
    setMensajeValidacion(`OCR rechazado para ${accionActual?.label ?? "documento"}.`);
    queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] });
    queryClient.invalidateQueries({ queryKey: ["expediente-documentos", String(id)] });
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
              <Link href="/almacen">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Almacén</h1>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{codigo || "SIN EXPEDIENTE"}</span>
              {empresa ? <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{empresa}</span> : null}
              {descripcion ? <p className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{descripcion}</p> : null}
            </div>            
          </div>
        </div>

        {mensajeValidacion ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {mensajeValidacion}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Documento principal</CardTitle>
              <Badge variant={principal ? "secondary" : "outline"}>{principal ? "✓ Principal activo" : "Sin principal"}</Badge>
            </CardHeader>
            <CardContent>
              {principal ? (
                <div className="rounded-xl border bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-primary" />
                    <DocumentoResumen doc={principal} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Este expediente no tiene documento principal activo. Almacén no puede adjuntar documentos.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                  <Input value={empresa} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Expediente</label>
                  <Input value={codigo || "SIN EXPEDIENTE"} readOnly />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                <Input value={descripcion} readOnly />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Adjuntar desde Almacén</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {DOCUMENTO_ALMACEN_ADJUNTO_OPTIONS.map((item) => {
              const documentosItem = documentosPorRelacion.get(item.tipoRelacionSugerida);
              return (
                <div key={item.tipoRelacionSugerida} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{item.label}</div>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.tipoEsperado}
                    </span>
                  </div>

                  <DocumentosExistentes documentos={documentosItem} option={item} />

                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    size="sm"
                    disabled={procesando || !principal}
                    onClick={() => iniciarSeleccionArchivo(item)}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {procesando && accionActual?.tipoRelacionSugerida === item.tipoRelacionSugerida
                      ? "Subiendo/procesando..."
                      : documentosItem?.length
                        ? "Adjuntar otro"
                        : "Adjuntar"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>

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
        expedienteContexto={{
          id,
          codigo,
          descripcion,
          empresa,
          rucComprador,
        }}
        onClose={() => setModalAbierto(false)}
        onSave={guardarCambiosOcr}
        onConfirm={confirmarOcrFinal}
        onReject={rechazarOcrFinal}
        onAgregarComoVersion={agregarDuplicadoComoVersion}
        tiposDocumentalesPermitidos={ALMACEN_TIPOS_DOCUMENTALES_PERMITIDOS}
        tipoDocumentalBloqueado={Boolean(accionActual?.tipoEsperado)}
      />
    </>
  );
}
