import { AxiosError } from "axios";

import { api } from "./api";
import type {
  RevisionContableItem,
  RevisionContableParams,
  RevisionContableResponse,
} from "@/types/revision-contable";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T | ApiEnvelope<T>;
};

function isEnvelope(payload: unknown): payload is ApiEnvelope<unknown> {
  return (
    !!payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<unknown>).data !== undefined
  );
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  let current: unknown = payload;

  while (isEnvelope(current)) {
    current = current.data;
  }

  return current as T;
}

function normalizeRevisionContable(
  payload: RevisionContableItem[] | RevisionContableResponse,
  params: RevisionContableParams,
): RevisionContableResponse {
  if (Array.isArray(payload)) {
    return {
      empresa: params.empresa,
      anio: params.anio,
      mes: params.mes,
      items: payload,
    };
  }

  return {
    empresa: payload.empresa ?? params.empresa,
    anio: payload.anio ?? params.anio,
    mes: payload.mes ?? params.mes,
    diaCierreContable:
      payload.diaCierreContable ?? payload.dia_cierre_contable ?? null,
    fechaLimite: payload.fechaLimite ?? payload.fecha_limite ?? null,
    total: payload.total,
    totalFacturas: payload.totalFacturas,
    totalMonto: payload.totalMonto,
    totalAlertas: payload.totalAlertas,
    items: payload.items ?? [],
  };
}

export async function getRevisionContable(params: RevisionContableParams) {
  try {
    const { data } = await api.get<
      ApiEnvelope<RevisionContableResponse> | RevisionContableResponse
    >("/expedientes/bandeja-contable", {
      params,
    });

    return normalizeRevisionContable(unwrap<RevisionContableResponse>(data), params);
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;

    if (status && status !== 404) {
      throw error;
    }

    const { data } = await api.get<
      ApiEnvelope<RevisionContableItem[]> | RevisionContableItem[]
    >("/expedientes/revision-contable", {
      params,
    });

    return normalizeRevisionContable(unwrap<RevisionContableItem[]>(data), params);
  }
}