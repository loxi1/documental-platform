import { Info } from "lucide-react";

import type { TrazabilidadAdvertenciaCodigoV2, TrazabilidadCoberturaV2 } from "@/types/documental-v2-trazabilidad";

function getAdvertenciaLabel(codigo: string) {
  const labels: Record<string, string> = {
    TRAZABILIDAD_PARCIAL: "La trazabilidad disponible es parcial para este contexto.",
    SIN_EVENTOS_DOCUMENTALES: "No hay eventos documentales complementarios disponibles para este contexto.",
    FUENTE_COMPLEMENTARIA_NO_DISPONIBLE: "Una fuente complementaria de trazabilidad no está disponible.",
  };

  return labels[codigo] ?? "Hay una advertencia de cobertura para este contexto.";
}

export function HistorialActividadAdvertencias({
  advertencias,
  cobertura,
}: {
  advertencias: TrazabilidadAdvertenciaCodigoV2[];
  cobertura?: TrazabilidadCoberturaV2;
}) {
  const mensajes = [...new Set(advertencias ?? [])];

  if (!mensajes.length && !cobertura?.parcial) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground" role="status">
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Cobertura de trazabilidad</p>
          {mensajes.length ? (
            <ul className="list-disc space-y-1 pl-4">
              {mensajes.map((codigo) => (
                <li key={codigo}>{getAdvertenciaLabel(codigo)}</li>
              ))}
            </ul>
          ) : (
            <p>La trazabilidad disponible es parcial para este contexto.</p>
          )}
        </div>
      </div>
    </div>
  );
}
