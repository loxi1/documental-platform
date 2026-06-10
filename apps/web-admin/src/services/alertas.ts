import { api } from "./api";
import type {
  CrearDocumentoAlertaPayload,
  DocumentoAlerta,
} from "@/types/alerta";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export async function getDocumentoAlertas(documentoId: number | string) {
  const { data } = await api.get<ApiEnvelope<DocumentoAlerta[]> | DocumentoAlerta[]>(
    `/documentos/${documentoId}/alertas`,
  );

  return unwrap<DocumentoAlerta[]>(data);
}

export async function crearDocumentoAlerta(
  documentoId: number | string,
  payload: CrearDocumentoAlertaPayload,
) {
  const { data } = await api.post<ApiEnvelope<DocumentoAlerta> | DocumentoAlerta>(
    `/documentos/${documentoId}/alertas`,
    payload,
  );

  return unwrap<DocumentoAlerta>(data);
}

export async function resolverDocumentoAlerta(
  documentoId: number | string,
  alertaId: number | string,
) {
  const { data } = await api.patch<ApiEnvelope<DocumentoAlerta> | DocumentoAlerta>(
    `/documentos/${documentoId}/alertas/${alertaId}/resolver`,
  );

  return unwrap<DocumentoAlerta>(data);
}
