"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";

import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentoArchivosVersionesResponse, DocumentoArchivoVersion } from "@/services/documentos";
import type { GrupoFacturaDocumentoVinculoV2 } from "@/services/documental-v2-workspace";
import type { OrdenPagoDetalle } from "@/services/finanzas";

type UnknownRecord = Record<string, unknown>;
type PreviewState = { archivoId: number | string; title: string } | null;
type SustentoOrden = { archivoId: number; nombre: string; tipo: string };

type Props = {
  detalle: OrdenPagoDetalle;
  archivosResponse: DocumentoArchivosVersionesResponse | null;
  archivosLoading: boolean;
  archivosError: boolean;
  documentosGrupo: GrupoFacturaDocumentoVinculoV2[];
  documentosGrupoLoading: boolean;
  documentosGrupoError: boolean;
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

function documentoEconomicoResumen(item: GrupoFacturaDocumentoVinculoV2) {
  const tipo = tipoEconomico(item);
  const serie = text(pickFromSources(item, ["serie"]), "");
  const numero = text(pickFromSources(item, ["numero", "numeroDocumento", "numero_documento"]), "");
  const archivoIdRaw = pickFromSources(item, ["archivoId", "archivo_id", "archivoActualId", "archivo_actual_id"]);
  const archivoId = Number(archivoIdRaw);
  return {
    tipo,
    label: tipo === "RECIBO_HONORARIO" ? "RECIBO POR HONORARIOS" : "FACTURA",
    numero: serie && numero ? `${serie}-${numero}` : numero || serie || "—",
    ruc: text(pickFromSources(item, ["rucEmisor", "ruc_emisor", "rucProveedor", "ruc_proveedor"]), ""),
    fecha: text(pickFromSources(item, ["fechaEmision", "fecha_emision", "fecha"]), ""),
    monto: text(pickFromSources(item, ["montoTotal", "monto_total", "monto"]), ""),
    moneda: text(pickFromSources(item, ["moneda"]), ""),
    nombreArchivo: text(pickFromSources(item, ["nombreArchivo", "nombre_archivo", "filename"]), ""),
    archivoId: Number.isSafeInteger(archivoId) && archivoId > 0 ? archivoId : null,
  };
}

function soporteDesdeArchivo(archivo: DocumentoArchivoVersion): SustentoOrden {
  return {
    archivoId: archivo.id,
    nombre: text(archivo.nombre_archivo, `Archivo ${archivo.id}`),
    tipo: text(firstValue(archivo.tipo_version, archivo.origen_archivo), ""),
  };
}

function formatDate(value: string) {
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

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm">{value || "—"}</div>
    </div>
  );
}

export function OrdenPagoVerView({
  detalle,
  archivosResponse,
  archivosLoading,
  archivosError,
  documentosGrupo,
  documentosGrupoLoading,
  documentosGrupoError,
}: Props) {
  const [preview, setPreview] = useState<PreviewState>(null);

  const documentosEconomicos = useMemo(
    () => documentosGrupo.filter((item) => TIPOS_ECONOMICOS.has(tipoEconomico(item))).slice(0, 1),
    [documentosGrupo],
  );

  const sustentos = useMemo(() => {
    const unique = new Map<number, SustentoOrden>();
    const archivos = archivosResponse?.data ?? archivosResponse?.archivos ?? [];
    for (const archivo of archivos) {
      if (!Number.isSafeInteger(archivo.id) || archivo.id <= 0) continue;
      unique.set(archivo.id, soporteDesdeArchivo(archivo));
    }
    const inicial = detalle.archivoInicial;
    if (inicial && Number.isSafeInteger(inicial.archivoId) && inicial.archivoId > 0 && !unique.has(inicial.archivoId)) {
      unique.set(inicial.archivoId, {
        archivoId: inicial.archivoId,
        nombre: text(inicial.nombreArchivo, `Archivo ${inicial.archivoId}`),
        tipo: text(inicial.mime, ""),
      });
    }
    return [...unique.values()];
  }, [archivosResponse, detalle.archivoInicial]);

  const codigo = `OP-${detalle.ordenPagoId}`;
  const centroCodigo = text(detalle.contexto?.centroCostoCodigo, "");
  const contextoNombre = text(detalle.contexto?.nombre, "");

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Orden de Pago</p>
          <h1 className="mt-1 text-2xl font-semibold">{codigo}</h1>
          {centroCodigo || contextoNombre ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {centroCodigo ? `Centro ${centroCodigo}` : "Centro"}{contextoNombre ? ` · ${contextoNombre}` : ""}
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline">
          <Link href="/finanzas"><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base uppercase tracking-wide">Documento principal</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-lg font-semibold">{codigo}</div>
            <div className="text-sm text-muted-foreground">Orden de pago</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Dato label="Centro de costo" value={centroCodigo} />
              <Dato label="Contexto" value={contextoNombre} />
              <Dato label="Tipo" value={text(detalle.tipo, "")} />
              <Dato label="Subtipo" value={text(detalle.subtipo, "")} />
              <Dato label="Fecha emisión" value={formatDate(text(detalle.fechaEmision, ""))} />
              <Dato label="Moneda" value={text(detalle.moneda, "")} />
              <Dato label="Monto" value={formatMonto(text(detalle.moneda, ""), text(detalle.monto, ""))} />
            </div>
            {text(detalle.observacion, "") ? (
              <div className="mt-4 border-t pt-4"><Dato label="Observación" value={text(detalle.observacion, "")} /></div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base uppercase tracking-wide">Documentos de la Orden de Pago</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Documento económico</h2>
              {documentosGrupoLoading ? <Skeleton className="mt-3 h-28 w-full" /> : documentosGrupoError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">No se pudieron cargar los documentos asociados al grupo.</div>
              ) : documentosEconomicos.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">Sin documento económico asociado.</div>
              ) : documentosEconomicos.map((item) => {
                const resumen = documentoEconomicoResumen(item);
                return (
                  <div key={`${resumen.tipo}-${text(item.documentoId ?? item.documento_id, "economico")}`} className="mt-3 rounded-lg border p-3">
                    <div className="font-semibold">{resumen.label}</div>
                    <div className="mt-1 text-sm">{resumen.numero}</div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {resumen.ruc ? <Dato label="RUC" value={resumen.ruc} /> : null}
                      {resumen.fecha ? <Dato label="Fecha" value={formatDate(resumen.fecha)} /> : null}
                      {resumen.monto || resumen.moneda ? <Dato label="Monto" value={formatMonto(resumen.moneda, resumen.monto)} /> : null}
                      {resumen.nombreArchivo ? <Dato label="Archivo" value={resumen.nombreArchivo} /> : null}
                    </div>
                    {resumen.archivoId ? (
                      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setPreview({ archivoId: resumen.archivoId!, title: resumen.label })}>
                        <Eye className="h-4 w-4" />Ver
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <section className="rounded-xl border p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Otros sustentos</h2>
              {archivosLoading ? <Skeleton className="mt-3 h-28 w-full" /> : null}
              {archivosError ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No se pudo cargar la colección de archivos de la Orden de Pago.</div> : null}
              {!archivosLoading && sustentos.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">Sin sustentos de la orden.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {sustentos.map((sustento) => (
                    <div key={sustento.archivoId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{sustento.nombre}</div>
                        {sustento.tipo ? <div className="text-xs text-muted-foreground">{sustento.tipo}</div> : null}
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setPreview({ archivoId: sustento.archivoId, title: sustento.nombre })}>
                        <Eye className="h-4 w-4" />Ver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>

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
