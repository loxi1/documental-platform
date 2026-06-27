"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  CreditCard,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Link2,
  Loader2,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDocumentosAlertas } from "@/hooks/useAlertas";
import {
  getDocumentoArchivoPreviewUrl,
  type DocumentoArchivoPreview,
} from "@/services/documentos-preview";
import {
  useExpediente,
  useExpedienteEstadoDocumental,
  useExpedienteResumen,
  useExpedienteTimeline,
} from "@/hooks/useExpedientes";
import type { DocumentoAlerta } from "@/types/alerta";
import type { ExpedienteDocumento, ExpedienteTimelineItem } from "@/types/expediente";

function asString(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fechaTimeline(item: ExpedienteTimelineItem) {
  return item.fecha ?? item.creado_en ?? item.creadoEn ?? "";
}

function tituloTimeline(item: ExpedienteTimelineItem) {
  return item.titulo ?? item.evento ?? item.tipo ?? "Evento";
}

function descripcionTimeline(item: ExpedienteTimelineItem) {
  return item.descripcion ?? item.mensaje ?? "Sin descripción";
}

function tipoTimeline(item: ExpedienteTimelineItem) {
  return String(item.tipo ?? item.evento ?? item.titulo ?? "EVENTO").toUpperCase();
}

function timelineBadgeLabel(item: ExpedienteTimelineItem) {
  const tipo = tipoTimeline(item);

  if (tipo.includes("OCR")) return "OCR";
  if (tipo.includes("EXPEDIENTE")) return "Expediente";
  if (tipo.includes("DOCUMENTO")) return "Documento";
  if (tipo.includes("ALERTA")) return "Alerta";
  if (tipo.includes("VINCUL")) return "Vínculo";

  return "Evento";
}

function timelineIcon(item: ExpedienteTimelineItem) {
  const tipo = tipoTimeline(item);

  if (tipo.includes("ALERTA")) return <AlertTriangle className="h-4 w-4" />;
  if (tipo.includes("VINCUL")) return <Link2 className="h-4 w-4" />;
  if (tipo.includes("DOCUMENTO")) return <FileText className="h-4 w-4" />;
  if (tipo.includes("OCR")) return <CircleDot className="h-4 w-4" />;

  return <CalendarClock className="h-4 w-4" />;
}

function timelineTone(item: ExpedienteTimelineItem) {
  const tipo = tipoTimeline(item);

  if (tipo.includes("ALERTA")) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tipo.includes("OCR")) {
    return "border-blue-200 bg-blue-50 text-blue-900";
  }

  if (tipo.includes("EXPEDIENTE") || tipo.includes("VINCUL")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return "border-border bg-muted/30 text-foreground";
}

function formatTimelineDate(value: string) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}


function documentoValue(
  documento: ExpedienteDocumento | null | undefined,
  ...keys: string[]
) {
  if (!documento) return undefined;

  const record = documento as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return undefined;
}

function getDocumentoArchivoId(documento?: ExpedienteDocumento | null) {
  const value = documentoValue(
    documento,
    "archivoId",
    "archivo_id",
    "archivoActualId",
    "archivo_actual_id",
    "documentoArchivoId",
    "documento_archivo_id",
  );

  if (value === null || value === undefined || value === "") return null;

  return String(value);
}

function getDocumentoVersionActual(documento?: ExpedienteDocumento | null) {
  return documentoValue(
    documento,
    "versionActual",
    "version_actual",
    "version",
    "numeroVersion",
    "numero_version",
  );
}

function getDocumentoFechaEmision(documento?: ExpedienteDocumento | null) {
  return documentoValue(documento, "fechaEmision", "fecha_emision");
}

function getDocumentoMoneda(documento?: ExpedienteDocumento | null) {
  return documentoValue(documento, "moneda", "monedaCodigo", "moneda_codigo");
}

