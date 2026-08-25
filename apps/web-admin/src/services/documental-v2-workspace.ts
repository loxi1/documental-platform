import { api } from "@/services/api";
import type {
  AnularEntidadV2Request,
  AnularEntidadV2Result,
  ApiEnvelope,
  AsociarDocumentoGrupoFacturaV2Request,
  AsociarDocumentoGrupoFacturaV2Result,
  AsociarDocumentoPrincipalV2Request,
  AsociarDocumentoPrincipalV2Result,
  DocumentoGrupoFacturaCandidatoV2,
  DocumentoPrincipalCandidato,
  GetDocumentosCandidatosGrupoFacturaParams,
  GetDocumentosCandidatosPrincipalParams,
  WorkspaceDocumentalV2,
} from "@/types/documental-v2-workspace";

function unwrapWorkspace(payload: unknown): WorkspaceDocumentalV2 {
  let current = payload as any;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data !== undefined &&
    current.data !== current
  ) {
    current = current.data;
  }

  if (current && typeof current === "object" && "workspace" in current && current.workspace) {
    return current.workspace as WorkspaceDocumentalV2;
  }

  return (current ?? {}) as WorkspaceDocumentalV2;
}

export async function getWorkspaceDocumentalV2(id: string | number) {
  const { data } = await api.get<ApiEnvelope<WorkspaceDocumentalV2> | WorkspaceDocumentalV2>(
    `/documental-v2/workspace/expedientes-v1/${id}`,
  );

  return unwrapWorkspace(data);
}


function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? fallback) as T;
  }

  return (payload ?? fallback) as T;
}

export async function getDocumentosCandidatosPrincipal(params: GetDocumentosCandidatosPrincipalParams) {
  const { data } = await api.get<ApiEnvelope<DocumentoPrincipalCandidato[]> | DocumentoPrincipalCandidato[]>(
    "/documental-v2/documentos-candidatos-principal",
    { params },
  );

  return unwrapData<DocumentoPrincipalCandidato[]>(data, []);
}

export async function asociarDocumentoPrincipalV2(payload: AsociarDocumentoPrincipalV2Request) {
  const { data } = await api.post<ApiEnvelope<AsociarDocumentoPrincipalV2Result> | AsociarDocumentoPrincipalV2Result>(
    "/documental-v2/documentos-operativos-principales/asociar",
    payload,
  );

  return unwrapData<AsociarDocumentoPrincipalV2Result>(data, {
    documentoOperativoPrincipal: {
      id: "",
      contenedorOperativoId: payload.contenedorOperativoId,
      documentoId: payload.documentoId,
      tipoPrincipal: payload.tipoPrincipal,
      estado: "activo",
    },
    idempotente: false,
    workspaceDebeRefrescar: true,
  });
}

export async function getDocumentosCandidatosGrupoFacturaV2(params: GetDocumentosCandidatosGrupoFacturaParams) {
  const { data } = await api.get<ApiEnvelope<DocumentoGrupoFacturaCandidatoV2[]> | DocumentoGrupoFacturaCandidatoV2[]>(
    "/documental-v2/documentos-candidatos-grupo",
    { params },
  );

  return unwrapData<DocumentoGrupoFacturaCandidatoV2[]>(data, []);
}

