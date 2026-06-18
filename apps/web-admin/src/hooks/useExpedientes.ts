import { useQuery } from "@tanstack/react-query";

import {
  getExpediente,
  getExpedienteEstadoDocumental,
  getExpedienteResumen,
  getExpedientes,
  getExpedienteTimeline,
  type ExpedientesQuery,
} from "@/services/expedientes";

export function useExpedientes(params: ExpedientesQuery = {}) {
  return useQuery({
    queryKey: ["expedientes", params],
    queryFn: () => getExpedientes(params),
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