function getDocumentoMontoTotal(documento?: ExpedienteDocumento | null) {
  return documentoValue(documento, "montoTotal", "monto_total");
}

function getDocumentoRazonSocialEmisor(documento?: ExpedienteDocumento | null) {
  return documentoValue(
    documento,
    "razonSocialEmisor",
    "razon_social_emisor",
    "proveedor",
    "razonSocialProveedor",
    "razon_social_proveedor",
  );
}

function getDocumentoNombreArchivo(
  documento?: ExpedienteDocumento | null,
  preview?: DocumentoArchivoPreview | null,
) {
  return (
    documentoValue(
      documento,
      "nombreArchivo",
      "nombre_archivo",
      "filename",
      "archivoNombre",
      "archivo_nombre",
    ) ?? preview?.filename
  );
}

function isPdfPreview(preview?: DocumentoArchivoPreview | null) {
  const contentType = String(preview?.contentType ?? "").toLowerCase();
  const filename = String(preview?.filename ?? "").toLowerCase();

  return contentType.includes("pdf") || filename.endsWith(".pdf");
}

function isImagePreview(preview?: DocumentoArchivoPreview | null) {
  const contentType = String(preview?.contentType ?? "").toLowerCase();
  const filename = String(preview?.filename ?? "").toLowerCase();

  return (
    contentType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(filename)
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">
        {asString(value)}
      </div>
    </div>
  );
}

function DocumentoPreviewModal({
  documento,
  preview,
  loading,
  error,
  onClose,
}: {
  documento: ExpedienteDocumento | null;
  preview: DocumentoArchivoPreview | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const archivoId = getDocumentoArchivoId(documento);
  const nombreArchivo = getDocumentoNombreArchivo(documento, preview);

  return (
    <Modal
      isOpen={Boolean(documento)}
      onClose={onClose}
      className="h-[88vh] max-w-[96vw] overflow-hidden p-0"
    >
      <div className="flex h-[88vh] flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 pr-16">
          <div>
            <div className="text-lg font-semibold">{documentoLabel(documento)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Vista rápida del documento sin salir del expediente.
            </p>
          </div>
          <Badge variant={documento?.esPrincipal ? "default" : "outline"}>
            {documento?.tipoRelacion ?? (documento?.esPrincipal ? "principal" : "adjunto")}
          </Badge>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[2fr_1fr]">
          <div className="min-h-0 border-r bg-muted/30 p-4">
            <div className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-xl border bg-background">
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Cargando vista previa...
                </div>
              ) : error ? (
                <div className="max-w-md px-6 text-center text-sm text-red-600">
                  {error}
                </div>
              ) : preview?.signedUrl && isPdfPreview(preview) ? (
                <iframe
                  src={preview.signedUrl}
                  title={String(nombreArchivo ?? documentoLabel(documento))}
                  className="h-full w-full border-0"
                />
              ) : preview?.signedUrl && isImagePreview(preview) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.signedUrl}
                  alt={String(nombreArchivo ?? documentoLabel(documento))}
                  className="h-full w-full object-contain"
                />
              ) : preview?.signedUrl ? (
                <div className="space-y-3 px-6 text-center text-sm text-muted-foreground">
                  <p>Este tipo de archivo no se puede previsualizar embebido.</p>
                  <Button asChild size="sm" variant="outline">
                    <a href={preview.signedUrl} target="_blank" rel="noreferrer">
                      Abrir archivo
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="px-6 text-center text-sm text-muted-foreground">
                  No hay vista previa disponible para este documento.
                </div>
              )}
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto bg-background p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Datos principales</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Información del documento vinculado al expediente.
              </p>
            </div>

            <div className="space-y-2">
              <DetailRow label="Tipo documental" value={documento?.tipoDocumental} />
              <DetailRow label="Tipo relación" value={documento?.tipoRelacion} />
              <DetailRow label="Serie" value={documento?.serie} />
              <DetailRow label="Número" value={documento?.numero} />
              <DetailRow label="Fecha emisión" value={getDocumentoFechaEmision(documento)} />
              <DetailRow label="RUC emisor" value={documento?.rucEmisor} />
              <DetailRow label="Razón social emisor" value={getDocumentoRazonSocialEmisor(documento)} />
              <DetailRow label="Moneda" value={getDocumentoMoneda(documento)} />
              <DetailRow label="Monto total" value={getDocumentoMontoTotal(documento)} />
              <DetailRow label="Estado" value={documento?.estado} />
              <DetailRow label="Clave documental" value={documento?.claveDocumental} />
              <DetailRow label="Archivo actual" value={nombreArchivo ?? archivoId} />
              <DetailRow label="Versión actual" value={getDocumentoVersionActual(documento)} />
            </div>

            {preview?.signedUrl ? (
              <Button asChild className="mt-4 w-full" size="sm" variant="outline">
                <a href={preview.signedUrl} target="_blank" rel="noreferrer">
                  Abrir en nueva pestaña
                </a>
              </Button>
            ) : null}
          </aside>
        </div>
      </div>
    </Modal>
  );
}

