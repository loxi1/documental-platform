import { useQuery } from "@tanstack/react-query";

import { getDashboardContable } from "@/services/dashboard";
import type { DashboardContableParams } from "@/types/dashboard";

export function useDashboardContable(params: DashboardContableParams) {
  return useQuery({
    queryKey: ["dashboard-contable", params.empresa, params.anio, params.mes],
    queryFn: () => getDashboardContable(params),
    enabled: Boolean(params.empresa && params.anio && params.mes),
  });
}
