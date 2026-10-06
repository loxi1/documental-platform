import { api } from "@/services/api";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type TipoPersonaProveedor = "NATURAL" | "JURIDICA";

export type ProveedorMantenimiento = {
  id: number;
  ruc: string;
  razonSocial: string;
  direccion?: string | null;
  tipoPersona: TipoPersonaProveedor;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
};

export type ProveedoresMantenimientoQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ProveedoresMantenimientoResponse = {
  items: ProveedorMantenimiento[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters?: {
    q?: string | null;
  };
};

export type ProveedorMantenimientoPayload = {
  ruc: string;
  razonSocial: string;
  direccion?: string | null;
  tipoPersona: TipoPersonaProveedor;
};

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in payload
  ) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.data !== undefined) return envelope.data;
  }

  return payload as T;
}

function normalizeList(
  payload: ApiEnvelope<ProveedoresMantenimientoResponse> | ProveedoresMantenimientoResponse,
): ProveedoresMantenimientoResponse {
  const data = unwrap(payload);

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? 1),
    pageSize: Number(data?.pageSize ?? 50),
    totalPages: Math.max(1, Number(data?.totalPages ?? 1)),
    hasNextPage: Boolean(data?.hasNextPage),
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    filters: data?.filters,
  };
}

export async function getProveedoresMantenimiento(
  query: ProveedoresMantenimientoQuery = {},
): Promise<ProveedoresMantenimientoResponse> {
  const response = await api.get("/documentos/proveedores/mantenimiento", {
    params: query,
  });

  return normalizeList(response.data);
}

export async function getProveedorMantenimiento(
  id: number | string,
): Promise<ProveedorMantenimiento> {
  const response = await api.get(
    `/documentos/proveedores/mantenimiento/${encodeURIComponent(String(id))}`,
  );

  return unwrap(response.data);
}

export async function createProveedorMantenimiento(
  payload: ProveedorMantenimientoPayload,
): Promise<ProveedorMantenimiento> {
  const response = await api.post(
    "/documentos/proveedores/mantenimiento",
    payload,
  );

  return unwrap(response.data);
}

export async function updateProveedorMantenimiento(
  id: number | string,
  payload: ProveedorMantenimientoPayload,
): Promise<ProveedorMantenimiento> {
  const response = await api.patch(
    `/documentos/proveedores/mantenimiento/${encodeURIComponent(String(id))}`,
    payload,
  );

  return unwrap(response.data);
}
