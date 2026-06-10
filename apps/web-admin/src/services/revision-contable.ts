import { api } from "./api";
import type {
  RevisionContableItem,
  RevisionContableParams,
} from "@/types/revision-contable";

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

export async function getRevisionContable(params: RevisionContableParams) {
  const { data } = await api.get<
    ApiEnvelope<RevisionContableItem[]> | RevisionContableItem[]
  >("/expedientes/revision-contable", {
    params,
  });

  return unwrap<RevisionContableItem[]>(data);
}
