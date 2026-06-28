export type AuthUser = {
  id: number;
  nombres: string;
  apellidos?: string | null;
  email: string;
};

export type AuthPermissions = {
  menus: string[];
  actions: string[];
};

export type AuthWorkspace = {
  workspaceId: number;
  empresa: string;
  empresaCodigo: string;
  clienteDestinoId?: number | string | null;
  sistema: string;
  sistemaNombre?: string | null;
  perfilId?: number | string | null;
  perfil: string;
  perfilNombre?: string | null;
  esFavorito?: boolean;
  ultimoUsoEn?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  permisos: AuthPermissions;
};

/** Compatibilidad temporal con el nombre antiguo en algunas pantallas. */
export type AuthAccess = AuthWorkspace & {
  sistema_nombre?: string;
  empresa_codigo: string;
};

export type AuthContext = {
  sub: number;
  email?: string;
  nombres?: string;
  workspaceId: number;
  empresa: string;
  clienteDestinoId?: number | string | null;
  sistema: string;
  perfilId?: number | string | null;
  perfil: string;
  permissionVersion?: number;
  sessionContextId: string;
  permisos: AuthPermissions;
  iat?: number;
  exp?: number;
};

export type LoginResult = {
  usuario: AuthUser;
  identityToken: string;
  identityTokenType?: string;
  identityExpiresIn?: string;
  workspaces?: AuthWorkspace[];
};

export type WorkspacesResult = {
  usuarioId: number;
  workspaces: AuthWorkspace[];
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  contexto: AuthContext;
};

export type ValidateTokenResult = {
  valid: boolean;
  payload?: AuthContext;
};
