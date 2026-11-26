import { api } from "./api";
import { getAuthSession } from "@/lib/auth-storage";
import type { AuthSession } from "@/types/auth";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: unknown;
};

export type ExpedienteMantenimientoEstado =
  | "abierto"
  | "cerrado"
  | "observado"
  | "anulado"
  | string;

export type ExpedienteMantenimiento = {
  id: number | string;
  expedienteId?: number | string;
  empresa?: string | null;
  empresaCodigo?: string | null;
  empresa_codigo?: string | null;
  empresaAbreviatura?: string | null;
  empresa_abreviatura?: string | null;
  codigoExpediente?: string | null;
  codigo_expediente?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  clienteDestino?: string | null;
  cliente_destino?: string | null;
  clienteDestinoId?: number | string | null;
  cliente_destino_id?: number | string | null;
  clienteDestinoNombre?: string | null;
  cliente_destino_nombre?: string | null;
  clienteDestinoAbreviatura?: string | null;
  cliente_destino_abreviatura?: string | null;
  clienteAbreviatura?: string | null;
  cliente_abreviatura?: string | null;
  clienteNombre?: string | null;
  cliente_nombre?: string | null;
  clienteRuc?: string | null;
  totalDocumentos?: number | string | null;
  tieneDocumentoPrincipal?: boolean | null;
  estado?: ExpedienteMantenimientoEstado | null;
  creadoPor?: number | string | null;
  actualizadoPor?: number | string | null;
  anuladoEn?: string | null;
  anuladoPor?: number | string | null;
  motivoAnulacion?: string | null;
  creadoEn?: string | null;
  creado_en?: string | null;
  actualizadoEn?: string | null;
  actualizado_en?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ExpedientesMantenimientoQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type ExpedientesMantenimientoResponse = {
  items: ExpedienteMantenimiento[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters?: Record<string, unknown> | null;
};

export type CreateExpedienteMantenimientoPayload = {
  codigoExpediente: string;
  descripcion: string;
};

export type UpdateExpedienteMantenimientoPayload = {
  codigoExpediente: string;
  descripcion: string;
};

export type UpdateExpedienteEstadoPayload = {
  estado: ExpedienteMantenimientoEstado;
  motivoAnulacion?: string;
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

function normalizeList(payload: unknown): ExpedientesMantenimientoResponse {
  const current = unwrap<any>(payload as any);
  const rawItems = Array.isArray(current)
    ? current
    : Array.isArray(current?.items)
      ? current.items
      : Array.isArray(current?.rows)
        ? current.rows
        : Array.isArray(current?.data)
          ? current.data
          : Array.isArray(current?.results)
            ? current.results
            : [];

  const items = rawItems as ExpedienteMantenimiento[];
  const page = Number(current?.page ?? 1);
  const pageSize = Number(current?.pageSize ?? current?.limit ?? 50);
  const total = Number(current?.total ?? items.length);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Number(current?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))),
    hasNextPage: Boolean(current?.hasNextPage ?? false),
    hasPreviousPage: Boolean(current?.hasPreviousPage ?? page > 1),
    filters: current?.filters ?? null,
  };
}

export async function getExpedientesMantenimiento(
  params: ExpedientesMantenimientoQuery = {},
) {
  const { data } = await api.get("/expedientes/mantenimiento", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      q: params.q || undefined,
    },
  });

  return normalizeList(data);
}

export async function getExpedienteMantenimiento(id: number | string) {
  const { data } = await api.get<ApiEnvelope<ExpedienteMantenimiento> | ExpedienteMantenimiento>(
    `/expedientes/mantenimiento/${id}`,
  );

  return unwrap<ExpedienteMantenimiento>(data);
}

export async function createExpedienteMantenimiento(
  payload: CreateExpedienteMantenimientoPayload,
) {
  const { data } = await api.post<ApiEnvelope<ExpedienteMantenimiento> | ExpedienteMantenimiento>(
    "/expedientes/mantenimiento",
    payload,
  );

  return unwrap<ExpedienteMantenimiento>(data);
}

export async function updateExpedienteMantenimiento(
  id: number | string,
  payload: UpdateExpedienteMantenimientoPayload,
) {
  const { data } = await api.patch<ApiEnvelope<ExpedienteMantenimiento> | ExpedienteMantenimiento>(
    `/expedientes/mantenimiento/${id}`,
    payload,
  );

  return unwrap<ExpedienteMantenimiento>(data);
}

export async function updateExpedienteMantenimientoEstado(
  id: number | string,
  payload: UpdateExpedienteEstadoPayload,
) {
  const { data } = await api.patch<ApiEnvelope<ExpedienteMantenimiento> | ExpedienteMantenimiento>(
    `/expedientes/mantenimiento/${id}/estado`,
    payload,
  );

  return unwrap<ExpedienteMantenimiento>(data);
}


export type ExpedientesImportacionResultado = {
  importacionId: string;
  solicitudId: string;
  empresaCodigo: string;
  clienteDestinoId: number;
  totalRegistros: number;
  registrosInsertados: number;
  registrosExistentes: number;
  registrosDuplicadosCsv: number;
  registrosModificados: number;
  estado: string;
  storageProvider: "R2" | "NAS" | null;
  nasEstado: string;
};

export function mismaSesionImportacion(
  original: AuthSession,
  actual: AuthSession | null,
): boolean {
  if (!actual) return false;

  const a = original.contexto;
  const b = actual.contexto;

  return (
    original.accessToken === actual.accessToken &&
    a.sub === b.sub &&
    a.workspaceId === b.workspaceId &&
    a.empresa === b.empresa &&
    Number(a.clienteDestinoId) === Number(b.clienteDestinoId) &&
    a.sessionContextId === b.sessionContextId &&
    a.perfil === b.perfil
  );
}

export async function importarExpedientesCsv(
  archivo: File,
  solicitudId: string,
  sesionOriginal: AuthSession,
): Promise<ExpedientesImportacionResultado> {
  const actual = getAuthSession();

  if (!mismaSesionImportacion(sesionOriginal, actual)) {
    throw new Error(
      "El contexto de sesión cambió. Cierre el modal y vuelva a seleccionar el CSV.",
    );
  }

  const formData = new FormData();

  formData.append("archivo", archivo);
  formData.append("solicitudId", solicitudId);

  const { data } = await api.post<
    ApiEnvelope<ExpedientesImportacionResultado> |
    ExpedientesImportacionResultado
  >(
    "/expedientes/mantenimiento/importar-csv",
    formData,
    {
      headers: {
        Authorization: `Bearer ${sesionOriginal.accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return unwrap<ExpedientesImportacionResultado>(data);
}
