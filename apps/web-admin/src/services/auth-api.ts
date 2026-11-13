import axios from "axios";
import { clearAuthSession, getAccessToken } from "@/lib/auth-storage";
import { getPublicAuthApiUrl } from "@/services/env";

export const authApi = axios.create({
  baseURL: getPublicAuthApiUrl(),
  timeout: 30000,
});

authApi.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const wrongCurrentPassword = error?.config?.method?.toLowerCase() === "post"
      && error?.config?.url === "/auth/change-password"
      && (error?.response?.data?.error?.code ?? error?.response?.data?.code) === "CURRENT_PASSWORD_INCORRECT";
    if (!wrongCurrentPassword && error?.response?.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