function documentoLabel(documento?: ExpedienteDocumento | null) {
  if (!documento) return "Sin documento principal";

  const partes = [
    documento.tipoDocumental,
    documento.serie,
    documento.numero,
  ].filter(Boolean);

  return partes.length ? partes.join(" ") : `Documento #${documento.documentoId}`;
}


function estadoAlerta(alerta: DocumentoAlerta) {
  return String(alerta.estado ?? "activa");
}

function tipoAlerta(alerta: DocumentoAlerta) {
  return String(alerta.tipoAlerta ?? alerta.tipo_alerta ?? "ALERTA");
}

function mensajeAlerta(alerta: DocumentoAlerta) {
  return String(alerta.mensaje ?? "Sin mensaje registrado.");
}

function alertaDocumentoId(alerta: DocumentoAlerta) {
  return String(alerta.documentoId ?? alerta.documento_id ?? "-");
}



type DocumentoSlot = {
  key: string;
  label: string;
  description: string;
  relation: string;
  optional?: boolean;
  icon: ReactNode;
};

const DOCUMENTO_PRINCIPAL_SLOTS: DocumentoSlot[] = [
  {
    key: "principal_factura",
    label: "Factura principal",
    description: "Documento fiscal base del gasto directo.",
    relation: "principal_factura",
    icon: <ReceiptText className="h-4 w-4" />,
  },
  {
    key: "principal_oc",
    label: "OC principal",
    description: "Orden de compra que abre el expediente.",
    relation: "principal_oc",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    key: "principal_os",
    label: "OS principal",
    description: "Orden de servicio que abre el expediente.",
    relation: "principal_os",
    icon: <FileCheck2 className="h-4 w-4" />,
  },
];

const DOCUMENTO_ADJUNTO_SLOTS: DocumentoSlot[] = [
  {
    key: "adjunto_factura",
    label: "Factura adjunta",
    description: "Factura vinculada a OC/OS del expediente.",
    relation: "adjunto_factura",
    icon: <ReceiptText className="h-4 w-4" />,
  },
  {
    key: "adjunto_guia",
    label: "Guía de remisión",
    description: "Guía del proveedor o sustento de entrega.",
    relation: "adjunto_guia",
    icon: <Truck className="h-4 w-4" />,
  },
  {
    key: "adjunto_nota_ingreso",
    label: "Nota de ingreso",
    description: "Confirmación de almacén o recepción interna.",
    relation: "adjunto_nota_ingreso",
    icon: <PackageCheck className="h-4 w-4" />,
  },
  {
    key: "adjunto_transferencia",
    label: "Transferencia",
    description: "Pago por transferencia bancaria.",
    relation: "adjunto_transferencia",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    key: "adjunto_detraccion",
    label: "Detracción",
    description: "Constancia de detracción cuando corresponda.",
    relation: "adjunto_detraccion",
    optional: true,
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    key: "adjunto_recibo_honorario",
    label: "Recibo por honorario",
    description: "Documento de servicios personales, si aplica.",
    relation: "adjunto_recibo_honorario",
    optional: true,
    icon: <FileText className="h-4 w-4" />,
  },
];

