import { api } from "./api";
import type {
  Expediente,
  ExpedienteEstadoDocumental,
  ExpedienteResumen,
  ExpedienteTimelineItem,
} from "@/types/expediente";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

export type ExpedientesQuery = {
  empresa?: string;
  estado?: string;
  limit?: number;
  offset?: number;
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

export async function getExpedientes(params: ExpedientesQuery = {}) {
  const { data } = await api.get<ApiEnvelope<Expediente[]> | Expediente[]>(
    "/expedientes",
    {
      params: {
        empresa: params.empresa ?? "BBTI",
        estado: params.estado ?? "abierto",
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      },
    },
  );

  return unwrap<Expediente[]>(data);
}

export async function getExpediente(id: number | string) {
  const { data } = await api.get<ApiEnvelope<Expediente> | Expediente>(
    `/expedientes/${id}`,
  );

  return unwrap<Expediente>(data);
}

export async function getExpedienteResumen(id: number | string) {
  const { data } = await api.get<
    ApiEnvelope<ExpedienteResumen> | ExpedienteResumen
  >(`/expedientes/${id}/resumen`);

  return unwrap<ExpedienteResumen>(data);
}

export async function getExpedienteTimeline(id: number | string) {
  const { data } = await api.get<
    ApiEnvelope<ExpedienteTimelineItem[]> | ExpedienteTimelineItem[]
  >(`/expedientes/${id}/timeline`);

  return unwrap<ExpedienteTimelineItem[]>(data);
}

export async function getExpedienteEstadoDocumental(id: number | string) {
  const { data } = await api.get<
    ApiEnvelope<ExpedienteEstadoDocumental> | ExpedienteEstadoDocumental
  >(`/expedientes/${id}/estado-documental`);

  return unwrap<ExpedienteEstadoDocumental>(data);
}

export async function getExpedienteDocumentos(id: number | string) {
  const { data } = await api.get<ApiEnvelope<unknown[]>>(
    `/expedientes/${id}/documentos`,
  );

  return unwrap(data);
}

export async function getExpedienteAlertas(id: number | string) {
  const { data } = await api.get<ApiEnvelope<unknown[]>>(
    `/expedientes/${id}/alertas`,
  );

  return unwrap(data);
}

