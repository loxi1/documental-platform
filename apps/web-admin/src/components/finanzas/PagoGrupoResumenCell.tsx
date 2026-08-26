"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";

import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { Button } from "@/components/ui/button";
import {
  getDocumentoDetalleV2,
  getGrupoFacturaDocumentosV2,
} from "@/services/documental-v2-workspace";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function deepFind(
  value: unknown,
  keys: readonly string[],
  depth = 0,
): unknown {
  if (depth > 5 || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFind(item, keys, depth + 1);
      if (found !== undefined && found !== null && found !== "") return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const found = record[key];
    if (found !== undefined && found !== null && found !== "") return found;
  }

  for (const nested of Object.values(record)) {
    const found = deepFind(nested, keys, depth + 1);
    if (found !== undefined && found !== null && found !== "") return found;
  }

  return undefined;
}

function normalizarGrupoId(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  return null;
}

function esPagoActivo(vinculo: Record<string, unknown>) {
  const estado = text(vinculo.estado).toLowerCase();
  const relacion = text(vinculo.tipoRelacion ?? vinculo.tipo_relacion).toLowerCase();

  return estado === "activo" && relacion === "adjunto_transferencia";
}

function documentoId(vinculo: Record<string, unknown>): string | number | null {
  const value = vinculo.documentoId ?? vinculo.documento_id;

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  return null;
}

function archivoIdDesdeDetalle(detalle: Record<string, unknown> | null) {
  if (!detalle) return null;

  const archivos = Array.isArray(detalle.archivos) ? detalle.archivos : [];
  const actual = archivos[0];

  if (!actual || typeof actual !== "object") return null;

  const value = (actual as Record<string, unknown>).id;

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  return null;
}

function numeroOperacion(vinculo: Record<string, unknown>) {
  const metadata =
    vinculo.metadata && typeof vinculo.metadata === "object"
      ? (vinculo.metadata as Record<string, unknown>)
      : null;

  const compatibilidad =
    metadata?.compatibilidad && typeof metadata.compatibilidad === "object"
      ? (metadata.compatibilidad as Record<string, unknown>)
      : null;

  const documentoV1 =
    compatibilidad?.documentoV1 &&
    typeof compatibilidad.documentoV1 === "object"
      ? (compatibilidad.documentoV1 as Record<string, unknown>)
      : null;

  const numeroDocumentoV1 = text(documentoV1?.numero);
  if (numeroDocumentoV1) return numeroDocumentoV1;

  return text(
    deepFind(vinculo, [
      "numeroOperacion",
      "numero_operacion",
      "codigoOperacion",
      "codigo_operacion",
    ]),
  );
}

export function PagoGrupoResumenCell({
  grupoFacturaId,
}: {
  grupoFacturaId: unknown;
}) {
  const grupoId = normalizarGrupoId(grupoFacturaId);
  const [preview, setPreview] = useState<{
    archivoId: string | number;
    title: string;
  } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | number | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function abrirPreviewPago(
    vinculo: Record<string, unknown>,
    operacion: string,
  ) {
    const id = documentoId(vinculo);
    if (id === null) {
      setPreviewError("El pago no tiene documento asociado para previsualizar.");
      return;
    }

    setPreviewError(null);
    setPreviewLoadingId(id);

    try {
      const detalle = await getDocumentoDetalleV2(id);
      const archivoId = archivoIdDesdeDetalle(detalle);

      if (archivoId === null) {
        setPreviewError("El pago no tiene archivo disponible para previsualizar.");
        return;
      }

      setPreview({
        archivoId,
        title: operacion ? `Pago · Op. ${operacion}` : `Pago · Documento ${id}`,
      });
    } catch {
      setPreviewError("No se pudo cargar el documento del pago.");
    } finally {
      setPreviewLoadingId(null);
    }
  }

  const query = useQuery({
    queryKey: [
      "finanzas-v2-grupos-pago",
      "bandeja",
      "vinculos-activos",
      String(grupoId ?? ""),
    ],
    enabled: grupoId !== null,
    queryFn: () => getGrupoFacturaDocumentosV2(grupoId as string | number),
    staleTime: 30_000,
  });

  if (grupoId === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (query.isLoading) {
    return <span className="text-xs text-muted-foreground">Consultando…</span>;
  }

  if (query.isError) {
    return (
      <span
        className="text-xs text-amber-700"
        title="No se pudo consultar el estado canónico de pagos del grupo"
      >
        No disponible
      </span>
    );
  }

  const pagos = (query.data ?? [])
    .map((item) => item as Record<string, unknown>)
    .filter(esPagoActivo);

  if (pagos.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const operaciones = pagos
    .map(numeroOperacion)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);

  return (
    <div
      className="min-w-[110px] leading-tight"
      title={`${pagos.length} ${pagos.length === 1 ? "pago activo" : "pagos activos"}`}
    >
      <div className="font-medium">
        {pagos.length} {pagos.length === 1 ? "pago" : "pagos"}
      </div>

      {pagos.slice(0, 2).map((pago, index) => {
        const operacion = numeroOperacion(pago);
        const id = documentoId(pago);

        return (
          <button
            key={`${String(id ?? "pago")}-${index}`}
            type="button"
            className="mt-0.5 block rounded-sm text-left text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={
              operacion
                ? `Previsualizar pago · Op. ${operacion}`
                : "Previsualizar pago"
            }
            disabled={id === null || previewLoadingId === id}
            onClick={() => void abrirPreviewPago(pago, operacion)}
          >
            {previewLoadingId === id
              ? "Abriendo…"
              : operacion
                ? `Op. ${operacion}`
                : `Pago ${index + 1}`}
          </button>
        );
      })}

      {pagos.length > 2 ? (
        <div className="mt-0.5 text-xs text-muted-foreground">
          +{pagos.length - 2} pago{pagos.length - 2 === 1 ? "" : "s"}
        </div>
      ) : null}

      {previewError ? (
        <div className="mt-1 max-w-[180px] text-xs text-amber-700">
          {previewError}
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${preview.title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreview(null);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa"
              onClick={() => setPreview(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={preview.archivoId}
              title={preview.title}
              className="max-h-[80vh]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
