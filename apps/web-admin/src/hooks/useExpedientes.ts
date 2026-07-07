import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth-storage";

import {
  getExpediente,
  getExpedienteAlertas,
  getExpedienteDocumentos,
  getExpedienteEstadoDocumental,
  getExpedienteResumen,
  getExpedientes,
  getExpedienteTimeline,
  type ExpedientesQuery,
} from "@/services/expedientes";

export function useExpedientes(params: ExpedientesQuery = {}) {
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken());

  return useQuery({
    queryKey: ["expedientes", params],
    queryFn: () => getExpedientes(params),
    enabled: hasToken,
  });
}

export function useExpediente(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id],
    queryFn: () => getExpediente(id as string | number),
    enabled: Boolean(id),
  });
}

export function useExpedienteResumen(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id, "resumen"],
    queryFn: () => getExpedienteResumen(id as string | number),
    enabled: Boolean(id),
  });
}

export function useExpedienteTimeline(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id, "timeline"],
    queryFn: () => getExpedienteTimeline(id as string | number),
    enabled: Boolean(id),
  });
}

export function useExpedienteEstadoDocumental(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id, "estado-documental"],
    queryFn: () => getExpedienteEstadoDocumental(id as string | number),
    enabled: Boolean(id),
  });
}


export function useExpedienteDocumentos(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id, "documentos"],
    queryFn: () => getExpedienteDocumentos(id as string | number),
    enabled: Boolean(id),
  });
}

export function useExpedienteAlertas(id?: string | number) {
  return useQuery({
    queryKey: ["expedientes", id, "alertas"],
    queryFn: () => getExpedienteAlertas(id as string | number),
    enabled: Boolean(id),
  });
}