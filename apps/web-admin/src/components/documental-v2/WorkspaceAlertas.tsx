import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceV2Alerta } from "@/types/documental-v2-workspace";
import { formatDate, textValue } from "./workspace-v2-utils";

export function WorkspaceAlertas({ alertas }: { alertas: WorkspaceV2Alerta[] }) {
  if (!alertas.length) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <TriangleAlert className="h-4 w-4" />
          </div>
          <CardTitle>Alertas / Advertencias</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alertas.map((alerta, index) => (
            <div key={`${alerta.id ?? "alerta"}-${index}`} className="rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{textValue(alerta.titulo ?? alerta.tipo, "Alerta del Workspace")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {textValue(alerta.mensaje ?? alerta.descripcion, "Sin descripción adicional")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{textValue(alerta.prioridad, "Prioridad no informada")}</Badge>
                  <Badge variant="secondary">{textValue(alerta.estado, "Sin estado")}</Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Creado: {formatDate(alerta.creadoEn ?? alerta.creado_en)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
