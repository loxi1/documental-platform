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
  const { data } = await api.get(`/expedientes/${id}/resumen`);
  return unwrapDeep(data);
}

export async function getExpedienteTimeline(id: number | string) {
  const { data } = await api.get(`/expedientes/${id}/timeline`);
  return unwrapDeep(data);
}

export async function getExpedienteAlertas(_id: number | string) {
  return [];
}

export async function getExpedienteEstadoDocumental(id: number | string) {
  const { data } = await api.get(`/expedientes/${id}/estado-documental`);
  return unwrapDeep(data);
}

export async function getExpedienteDocumentos(id: number | string) {
  const { data } = await api.get(`/expedientes/${id}/documentos`);
  return unwrapDeep(data);
}

function arrayFromApi(value: unknown): any[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const obj = value as any;

    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.documentos)) return obj.documentos;
    if (Array.isArray(obj.results)) return obj.results;

    if (obj.data && typeof obj.data === "object") {
      if (Array.isArray(obj.data.items)) return obj.data.items;
      if (Array.isArray(obj.data.documentos)) return obj.data.documentos;
      if (Array.isArray(obj.data.results)) return obj.data.results;
    }
  }

  return [];
}

function sameId(a: unknown, b: unknown) {
  return String(a ?? "") === String(b ?? "");
}

function unwrapDeep(value: any): any {
  let current = value;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data !== current
  ) {
    current = current.data;
  }

  return current;
}

