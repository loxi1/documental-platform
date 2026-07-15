import { useQuery } from "@tanstack/react-query";

import { getTrazabilidadContenedor } from "@/services/documental-v2-trazabilidad";

export function useTrazabilidadContenedor(contenedorOperativoId?: string | number | null) {
  return useQuery({
    queryKey: ["documental-v2", "trazabilidad", "contenedor", contenedorOperativoId],
    queryFn: () => getTrazabilidadContenedor(contenedorOperativoId as string | number),
    enabled: contenedorOperativoId !== undefined && contenedorOperativoId !== null && `${contenedorOperativoId}`.trim() !== "",
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
}
