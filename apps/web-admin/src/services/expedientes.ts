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

export async function getExpedientes() {
  const { data } = await api.get<ApiEnvelope<Expediente[]> | Expediente[]>(
    "/expedientes",
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
