import { authApi } from "@/services/auth-api";
import type { AuthSession, LoginResult, ValidateTokenResult, WorkspacesResult } from "@/types/auth";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  requestId?: string;
  timestamp?: string;
};

export async function login(email: string, password: string) {
  const response = await authApi.post<ApiResponse<LoginResult>>("/auth/login", {
    email,
    password,
  });

  return response.data.data;
}

export async function getWorkspaces(identityToken: string) {
  const response = await authApi.get<ApiResponse<WorkspacesResult>>("/auth/workspaces", {
    headers: {
      Authorization: `Bearer ${identityToken}`,
    },
  });

  return response.data.data;
}

export async function selectWorkspace(
  identityToken: string,
  workspaceId: number | string,
  recordar = false,
) {
  const response = await authApi.post<ApiResponse<AuthSession>>("/auth/workspaces/select", {
    identityToken,
    workspaceId,
    recordar,
  });

  return response.data.data;
}

/** Compatibilidad temporal con imports anteriores. */
export async function selectContext(
  identityToken: string,
  workspaceId: number | string,
  recordar = false,
) {
  return selectWorkspace(identityToken, workspaceId, recordar);
}

export async function validateToken(token: string) {
  const response = await authApi.post<ApiResponse<ValidateTokenResult>>("/auth/validate-token", {
    token,
  });

  return response.data.data;
}
