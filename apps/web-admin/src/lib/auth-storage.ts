import type { AuthContext, AuthSession, LoginResult } from "@/types/auth";

export const AUTH_STORAGE_KEY = "documental_auth";
export const LOGIN_STORAGE_KEY = "documental_login";

const isBrowser = () => typeof window !== "undefined";

export function saveLoginResult(login: LoginResult) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(login));
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

export function saveAuthSession(session: AuthSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  clearLoginResult();
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
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

export function hasPermission(permission: string): boolean {
  const contexto = getContexto();
  if (!contexto) return false;
  if (contexto.perfil === "admin") return true;
  return contexto.permisos?.includes(permission) ?? false;
}
