import { api } from "@/services/api";
import type {
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
