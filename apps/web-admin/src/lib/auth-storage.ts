import type { AuthContext, AuthPermissions, AuthSession, AuthWorkspace, LoginResult } from "@/types/auth";

export const AUTH_STORAGE_KEY = "documental_auth";
export const LOGIN_STORAGE_KEY = "documental_login";
export const WORKSPACES_STORAGE_KEY = "documental_workspaces";

const isBrowser = () => typeof window !== "undefined";

function normalizePermissions(permisos: unknown): AuthPermissions {
  if (Array.isArray(permisos)) {
    const values = permisos.filter((item): item is string => typeof item === "string");
    return {
      menus: values.filter((item) => item.endsWith(".ver")).map((item) => item.replace(/\.ver$/, "")),
      actions: values.filter((item) => !item.endsWith(".ver")),
    };
  }

  if (permisos && typeof permisos === "object") {
    const record = permisos as Record<string, unknown>;
    return {
      menus: Array.isArray(record.menus)
        ? record.menus.filter((item): item is string => typeof item === "string")
        : [],
      actions: Array.isArray(record.actions)
        ? record.actions.filter((item): item is string => typeof item === "string")
        : [],
    };
  }

  return { menus: [], actions: [] };
}

export function normalizeWorkspace(workspace: AuthWorkspace): AuthWorkspace {
  return {
    ...workspace,
    empresaCodigo: workspace.empresaCodigo ?? workspace.empresa,
    empresa: workspace.empresa ?? workspace.empresaCodigo,
    permisos: normalizePermissions(workspace.permisos),
  };
}

export function saveLoginResult(login: LoginResult) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(login));
  if (login.workspaces) saveWorkspaces(login.workspaces);
}

export function getLoginResult(): LoginResult | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(LOGIN_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginResult;
  } catch {
    window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    return null;
  }
}

export function clearLoginResult() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LOGIN_STORAGE_KEY);
}

export function saveWorkspaces(workspaces: AuthWorkspace[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    WORKSPACES_STORAGE_KEY,
    JSON.stringify(workspaces.map((workspace) => normalizeWorkspace(workspace))),
  );
}

export function getStoredWorkspaces(): AuthWorkspace[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(WORKSPACES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as AuthWorkspace[];
    return parsed.map((workspace) => normalizeWorkspace(workspace));
  } catch {
    window.localStorage.removeItem(WORKSPACES_STORAGE_KEY);
    return [];
  }
}

export function saveAuthSession(session: AuthSession) {
  if (!isBrowser()) return;
  const normalized: AuthSession = {
    ...session,
    contexto: {
      ...session.contexto,
      permisos: normalizePermissions(session.contexto.permisos),
    },
  };
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
  clearLoginResult();
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return {
      ...parsed,
      contexto: {
        ...parsed.contexto,
        permisos: normalizePermissions(parsed.contexto.permisos),
      },
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LOGIN_STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return getAuthSession()?.accessToken ?? null;
}

export function getContexto(): AuthContext | null {
  return getAuthSession()?.contexto ?? null;
}

export function hasMenu(menu: string): boolean {
  const contexto = getContexto();
  if (!contexto) return false;
  if (contexto.perfil === "admin") return true;
  return contexto.permisos?.menus?.includes(menu) ?? false;
}

export function hasAction(action: string): boolean {
  const contexto = getContexto();
  if (!contexto) return false;
  if (contexto.perfil === "admin") return true;
  return contexto.permisos?.actions?.includes(action) ?? false;
}

export function hasPermission(permission: string): boolean {
  if (permission.endsWith(".ver")) {
    return hasMenu(permission.replace(/\.ver$/, ""));
  }

  return hasAction(permission);
}
