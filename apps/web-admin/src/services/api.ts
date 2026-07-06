import axios from "axios";
import { clearAuthSession, getAccessToken } from "@/lib/auth-storage";
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
