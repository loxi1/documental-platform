import { FileClock } from "lucide-react";

import type { TrazabilidadAdvertenciaCodigoV2, TrazabilidadCoberturaV2 } from "@/types/documental-v2-trazabilidad";

export function HistorialActividadEstadoVacio({
  advertencias,
  cobertura,
}: {
  advertencias?: TrazabilidadAdvertenciaCodigoV2[];
  cobertura?: TrazabilidadCoberturaV2;
}) {
  const tieneAdvertencias = Boolean(advertencias?.length || cobertura?.parcial);

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileClock className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {tieneAdvertencias ? "Trazabilidad no disponible para mostrar" : "Aún no hay actividad registrada"}
          </p>
          <p className="mt-1">
            {tieneAdvertencias
              ? "No se encontraron eventos visibles para este contexto con la cobertura disponible."
              : "Cuando existan operaciones registradas, aparecerán en esta sección."}
          </p>
        </div>
      </div>
    </div>
  );
}
