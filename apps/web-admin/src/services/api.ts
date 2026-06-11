import axios from "axios";
import { clearAuthSession, getAccessToken } from "@/lib/auth-storage";

export const api = axios.create({
  // TEMPORAL DEV: mientras api-gateway no expone todas las rutas documentales,
  // los módulos documentos/expedientes/alertas consumen ms-documentos directo.
  // En producción debe apuntar al api-gateway.
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3002/api/v1",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
