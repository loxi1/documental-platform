import axios from "axios";
import { clearAuthSession, getAccessToken, getContexto } from "@/lib/auth-storage";
import { getPublicApiUrl } from "@/services/env";

export const api = axios.create({
  baseURL: getPublicApiUrl(),
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (process.env.NEXT_PUBLIC_ALLOW_LOCAL_API_FOR_TESTS === "true") {
    const usuarioId = Number(getContexto()?.sub);
    if (Number.isInteger(usuarioId) && usuarioId > 0 && !config.headers["x-user-id"]) {
      config.headers["x-user-id"] = String(usuarioId);
    }
  }

  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
