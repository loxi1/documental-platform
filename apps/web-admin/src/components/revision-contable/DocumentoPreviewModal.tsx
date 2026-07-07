"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  getDocumentoArchivoPreviewUrl,
  type DocumentoArchivoPreview,
} from "@/services/documentos-preview";
import type { ExpedienteDocumento } from "@/types/expediente";

type Props = {
  documento: ExpedienteDocumento | null;
  open: boolean;
  onClose: () => void;
};

function asRecord(documento: ExpedienteDocumento | null | undefined) {
  return documento as unknown as Record<string, unknown> | null | undefined;
}

function pickDocumentoValue(
  documento: ExpedienteDocumento | null | undefined,
  keys: string[],
): string | number | boolean | null | undefined {
  if (!documento) return undefined;

  const record = asRecord(documento);

  for (const key of keys) {
    const value = record?.[key];

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return value;
    }
  }

  return undefined;
}

function asText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMoney(moneda: unknown, monto: unknown) {
  if (monto === null || monto === undefined || monto === "") return "-";

  const value = Number(monto);
  const monedaText = String(moneda ?? "").toUpperCase();

  if (Number.isNaN(value)) {
    return [asText(moneda, ""), String(monto)].filter(Boolean).join(" ") || "-";
  }

  if (monedaText.includes("DOLAR") || monedaText === "USD") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  if (monedaText.includes("SOL") || monedaText === "PEN") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  return [asText(moneda, ""), value.toFixed(2)].filter(Boolean).join(" ");
}

function documentoLabel(documento: ExpedienteDocumento | null) {
  const tipo = asText(
    pickDocumentoValue(documento, ["tipoDocumental", "tipo_documental"]),
    "Documento",
  );
  const serie = asText(pickDocumentoValue(documento, ["serie"]), "");
  const numero = asText(pickDocumentoValue(documento, ["numero"]), "");

  return [tipo, serie, numero].filter(Boolean).join(" ").trim();
}

function getArchivoId(
  documento: ExpedienteDocumento | null | undefined,
): string | number | undefined {
  const value = pickDocumentoValue(documento, ["archivoId", "archivo_id"]);

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return undefined;
}

function isImagePreview(preview: DocumentoArchivoPreview | null) {
  const contentType = preview?.contentType?.toLowerCase() ?? "";
  const filename = preview?.filename?.toLowerCase() ?? "";

  return (
    contentType.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(filename)
  );
}

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-muted/20 p-2 ${className}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm font-medium text-foreground">
        {asText(value)}
      </div>
    </div>
  );
}

type DetailField = {
  label: string;
  value: unknown;
  wide?: boolean;
};

