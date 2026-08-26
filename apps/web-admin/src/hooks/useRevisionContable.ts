import { useQuery } from "@tanstack/react-query";

import { getRevisionContable } from "@/services/revision-contable";
import type { RevisionContableParams } from "@/types/revision-contable";

export function useRevisionContable(
  params: RevisionContableParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ["revision-contable", params],
    queryFn: () => getRevisionContable(params),
    enabled,
  });
}
