import { api } from "@/services/api";
import type { AuthSession, LoginResult, ValidateTokenResult } from "@/types/auth";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  requestId?: string;
  timestamp?: string;
};

export async function login(email: string, password: string) {
  const response = await api.post<ApiResponse<LoginResult>>("/auth/login", {
    email,
    password,
  });

  return response.data.data;
}

export async function selectContext(
  usuarioId: number,
  sistema: string,
  empresaCodigo: string,
) {
  const response = await api.post<ApiResponse<AuthSession>>("/auth/select-context", {
    usuarioId,
    sistema,
    empresaCodigo,
  });

  return response.data.data;
}

export async function validateToken(token: string) {
  const response = await api.post<ApiResponse<ValidateTokenResult>>("/auth/validate-token", {
    token,
  });

  return response.data.data;
}
