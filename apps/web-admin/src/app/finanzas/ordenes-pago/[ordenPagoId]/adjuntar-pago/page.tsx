"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { OrdenPagoAdjuntarPagoView } from "@/components/finanzas/OrdenPagoAdjuntarPagoView";
import { getOrdenPago } from "@/services/finanzas";
import { getContexto } from "@/lib/auth-storage";

export default function OrdenPagoAdjuntarPagoPage() {
  const params = useParams<{ ordenPagoId: string }>();
  const contexto = getContexto();
  const id = Number(params.ordenPagoId);
  const idValido = typeof params.ordenPagoId === "string" && /^\d+$/.test(params.ordenPagoId) && Number.isSafeInteger(id) && id > 0;
  const consulta = useQuery({
    queryKey: ["orden-pago-detalle", contexto?.workspaceId, contexto?.sub, id],
    queryFn: () => getOrdenPago(id),
    enabled: idValido && !!contexto?.workspaceId,
  });

  if (!idValido) return <main><p role="alert">Orden de Pago no disponible.</p></main>;
  if (!contexto?.workspaceId) return <main><p role="alert">Seleccione un contexto para consultar la Orden de Pago.</p></main>;
  if (consulta.isPending) return <main><p role="status">Cargando Orden de Pago…</p></main>;
  if (consulta.isError || !consulta.data) {
    const status = (consulta.error as { response?: { status?: number } } | null)?.response?.status;
    return <main><p role="alert">{status === 404 ? "Orden de Pago no disponible." : "No se pudo cargar la Orden de Pago."}</p></main>;
  }

  // Conserva la respuesta completa (incluido grupoFacturaId) para la futura lectura de pagos.
  const detalle = consulta.data;

  return (
    <OrdenPagoAdjuntarPagoView
      ordenPagoId={String(detalle.ordenPagoId)}
      resumen={{
        codigo: detalle.numero,
        centroCostoCodigo: detalle.contexto.centroCostoCodigo ?? detalle.contexto.codigo,
        centroCostoDescripcion: detalle.contexto.nombre,
        tipo: detalle.tipo,
        subtipo: detalle.subtipo,
        fechaEmision: detalle.fechaEmision,
        moneda: detalle.moneda,
        monto: detalle.monto,
      }}
      sustentoOrden={detalle.archivoInicial ? {
        archivoId: detalle.archivoInicial.archivoId,
        nombre: detalle.archivoInicial.nombreArchivo,
        tipo: detalle.archivoInicial.mime,
        visualizable: Number.isSafeInteger(detalle.archivoInicial.archivoId) && detalle.archivoInicial.archivoId > 0,
      } : null}
    />
  );
}