export type GrupoFacturaDocumentoVinculoV2 = {
  grupoFacturaId?: string | number | null;
  grupo_factura_id?: string | number | null;
  documentoId?: string | number | null;
  documento_id?: string | number | null;
  tipoRelacion?: string | null;
  tipo_relacion?: string | null;
  estado?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export async function getGrupoFacturaDocumentosV2(
  grupoFacturaId: string | number,
): Promise<GrupoFacturaDocumentoVinculoV2[]> {
  const { data } = await api.get<
    ApiEnvelope<GrupoFacturaDocumentoVinculoV2[]> | GrupoFacturaDocumentoVinculoV2[]
  >(`/documental-v2/grupos-factura/${grupoFacturaId}/documentos`);

  return unwrapData<GrupoFacturaDocumentoVinculoV2[]>(data, []);
}

export async function getDocumentoDetalleV2(
  documentoId: string | number,
): Promise<Record<string, unknown> | null> {
  const { data } = await api.get<
    ApiEnvelope<Record<string, unknown>> | Record<string, unknown>
  >(`/documentos/${documentoId}`);

  return unwrapData<Record<string, unknown> | null>(data, null);
}

export async function asociarDocumentoGrupoFacturaV2(payload: AsociarDocumentoGrupoFacturaV2Request) {
  const { data } = await api.post<
    ApiEnvelope<AsociarDocumentoGrupoFacturaV2Result> | AsociarDocumentoGrupoFacturaV2Result
  >("/documental-v2/grupos-factura/documentos/asociar", payload);

  return unwrapData<AsociarDocumentoGrupoFacturaV2Result>(data, {
    documentoGrupoFactura: {
      id: "",
      grupoFacturaId: payload.grupoFacturaId,
      documentoId: payload.documentoId,
      tipoRelacion: payload.tipoRelacion,
      estado: "activo",
    },
    idempotente: false,
    workspaceDebeRefrescar: true,
  });
}

export async function anularDocumentoOperativoPrincipalV2(
  id: string | number,
  payload: AnularEntidadV2Request,
) {
  const { data } = await api.post<ApiEnvelope<AnularEntidadV2Result> | AnularEntidadV2Result>(
    `/documental-v2/documentos-operativos-principales/${id}/anular`,
    payload,
  );

  return unwrapData<AnularEntidadV2Result>(data, {
    id,
    estado: "anulado",
    workspaceDebeRefrescar: true,
  });
}

export async function anularGrupoFacturaV2(
  id: string | number,
  payload: AnularEntidadV2Request,
) {
  const { data } = await api.post<ApiEnvelope<AnularEntidadV2Result> | AnularEntidadV2Result>(
    `/documental-v2/grupos-factura/${id}/anular`,
    payload,
  );

  return unwrapData<AnularEntidadV2Result>(data, {
    id,
    estado: "anulado",
    workspaceDebeRefrescar: true,
  });
}

export async function anularGrupoFacturaDocumentoV2(
  id: string | number,
  payload: AnularEntidadV2Request,
) {
  const { data } = await api.post<ApiEnvelope<AnularEntidadV2Result> | AnularEntidadV2Result>(
    `/documental-v2/grupo-factura-documentos/${id}/anular`,
    payload,
  );

  return unwrapData<AnularEntidadV2Result>(data, {
    id,
    estado: "anulado",
    workspaceDebeRefrescar: true,
  });
}

export type FinanzasCorrespondenciaComparacion = {
  estado?: string | null;
  resultado?: string | null;
  factura?: string | number | null;
  pago?: string | number | null;
  sustento?: string | number | null;
  facturaValor?: string | number | null;
  sustentoValor?: string | number | null;
  valorFactura?: string | number | null;
  valorSustento?: string | number | null;
  detalle?: string | null;
  mensaje?: string | null;
};

export type FinanzasCorrespondenciaEvaluacion = {
  estadoGeneral?: string | null;
  estado?: string | null;
  requiereDecisionHumana?: boolean | null;
  requiere_decision_humana?: boolean | null;
  permiteAsociacionOrdinaria?: boolean | null;
  permite_asociacion_ordinaria?: boolean | null;
  advertencias?: string[] | null;
  comparaciones?: {
    proveedor?: FinanzasCorrespondenciaComparacion | null;
    moneda?: FinanzasCorrespondenciaComparacion | null;
    importe?: FinanzasCorrespondenciaComparacion | null;
    documentoReferenciado?: FinanzasCorrespondenciaComparacion | null;
    documento_referenciado?: FinanzasCorrespondenciaComparacion | null;
  } | null;
};

export async function evaluarCorrespondenciaPagoFactura(params: {
  facturaDocumentoId: string | number;
  pagoDocumentoId: string | number;
}): Promise<FinanzasCorrespondenciaEvaluacion> {
  const { data } = await api.get("/documental-v2/finanzas/correspondencia/evaluar", {
    params: {
      facturaDocumentoId: params.facturaDocumentoId,
      pagoDocumentoId: params.pagoDocumentoId,
    },
  });

  return (data?.data ?? data) as FinanzasCorrespondenciaEvaluacion;
}
