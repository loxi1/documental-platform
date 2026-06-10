import { api } from "./api";
import type {
  DashboardContableParams,
  DashboardContableResponse,
} from "@/types/dashboard";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export async function getDashboardContable(params: DashboardContableParams) {
  const { data } = await api.get<
    ApiEnvelope<DashboardContableResponse> | DashboardContableResponse
  >("/expedientes/dashboard-contable", {
    params,
  });

  return unwrap<DashboardContableResponse>(data);
}
