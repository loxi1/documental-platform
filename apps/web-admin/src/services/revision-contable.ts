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

export type RevisionContableOrdenPagoDetalle = {
  ordenPagoId: number;
  documentoId: number;
  grupoFacturaId: number;
  contenedorOperativoId: number;
  expedienteId: number | null;
  empresaCodigo: string | null;
  numero: string;
  fechaEmision: string | null;
  monto: string | number | null;
  moneda: string | null;
  estado: string | null;
  tipo: string | null;
  subtipo: string | null;
  conceptoCodigo: string | null;
  conceptoNombre: string | null;
  requiereRegularizacion: boolean | null;
  estadoRegularizacion: string | null;
  periodoAnio: number | null;
  periodoMes: number | null;
  codigoPago: string | null;
  proveedorId: number | null;
  proveedorRuc: string | null;
  proveedorRazonSocial: string | null;
  beneficiarioClienteDestinoId: number | null;
  beneficiarioUsuarioId: number | null;
  beneficiarioNombreLibre: string | null;
  observacion: string | null;
  tiposDocumentalesRegularizadoresPermitidos: string[];
  documentosRelacionados: Array<{
    grupoFacturaDocumentoId?: number | null;
    grupoFacturaId?: number | null;
    documentoId: number;
    tipoRelacion?: string | null;
    tipoDocumental?: string | null;
    serie?: string | null;
    numero?: string | null;
    estado?: string | null;
    fechaEmision?: string | null;
    moneda?: string | null;
    montoTotal?: string | number | null;
    claveDocumental?: string | null;
    metadata?: Record<string, unknown> | null;
    archivoId?: number | null;
    nombreArchivo?: string | null;
    archivoEstado?: string | null;
    storageProvider?: string | null;
  }>;
  contexto: {
    codigo?: string | null;
    nombre?: string | null;
    centroCostoCodigo?: string | null;
  } | null;
  archivoInicial: {
    archivoId: number;
    nombreArchivo?: string | null;
    mime?: string | null;
    tamanoBytes?: number | null;
    hashSha256?: string | null;
    storageKey?: string | null;
  } | null;
};

export async function getRevisionContableOrdenPago(
  ordenPagoId: number | string,
): Promise<RevisionContableOrdenPagoDetalle> {
  const { data } = await api.get<
    ApiEnvelope<RevisionContableOrdenPagoDetalle> |
    RevisionContableOrdenPagoDetalle
  >(`/expedientes/revision-contable/orden-pago/${ordenPagoId}`);

  return unwrap<RevisionContableOrdenPagoDetalle>(data);
}
