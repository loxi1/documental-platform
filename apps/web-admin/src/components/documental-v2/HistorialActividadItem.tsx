import { CheckCircle2, Clock3, FileClock } from "lucide-react";

import type { TrazabilidadItemV2 } from "@/types/documental-v2-trazabilidad";

function getTipoLabel(tipo: string) {
  const labels: Record<string, string> = {
    ASOCIAR_DOCUMENTO_PRINCIPAL: "Documento principal asociado",
    GRUPO_FACTURA_CREADO: "Grupo de factura creado",
    DOCUMENTO_GRUPO_FACTURA_ASOCIADO: "Documento asociado al grupo de factura",
  };

  return labels[tipo] ?? "Actividad registrada";
}

function getCategoriaLabel(categoria: string) {
  const labels: Record<string, string> = {
    AUDITORIA: "Operación",
    DOCUMENTO: "Documento",
    OCR: "OCR",
    WORKFLOW: "Flujo",
    SISTEMA: "Sistema",
  };

  return labels[categoria] ?? "Actividad";
}

function getResultadoLabel(resultado?: string | null) {
  if (!resultado) {
    return "Resultado no especificado";
  }

  const labels: Record<string, string> = {
    CREADO: "Registrado correctamente",
    PENDIENTE_REVISION: "Pendiente de revisión",
    ACTIVO: "Activo",
  };

  return labels[resultado] ?? "Estado no especificado";
}

function formatFecha(fecha: string) {
  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) {
    return "Fecha no especificada";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function HistorialActividadItem({ item }: { item: TrazabilidadItemV2 }) {
  const tipoLabel = getTipoLabel(item.tipo);
  const descripcion = item.descripcion?.trim() || tipoLabel;
  const actor = item.actor?.email?.trim() || "Usuario no especificado";
  const resultado = getResultadoLabel(item.resultado);

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileClock className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{tipoLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {getCategoriaLabel(item.categoria)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatFecha(item.fecha)}
            </span>
            <span>{actor}</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {resultado}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