function normalizeRelation(value?: string) {
  return String(value ?? "").toLowerCase().trim();
}

function findDocumentoByRelation(
  documentos: ExpedienteDocumento[],
  relation: string,
) {
  const normalized = normalizeRelation(relation);

  return documentos.find(
    (documento) => normalizeRelation(documento.tipoRelacion) === normalized,
  );
}

function DocumentoSlotCard({
  slot,
  documento,
  onVerDocumento,
}: {
  slot: DocumentoSlot;
  documento?: ExpedienteDocumento;
  onVerDocumento: (documento: ExpedienteDocumento) => void;
}) {
  const disponible = Boolean(documento);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        disponible
          ? "border-emerald-200 bg-emerald-50/50"
          : slot.optional
            ? "border-dashed bg-muted/20"
            : "border-dashed bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border ${
              disponible
                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {slot.icon}
          </span>

          <div>
            <div className="font-semibold">{slot.label}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {slot.description}
            </p>
          </div>
        </div>

        <Badge variant={disponible ? "secondary" : "outline"}>
          {disponible ? "Presente" : slot.optional ? "Opcional" : "Pendiente"}
        </Badge>
      </div>

      {documento ? (
        <div className="mt-4 rounded-lg border bg-background/80 p-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-medium">{documentoLabel(documento)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Documento #{documento.documentoId} · Estado {documento.estado ?? "-"}
              </div>
            </div>

            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onVerDocumento(documento)}
            >
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {slot.optional
            ? "Se agregará si este expediente lo requiere."
            : "Pendiente de adjuntar o vincular al expediente."}
        </p>
      )}
    </div>
  );
}

function DocumentoCard({
  documento,
  onVerDocumento,
}: {
  documento: ExpedienteDocumento;
  onVerDocumento: (documento: ExpedienteDocumento) => void;
}) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{documentoLabel(documento)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            ID documento: {documento.documentoId}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onVerDocumento(documento)}
          >
            <Eye className="mr-1 h-4 w-4" />
            Ver
          </Button>
          <Badge variant={documento.esPrincipal ? "default" : "outline"}>
            {documento.tipoRelacion ?? (documento.esPrincipal ? "principal" : "adjunto")}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
        <div>RUC: {documento.rucEmisor ?? "-"}</div>
        <div>Estado: {documento.estado ?? "-"}</div>
        <div>Orden: {documento.orden ?? "-"}</div>
      </div>
    </div>
  );
}

