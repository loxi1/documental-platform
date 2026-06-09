import { useQuery } from "@tanstack/react-query";

import { getOcrResultados } from "@/services/ocr-resultados";

export function useOcrResultados() {
  return useQuery({
    queryKey: ["ocr-resultados"],
    queryFn: getOcrResultados,
  });
}