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

export type ExpedientesPage = {
  total: number;
  limit: number;
  offset: number;
  data: Expediente[];
  detailErrors: Array<number | string>;
};

type ExpedientesPagePayload = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: Expediente[];
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
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

  return current as T;
}


function unwrapEnvelopeOnce<T>(payload: ApiEnvelope<T> | T): T {
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

export async function enriquecerExpedientes(
  expedientes: Expediente[],
): Promise<{ data: Expediente[]; detailErrors: Array<number | string> }> {
  const results = await Promise.allSettled(
    expedientes.map(async (expediente) => {
      const detalle = await getExpediente(expediente.id);
      return {
        ...expediente,
        ...detalle,
      } as Expediente;
    }),
  );

  const detailErrors: Array<number | string> = [];
  const data = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    detailErrors.push(expedientes[index]?.id ?? `fila-${index}`);
    return expedientes[index];
  });

  return { data, detailErrors };
}


export type CrearExpedientePayload = {
  clienteDestinoId: number | string;
  empresaCodigo: string;
  codigoExpediente: string;
  descripcion?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function crearExpediente(payload: CrearExpedientePayload) {
  const { data } = await api.post<ApiEnvelope<Expediente> | Expediente>(
    "/expedientes",
    payload,
  );

  return unwrap<Expediente>(data);
}

export type ExpedienteSearchResult = {
  id: number | string;
  codigoExpediente: string;
  descripcion?: string | null;
  empresaCodigo: string;
  clienteDestinoId?: number | string | null;
  clienteNombre?: string | null;
  clienteAbreviatura?: string | null;
  clienteRuc?: string | null;
  estado?: string | null;
  documentos?: number;
  alertas?: number;
};

export async function buscarExpedientes(q: string, limit = 10) {
  const { data } = await api.get<
    ApiEnvelope<{ data?: ExpedienteSearchResult[]; total?: number }> | { data?: ExpedienteSearchResult[]; total?: number } | ExpedienteSearchResult[]
  >("/expedientes/buscar", {
    params: { q, limit },
  });

  const unwrapped = unwrap<any>(data);

  if (Array.isArray(unwrapped)) {
    return unwrapped as ExpedienteSearchResult[];
  }

  return (unwrapped?.data ?? []) as ExpedienteSearchResult[];
}

export async function getExpedientesPage(
  params: ExpedientesQuery = {},
): Promise<ExpedientesPage> {
  const requestedLimit = params.limit ?? 20;
  const requestedOffset = params.offset ?? 0;

  const { data } = await api.get<
    ApiEnvelope<ExpedientesPagePayload> | ExpedientesPagePayload
  >("/expedientes", {
    params: {
      empresa: params.empresa ?? "BBTI",
      estado: params.estado ?? "abierto",
      limit: requestedLimit,
      offset: requestedOffset,
    },
  });

  const page = unwrapEnvelopeOnce<ExpedientesPagePayload>(data);
  const summaries = Array.isArray(page?.data) ? page.data : [];
  const enriched = await enriquecerExpedientes(summaries);

  return {
    total: Number(page?.total ?? summaries.length),
    limit: Number(page?.limit ?? requestedLimit),
    offset: Number(page?.offset ?? requestedOffset),
    data: enriched.data,
    detailErrors: enriched.detailErrors,
  };
}

export async function getExpedientes(params: ExpedientesQuery = {}) {
  const page = await getExpedientesPage(params);
  return page.data;
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

export async function getExpedienteAlertas(id: number | string) {
  try {
    const { data } = await api.get(`/expedientes/${id}/alertas`);
    return unwrapDeep(data);
  } catch {
    return [];
  }
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

function unwrapDeep<T = any>(payload: unknown): T {
  let current = payload as any;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data !== current
  ) {
    current = current.data;
  }

  return current as T;
}

// Compras: bandeja OC/OS-céntrica read-only.
export type BandejaComprasQuery = {
  empresa?: string;
  estado?: string;
  q?: string;
  limit?: number;
  offset?: number;
  incluirPendientesValidacion?: boolean;
};

export type BandejaComprasFactura = {
  documentoId: string | number;
  serie?: string | null;
  numero?: string | null;
  grupoFacturaId: string | number;
};

export type BandejaComprasPrincipal = {
  documentoId: string | number;
  tipo?: string | null;
  tipoDocumental?: string | null;
  numero?: string | null;
  proveedor?: string | null;
  proveedorNombre?: string | null;
  ruc?: string | null;
  proveedorRuc?: string | null;
};

export type BandejaComprasProveedor = {
  ruc?: string | null;
  nombre?: string | null;
};

export type BandejaComprasFila = {
  expedienteId: string | number;
  codigoExpediente?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  ocrResultadoId?: number | string | null;
  principal: BandejaComprasPrincipal;
  proveedor?: BandejaComprasProveedor | null;
  facturas: BandejaComprasFactura[];
};

export type BandejaComprasPage = {
  total: number;
  limit: number;
  offset: number;
  data: BandejaComprasFila[];
};

export async function obtenerBandejaCompras(
  params: BandejaComprasQuery = {},
): Promise<BandejaComprasPage> {
  const response = await api.get("/expedientes/bandeja-compras", { params });

  let payload: unknown = response.data;

  for (let depth = 0; depth < 4; depth += 1) {
    if (
      payload &&
      typeof payload === "object" &&
      "total" in payload &&
      "limit" in payload &&
      "offset" in payload &&
      "data" in payload &&
      Array.isArray((payload as { data?: unknown }).data)
    ) {
      return payload as BandejaComprasPage;
    }

    if (payload && typeof payload === "object" && "data" in payload) {
      payload = (payload as { data?: unknown }).data;
      continue;
    }

    break;
  }

  throw new Error("Respuesta inválida de GET /expedientes/bandeja-compras");
}
