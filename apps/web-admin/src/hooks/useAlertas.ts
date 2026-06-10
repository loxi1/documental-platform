import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
