import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTrazabilidadContenedor } from "@/hooks/useTrazabilidadContenedor";
import { HistorialActividadAdvertencias } from "./HistorialActividadAdvertencias";
import { HistorialActividadEstadoVacio } from "./HistorialActividadEstadoVacio";
import { HistorialActividadItem } from "./HistorialActividadItem";
import { HistorialActividadSkeleton } from "./HistorialActividadSkeleton";

function getHttpStatus(error: unknown) {
  const maybeError = error as { response?: { status?: number }; status?: number } | null;
  return maybeError?.response?.status ?? maybeError?.status;
}

function getErrorMessage(status?: number) {
  if (status === 401) {
    return "Tu sesión venció o no está autorizada para consultar el historial de actividad.";
  }

  if (status === 403) {
    return "No tienes permisos para ver el historial de actividad de este contexto.";
  }

  if (status === 404) {
    return "No se encontró el contexto operativo solicitado.";
  }

  return "No se pudo cargar el historial de actividad.";
}

export function HistorialActividadV2({ contenedorOperativoId }: { contenedorOperativoId?: string | number | null }) {
  const trazabilidad = useTrazabilidadContenedor(contenedorOperativoId);
  const data = trazabilidad.data;
  const items = data?.items ?? [];
  const advertencias = data?.advertencias ?? [];
  const cobertura = data?.cobertura;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Historial de actividad</CardTitle>
            <p className="text-sm text-muted-foreground">
              Secuencia de operaciones del contexto operativo devuelta por la API canónica de trazabilidad.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {trazabilidad.isLoading || trazabilidad.isFetching ? <HistorialActividadSkeleton /> : null}

        {trazabilidad.isError ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground" role="alert">
            {getErrorMessage(getHttpStatus(trazabilidad.error))}
          </div>
        ) : null}

        {!trazabilidad.isLoading && !trazabilidad.isFetching && !trazabilidad.isError ? (
          <>
            <HistorialActividadAdvertencias advertencias={advertencias} cobertura={cobertura} />

            {items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <HistorialActividadItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <HistorialActividadEstadoVacio advertencias={advertencias} cobertura={cobertura} />
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
