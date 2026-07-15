import { api } from "@/services/api";
import type { ApiEnvelope, TrazabilidadContenedorV2 } from "@/types/documental-v2-trazabilidad";

function unwrapData<T>(payload: unknown, fallback: T): T {
  let current = payload as any;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data !== undefined &&
    current.data !== current
  ) {
    current = current.data;
  }

  return (current ?? fallback) as T;
}

export async function getTrazabilidadContenedor(contenedorOperativoId: string | number) {
  const { data } = await api.get<ApiEnvelope<TrazabilidadContenedorV2> | TrazabilidadContenedorV2>(
    `/documental-v2/trazabilidad/contenedores/${contenedorOperativoId}`,
  );

  return unwrapData<TrazabilidadContenedorV2>(data, {
    version: 1,
    contenedorOperativoId,
    items: [],
    cobertura: {
      auditoria: false,
      documentoEventos: false,
      parcial: true,
    },
    advertencias: ["TRAZABILIDAD_PARCIAL"],
  });
}
