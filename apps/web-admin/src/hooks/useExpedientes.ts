import { useQuery } from "@tanstack/react-query";

import {
  getExpediente,
  getExpedienteEstadoDocumental,
  getExpedienteResumen,
  getExpedientes,
  getExpedienteTimeline,
} from "@/services/expedientes";

export function useExpedientes() {
  return useQuery({
    queryKey: ["expedientes"],
    queryFn: getExpedientes,
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