function normalizeTipoDocumental(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function buildDetailFields(documento: ExpedienteDocumento | null): DetailField[] {
  const tipoDocumental = pickDocumentoValue(documento, [
    "tipoDocumental",
    "tipo_documental",
  ]);
  const tipo = normalizeTipoDocumental(tipoDocumental);
  const tipoRelacion = pickDocumentoValue(documento, [
    "tipoRelacion",
    "tipo_relacion",
  ]);
  const serie = pickDocumentoValue(documento, ["serie"]);
  const numero = pickDocumentoValue(documento, ["numero"]);
  const fecha = pickDocumentoValue(documento, ["fechaEmision", "fecha_emision"]);
  const monto = pickDocumentoValue(documento, ["montoTotal", "monto_total"]);
  const moneda = pickDocumentoValue(documento, ["moneda"]);
  const estado = pickDocumentoValue(documento, ["estado"]);
  const claveDocumental = pickDocumentoValue(documento, [
    "claveDocumental",
    "clave_documental",
  ]);
  const ruc = pickDocumentoValue(documento, [
    "rucEmisor",
    "ruc_emisor",
    "rucProveedor",
    "ruc_proveedor",
  ]);
  const razonSocial = pickDocumentoValue(documento, [
    "razonSocialEmisor",
    "razon_social_emisor",
    "proveedor",
    "razonSocial",
    "razon_social",
  ]);

  const common = {
    tipoDocumental,
    tipoRelacion,
    serie,
    numero,
    fecha,
    monto,
    moneda,
    estado,
    claveDocumental,
    ruc,
    razonSocial,
  };

  if (tipo === "NOTA_INGRESO") {
    return [
      { label: "Tipo documental", value: common.tipoDocumental },
      { label: "Número", value: common.numero },
      { label: "Clave documental", value: common.claveDocumental, wide: true },
    ];
  }

  if (tipo === "PAGO_TRANSFERENCIA") {
    return [
      { label: "Tipo documental", value: common.tipoDocumental },
      { label: "Tipo relación", value: common.tipoRelacion },
      { label: "Código operación", value: common.numero },
      { label: "Fecha pago", value: formatDate(common.fecha) },
      { label: "Monto", value: formatMoney(common.moneda, common.monto) },
      { label: "Moneda", value: common.moneda },
      { label: "Estado", value: common.estado },
      { label: "Clave documental", value: common.claveDocumental, wide: true },
    ];
  }

  if (tipo === "PAGO_DETRACCION") {
    return [
      { label: "Tipo documental", value: common.tipoDocumental },
      { label: "Tipo relación", value: common.tipoRelacion },
      { label: "Número de constancia", value: common.numero },
      { label: "Fecha pago", value: formatDate(common.fecha) },
      { label: "RUC proveedor", value: common.ruc },
      { label: "Razón social", value: common.razonSocial },
      { label: "Monto", value: formatMoney(common.moneda, common.monto) },
      { label: "Moneda", value: common.moneda },
      { label: "Estado", value: common.estado },
      { label: "Clave documental", value: common.claveDocumental, wide: true },
    ];
  }

  if (tipo === "FACTURA") {
    return [
      { label: "Tipo documental", value: common.tipoDocumental },
      { label: "Tipo relación", value: common.tipoRelacion },
      { label: "Serie", value: common.serie },
      { label: "Número", value: common.numero },
      { label: "Fecha emisión", value: formatDate(common.fecha) },
      { label: "RUC emisor", value: common.ruc },
      { label: "Razón social", value: common.razonSocial, wide: true },
      { label: "Estado", value: common.estado },
      { label: "Clave documental", value: common.claveDocumental, wide: true },
    ];
  }

  if (tipo === "OC" || tipo === "ORDEN_COMPRA") {
    return [
      { label: "Tipo documental", value: common.tipoDocumental },
      { label: "Tipo relación", value: common.tipoRelacion },
      { label: "Número", value: common.numero },
      { label: "Fecha emisión", value: formatDate(common.fecha) },
      { label: "RUC proveedor", value: common.ruc },
      { label: "Razón social", value: common.razonSocial, wide: true },
      { label: "Monto", value: formatMoney(common.moneda, common.monto) },
      { label: "Moneda", value: common.moneda },
      { label: "Estado", value: common.estado },
      { label: "Clave documental", value: common.claveDocumental, wide: true },
    ];
  }

  return [
    { label: "Tipo documental", value: common.tipoDocumental },
    { label: "Tipo relación", value: common.tipoRelacion },
    { label: "Serie", value: common.serie },
    { label: "Número", value: common.numero },
    { label: "Fecha emisión", value: formatDate(common.fecha) },
    { label: "RUC emisor / proveedor", value: common.ruc },
    { label: "Razón social", value: common.razonSocial, wide: true },
    { label: "Monto", value: formatMoney(common.moneda, common.monto) },
    { label: "Moneda", value: common.moneda },
    { label: "Estado", value: common.estado },
    { label: "Clave documental", value: common.claveDocumental, wide: true },
  ];
}

export function DocumentoPreviewModal({ documento, open, onClose }: Props) {
  const [preview, setPreview] = useState<DocumentoArchivoPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archivoId = useMemo(() => getArchivoId(documento), [documento]);
  const titulo = documentoLabel(documento);

  useEffect(() => {
    let mounted = true;

    async function loadPreview() {
      setPreview(null);
      setError(null);

      if (!open || !documento) return;

      if (!archivoId) {
        setError("Este documento no tiene archivo actual asociado para vista previa.");
        return;
      }

      setLoading(true);

      try {
        const result = await getDocumentoArchivoPreviewUrl(archivoId);
        if (mounted) setPreview(result);
      } catch (previewError) {
        console.error("No se pudo cargar la vista previa del documento", previewError);
        if (mounted) setError("No se pudo cargar la vista previa del documento.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [archivoId, documento, open]);

  const detailFields = useMemo(() => buildDetailFields(documento), [documento]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="mx-auto h-[88vh] max-w-[96vw] p-0"
      showCloseButton
    >
      <div className="flex h-[88vh] flex-col overflow-hidden rounded-3xl bg-background text-foreground">
        <div className="border-b px-5 py-4 pr-16">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Visualizar documento</h2>
            <Badge variant="outline">Solo lectura</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{titulo || "Documento"}</p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[2fr_1fr]">
          <section className="min-h-0 border-r bg-slate-50 dark:bg-slate-950/40">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando vista previa...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>{error}</div>
              </div>
            ) : preview?.signedUrl ? (
              isImagePreview(preview) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.signedUrl}
                  alt={preview.filename ?? "Documento"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <iframe
                  src={preview.signedUrl}
                  title={preview.filename ?? "Documento"}
                  className="h-full w-full border-0"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <FileText className="h-8 w-8" />
                Selecciona un documento con archivo para visualizarlo.
              </div>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              {isImagePreview(preview) ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Datos principales
            </div>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {detailFields.map((field) => (
                <DetailRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  className={field.wide ? "xl:col-span-2" : ""}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
}
