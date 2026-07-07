import { api } from "@/services/api";

export type EstadoRegistro = "activo" | "inactivo" | string;

export type UsuarioAcceso = {
  id: number | string;
  nombres: string;
  apellidos?: string | null;
  email: string;
  estado?: EstadoRegistro | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  actualizado_en?: string | null;
  actualizadoEn?: string | null;
};

export type PerfilAcceso = {
  id: number | string;
  codigo: string;
  nombre: string;
  sistema_id?: number | string | null;
  sistemaId?: number | string | null;
  sistema?: string | null;
  sistemaCodigo?: string | null;
  sistemaNombre?: string | null;
  estado?: EstadoRegistro | null;
  descripcion?: string | null;
  menus?: string[];
  actions?: string[];
};

export type WorkspaceAcceso = {
  id?: number | string;
  workspaceId?: number | string;
  usuario_id?: number | string;
  usuarioId?: number | string;
  usuario?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  empresa_codigo?: string | null;
  empresaCodigo?: string | null;
  empresa?: string | null;
  cliente_destino_id?: number | string | null;
  clienteDestinoId?: number | string | null;
  clienteNombre?: string | null;
  clienteAbreviatura?: string | null;
  sistema_id?: number | string | null;
  sistemaId?: number | string | null;
  sistema?: string | null;
  sistemaCodigo?: string | null;
  sistemaNombre?: string | null;
  perfil_id?: number | string | null;
  perfilId?: number | string | null;
  perfil?: string | null;
  perfilNombre?: string | null;
  estado?: EstadoRegistro | null;
  es_favorito?: boolean | null;
  esFavorito?: boolean | null;
  ultimo_uso_en?: string | null;
  ultimoUsoEn?: string | null;
  permission_version?: number | string | null;
  permissionVersion?: number | string | null;
  permisos?: {
    menus?: string[];
    actions?: string[];
  } | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

type CollectionEnvelope<T> = {
  data?: T[];
  total?: number;
};

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

function unwrapCollection<T>(payload: unknown): T[] {
  const first = unwrap<unknown>(payload as ApiEnvelope<unknown>);
  const second = unwrap<unknown>(first as ApiEnvelope<unknown>);

  if (Array.isArray(second)) return second as T[];

  if (second && typeof second === "object") {
    const record = second as CollectionEnvelope<T>;
    if (Array.isArray(record.data)) return record.data;
  }

  return [];
}

function sanitizeUsuario(usuario: UsuarioAcceso): UsuarioAcceso {
  const { password_hash: _passwordHash, passwordHash: _passwordHashCamel, token: _token, accessToken: _accessToken, refreshToken: _refreshToken, ...safe } = usuario as UsuarioAcceso & Record<string, unknown>;
  return safe;
}

export async function getUsuariosAcceso() {
  const response = await api.get("/auth/usuarios");
  return unwrapCollection<UsuarioAcceso>(response.data).map(sanitizeUsuario);
}

export async function getUsuarioAcceso(id: number | string) {
  const response = await api.get(`/auth/usuarios/${id}`);
  return sanitizeUsuario(unwrap<UsuarioAcceso>(response.data));
}

export async function getPerfilesAcceso() {
  const response = await api.get("/auth/perfiles");
  return unwrapCollection<PerfilAcceso>(response.data);
}

export async function getPerfilAcceso(id: number | string) {
  const response = await api.get(`/auth/perfiles/${id}`);
  return unwrap<PerfilAcceso>(response.data);
}

export async function getUsuarioWorkspacesAcceso() {
  const response = await api.get("/auth/usuario-workspaces");
  return unwrapCollection<WorkspaceAcceso>(response.data);
}

export async function getWorkspacesDeUsuario(id: number | string) {
  const response = await api.get(`/auth/usuarios/${id}/workspaces`);
  return unwrapCollection<WorkspaceAcceso>(response.data);
}
