import axios from "axios";
import { clearAuthSession, getAccessToken } from "@/lib/auth-storage";

export const authApi = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    "http://localhost:3000/api/v1",
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
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
