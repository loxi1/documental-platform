export type AuthUser = {
  id: number;
  nombres: string;
  apellidos?: string | null;
  email: string;
};

export type AuthAccess = {
  sistema: string;
  sistema_nombre?: string;
  empresa_codigo: string;
  perfil: string;
  permisos: string[];
};

export type AuthContext = {
  sub: number;
  email: string;
  nombres: string;
  sistema: string;
  empresa: string;
  perfil: string;
  permisos: string[];
  iat?: number;
  exp?: number;
};

export type LoginResult = {
  usuario: AuthUser;
  accesos: AuthAccess[];
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
