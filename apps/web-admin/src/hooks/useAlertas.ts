import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  crearDocumentoAlerta,
  getDocumentoAlertas,
  resolverDocumentoAlerta,
} from "@/services/alertas";
import type { CrearDocumentoAlertaPayload } from "@/types/alerta";

export function useDocumentoAlertas(documentoId?: number | string) {
  return useQuery({
    queryKey: ["documentos", documentoId, "alertas"],
    queryFn: () => getDocumentoAlertas(documentoId as number | string),
    enabled: Boolean(documentoId),
  });
}


export function useDocumentosAlertas(documentoIds: Array<number | string>) {
  const ids = Array.from(
    new Set(
      documentoIds
        .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
        .map((id) => String(id)),
    ),
  );

  const queries = useQueries({
    queries: ids.map((documentoId) => ({
      queryKey: ["documentos", documentoId, "alertas"],
      queryFn: () => getDocumentoAlertas(documentoId),
      enabled: Boolean(documentoId),
    })),
  });

  const alertas = queries.flatMap((query, index) =>
    (query.data ?? []).map((alerta) => ({
      ...alerta,
      documentoId: alerta.documentoId ?? alerta.documento_id ?? ids[index],
    })),
  );

  return {
    alertas,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export function useCrearDocumentoAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentoId,
      payload,
    }: {
      documentoId: number | string;
      payload: CrearDocumentoAlertaPayload;
    }) => crearDocumentoAlerta(documentoId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documentos", variables.documentoId, "alertas"],
      });
      queryClient.invalidateQueries({ queryKey: ["revision-contable"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-contable"] });
    },
  });
}

export function useResolverDocumentoAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentoId,
      alertaId,
    }: {
      documentoId: number | string;
      alertaId: number | string;
    }) => resolverDocumentoAlerta(documentoId, alertaId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documentos", variables.documentoId, "alertas"],
      });
      queryClient.invalidateQueries({ queryKey: ["revision-contable"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-contable"] });
    },
  });
}
