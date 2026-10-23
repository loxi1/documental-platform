"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { OrdenPagoAdjuntarPagoView } from "@/components/finanzas/OrdenPagoAdjuntarPagoView";
import { getOrdenPago, getResumenFinancieroGrupo, getDocumentoEconomicoOp } from "@/services/finanzas";
import { getGrupoFacturaDocumentosV2 } from "@/services/documental-v2-workspace";
import { seleccionarRegularizadorActivo, documentoEconomicoResumen } from "@/components/finanzas/OrdenPagoVerView";
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

  const grupoFacturaId = Number(consulta.data?.grupoFacturaId);
  const grupoFacturaIdValido =
    Number.isSafeInteger(grupoFacturaId) && grupoFacturaId > 0;

  const resumenFinanciero = useQuery({
    queryKey: [
      "finanzas-resumen-grupo",
      contexto?.workspaceId,
      contexto?.sub,
      grupoFacturaId,
    ],
    queryFn: () => getResumenFinancieroGrupo(grupoFacturaId),
    enabled:
      idValido &&
      !!contexto?.workspaceId &&
      !!consulta.data &&
      !consulta.isError &&
      grupoFacturaIdValido,
  });

  const documentosGrupo = useQuery({
    queryKey: ["op-adjuntar-documentos-grupo", contexto?.workspaceId, contexto?.sub, grupoFacturaId],
    queryFn: () => getGrupoFacturaDocumentosV2(grupoFacturaId),
    enabled: idValido && !!contexto?.workspaceId && grupoFacturaIdValido && !consulta.isError,
  });
  const regularizador = seleccionarRegularizadorActivo(documentosGrupo.data ?? []);
  const regularizadorId = Number(regularizador?.documentoId ?? regularizador?.documento_id);
  const economico = useQuery({
    queryKey: ["op-adjuntar-documento-economico", contexto?.workspaceId, contexto?.sub, regularizadorId],
    queryFn: () => getDocumentoEconomicoOp(regularizadorId),
    enabled: !!contexto?.workspaceId && Number.isSafeInteger(regularizadorId) && regularizadorId > 0,
  });
  const documentoConfirmado = regularizador && economico.data &&
    Number(economico.data.documento.id) === regularizadorId &&
    String(economico.data.documento.estado).toLowerCase() === "confirmado" &&
    ["FACTURA", "RECIBO_HONORARIO"].includes(String(economico.data.documento.tipo_documental ?? economico.data.documento.tipoDocumental).toUpperCase());
  const documentoEconomico = documentoConfirmado ? documentoEconomicoResumen({
    ...regularizador, ...economico.data!.documento, estado: regularizador.estado,
    documento: economico.data!.documento,
    archivoId: economico.data!.actual?.id ?? null,
    archivo_id: null, archivoActualId: null, archivo_actual_id: null,
  }) : null;

  if (!idValido) return <main><p role="alert">Orden de Pago no disponible.</p></main>;
  if (!contexto?.workspaceId) return <main><p role="alert">Seleccione un contexto para consultar la Orden de Pago.</p></main>;
  if (consulta.isPending) return <main><p role="status">Cargando Orden de Pago…</p></main>;
  if (consulta.isError || !consulta.data) {
    const status = (consulta.error as { response?: { status?: number } } | null)?.response?.status;
    return <main><p role="alert">{status === 404 ? "Orden de Pago no disponible." : "No se pudo cargar la Orden de Pago."}</p></main>;
  }

  const detalle = consulta.data;

  if (!grupoFacturaIdValido) {
    return <main><p role="alert">Grupo financiero no disponible.</p></main>;
  }
  if (resumenFinanciero.isPending) {
    return <main><p role="status">Cargando resumen financiero…</p></main>;
  }
  if (resumenFinanciero.isError || !resumenFinanciero.data) {
    return <main><p role="alert">No se pudo cargar el resumen financiero.</p></main>;
  }

  const financiero = resumenFinanciero.data;

  return (
    <OrdenPagoAdjuntarPagoView
      ordenPagoId={String(detalle.ordenPagoId)}
      detalleDocumental={detalle}
      documentoEconomico={documentoEconomico}
      documentoEconomicoLoading={documentosGrupo.isFetching || economico.isFetching}
      documentoEconomicoError={documentosGrupo.isError || economico.isError}
      expedienteId={detalle.expedienteId}
      empresaCodigo={detalle.empresaCodigo}
      documentoBaseId={detalle.documentoId}
      grupoFacturaId={detalle.grupoFacturaId}
      resumen={{
        codigo: detalle.numero,
        centroCostoCodigo: detalle.contexto.centroCostoCodigo ?? detalle.contexto.codigo,
        centroCostoDescripcion: detalle.contexto.nombre,
        tipo: detalle.tipo,
        subtipo: detalle.subtipo,
        conceptoCodigo: detalle.conceptoCodigo,
        conceptoNombre: detalle.conceptoNombre,
        fechaEmision: detalle.fechaEmision,
        moneda: financiero.obligacion.moneda,
        monto: financiero.obligacion.monto,
        estadoPago: financiero.pago.estado,
        pagado: financiero.pago.pagado,
        saldo: financiero.pago.saldo,
      }}
      sustentos={[
        ...financiero.sustentosActivos,
        ...financiero.sustentosObservados,
        ...financiero.sustentosAnulados,
      ].map((item) => ({
        id: item.vinculoId ?? item.documentoId,
        vinculoId: item.vinculoId,
        archivoId: item.archivoId,
        documentoId: item.documentoId,
        ocrResultadoId: item.ocrResultadoId,
        fecha: item.fecha,
        banco: item.banco,
        referencia: item.numeroReferencia,
        monto: item.monto,
        moneda: item.moneda,
        estado:
          item.estado === "observado"
            ? "OBSERVADO"
            : item.estado === "anulado"
              ? "ANULADO"
              : "CONFIRMADO",
        observacion: item.estado === "observado" ? item.motivo : item.observacion,
        visualizable:
          Number.isSafeInteger(item.archivoId) && Number(item.archivoId) > 0,
      }))}
      sustentoOrden={detalle.archivoInicial ? {
        archivoId: detalle.archivoInicial.archivoId,
        nombre: detalle.archivoInicial.nombreArchivo,
        tipo: detalle.archivoInicial.mime,
        visualizable: Number.isSafeInteger(detalle.archivoInicial.archivoId) && detalle.archivoInicial.archivoId > 0,
      } : null}
    />
  );
}
