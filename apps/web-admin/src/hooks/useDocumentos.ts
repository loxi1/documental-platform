import { useQuery } from "@tanstack/react-query";

import { getDocumento, getDocumentos } from "@/services/documentos";
import type { DocumentosQueryParams } from "@/types/documento";

export function useDocumentos(params: DocumentosQueryParams) {
  return useQuery({
    queryKey: ["documentos", params],
    queryFn: () => getDocumentos(params),
  });
}

export function useDocumento(id?: string | number) {
  return useQuery({
    queryKey: ["documentos", id],
    queryFn: () => getDocumento(id as string | number),
    enabled: Boolean(id),
  });
}