export default function ExpedienteDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const expedienteQuery = useExpediente(id);
  const resumenQuery = useExpedienteResumen(id);
  const timelineQuery = useExpedienteTimeline(id);
  const estadoDocumentalQuery = useExpedienteEstadoDocumental(id);

  const expediente = expedienteQuery.data;
  const resumen = resumenQuery.data;
  const timeline: ExpedienteTimelineItem[] = (timelineQuery.data as ExpedienteTimelineItem[] | undefined) ?? [];
  const estadoDocumental = estadoDocumentalQuery.data;

  const documentoPrincipal =
    expediente?.documentoPrincipal ?? resumen?.documentoPrincipal ?? null;

  const documentosAdjuntos: ExpedienteDocumento[] = (
    expediente?.documentosAdjuntos ??
    resumen?.documentosAdjuntos ??
    []
  ) as ExpedienteDocumento[];

  const documentosDelExpediente = [
    documentoPrincipal,
    ...documentosAdjuntos,
  ].filter(Boolean) as ExpedienteDocumento[];

  const documentosIds = documentosDelExpediente
    .map((documento) => documento.documentoId)
    .filter(Boolean);

  const principalSlot = DOCUMENTO_PRINCIPAL_SLOTS.find((slot) =>
    findDocumentoByRelation(documentosDelExpediente, slot.relation),
  );

  const documentosEsperados = [
    ...DOCUMENTO_PRINCIPAL_SLOTS,
    ...DOCUMENTO_ADJUNTO_SLOTS.filter((slot) => !slot.optional),
  ];

  const documentosPresentesCatalogo = documentosEsperados.filter((slot) =>
    findDocumentoByRelation(documentosDelExpediente, slot.relation),
  ).length;

  const avanceDocumental = documentosEsperados.length
    ? Math.round((documentosPresentesCatalogo / documentosEsperados.length) * 100)
    : 0;

  const alertasExpedienteQuery = useDocumentosAlertas(documentosIds);
  const alertasExpediente = alertasExpedienteQuery.alertas;
  const alertasActivas = alertasExpediente.filter(
    (alerta) => estadoAlerta(alerta) !== "resuelta",
  );

  const presentes: string[] = (
    estadoDocumental?.presentes ??
    estadoDocumental?.documentosPresentes ??
    []
  ) as string[];

  const faltantes: string[] = (
    estadoDocumental?.faltantes ??
    estadoDocumental?.documentosFaltantes ??
    []
  ) as string[];

  const [documentoModal, setDocumentoModal] = useState<ExpedienteDocumento | null>(null);
  const [previewModal, setPreviewModal] = useState<DocumentoArchivoPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function abrirDocumentoModal(documento: ExpedienteDocumento) {
    setDocumentoModal(documento);
    setPreviewModal(null);
    setPreviewError(null);

    const archivoId = getDocumentoArchivoId(documento);

    if (!archivoId) {
      setPreviewError("Este documento no tiene archivo actual asociado para vista previa.");
      return;
    }

    setPreviewLoading(true);

    try {
      const preview = await getDocumentoArchivoPreviewUrl(archivoId);
      setPreviewModal(preview);
    } catch (error) {
      console.error("No se pudo cargar la vista previa del documento", error);
      setPreviewError("No se pudo cargar la vista previa del documento.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function cerrarDocumentoModal() {
    setDocumentoModal(null);
    setPreviewModal(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }

  if (expedienteQuery.isLoading) {
    return <div className="p-6">Cargando expediente...</div>;
  }

  if (expedienteQuery.error || !expediente) {
    return (
      <div className="space-y-4 p-6">
        <Button asChild variant="outline">
          <Link href="/expedientes">Volver</Link>
        </Button>
        <div className="text-red-600">No se pudo cargar el expediente.</div>
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild className="mb-3" size="sm" variant="ghost">
            <Link href="/expedientes">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{expediente.correlativo}</h1>
          <p className="text-sm text-muted-foreground">
            Detalle operativo del expediente: resumen, estado documental,
            documentos y timeline.
          </p>
        </div>

        <Badge variant="secondary" className="w-fit">
          {expediente.estado ?? "abierto"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-6">
        <Card>
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.empresa_codigo ?? expediente.empresaCodigo)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.tipo_expediente ?? expediente.tipoExpediente)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Código OP</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.codigo_op ?? expediente.codigoOp)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjuntos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {documentosAdjuntos.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas activas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {alertasActivas.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avance documental</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{avanceDocumental}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {documentosPresentesCatalogo}/{documentosEsperados.length} requeridos
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Expediente documental completo</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Vista operativa por catálogo oficial de documentos principales y adjuntos.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              Principal: {principalSlot?.label ?? "sin definir"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">
              Documento principal
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {DOCUMENTO_PRINCIPAL_SLOTS.map((slot) => (
                <DocumentoSlotCard
                  key={slot.key}
                  slot={slot}
                  documento={findDocumentoByRelation(documentosDelExpediente, slot.relation)}
                  onVerDocumento={abrirDocumentoModal}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">
              Documentos adjuntos y financieros
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {DOCUMENTO_ADJUNTO_SLOTS.map((slot) => (
                <DocumentoSlotCard
                  key={slot.key}
                  slot={slot}
                  documento={findDocumentoByRelation(documentosDelExpediente, slot.relation)}
                  onVerDocumento={abrirDocumentoModal}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documento principal</CardTitle>
          </CardHeader>
          <CardContent>
            {documentoPrincipal ? (
              <DocumentoCard documento={documentoPrincipal} onVerDocumento={abrirDocumentoModal} />
            ) : (
              <Empty className="p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin documento principal</EmptyTitle>
                  <EmptyDescription>
                    Este expediente aún no tiene OC, OS o factura principal vinculada.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado documental</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Presentes
              </div>
              <div className="flex flex-wrap gap-2">
                {presentes.map((item: string) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <XCircle className="h-4 w-4" /> Faltantes
              </div>
              <div className="flex flex-wrap gap-2">
                {faltantes.map((item: string) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {documentosAdjuntos.length ? (
              documentosAdjuntos.map((documento) => (
                <DocumentoCard key={documento.documentoId} documento={documento} onVerDocumento={abrirDocumentoModal} />
              ))
            ) : (
              <Empty className="md:col-span-2">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin documentos adjuntos</EmptyTitle>
                  <EmptyDescription>
                    Cuando se agreguen guías, notas de ingreso o pagos aparecerán aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas del expediente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasExpedienteQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Cargando alertas del expediente...
            </div>
          ) : alertasActivas.length ? (
            <div className="space-y-3">
              {alertasActivas.map((alerta) => (
                <div
                  key={`${alertaDocumentoId(alerta)}-${alerta.id}`}
                  className="flex flex-col gap-3 rounded-lg border p-3 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{tipoAlerta(alerta)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Documento #{alertaDocumentoId(alerta)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{mensajeAlerta(alerta)}</p>
                  </div>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/alertas?documentoId=${alertaDocumentoId(alerta)}`}>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Ver alerta
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Sin alertas activas</EmptyTitle>
                <EmptyDescription>
                  No hay observaciones pendientes en los documentos de este expediente.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Timeline
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {timeline.length} evento{timeline.length === 1 ? "" : "s"} registrado
              {timeline.length === 1 ? "" : "s"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {timeline.length ? (
            <div className="relative ml-2 space-y-4">
              {timeline.map((item, index) => (
                <div key={item.id ?? index} className="relative grid gap-3 pl-10 md:grid-cols-[180px_1fr]">
                  {index < timeline.length - 1 ? (
                    <span className="absolute left-[15px] top-9 h-[calc(100%+1rem)] w-px bg-border" />
                  ) : null}

                  <span className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border ${timelineTone(item)}`}>
                    {timelineIcon(item)}
                  </span>

                  <div className="pt-1 text-xs text-muted-foreground">
                    {formatTimelineDate(fechaTimeline(item))}
                  </div>

                  <div className={`rounded-xl border p-4 shadow-sm ${timelineTone(item)}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold">{tituloTimeline(item)}</div>
                        <p className="mt-1 text-sm opacity-80">
                          {descripcionTimeline(item)}
                        </p>
                      </div>

                      <Badge variant="secondary" className="w-fit bg-background/70">
                        {timelineBadgeLabel(item)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarClock className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Timeline sin eventos</EmptyTitle>
                <EmptyDescription>
                  Los eventos de OCR, vinculación y alertas aparecerán aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <DocumentoPreviewModal
        documento={documentoModal}
        preview={previewModal}
        loading={previewLoading}
        error={previewError}
        onClose={cerrarDocumentoModal}
      />
    </main>
  );
}