import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceV2ContextoOperativo } from "@/types/documental-v2-workspace";
import { entityVista, textValue } from "./workspace-v2-utils";

type ContextoVistaRecord = Record<string, unknown>;

function contextoCodigo(vista: ContextoVistaRecord) {
  return textValue(
    vista.codigo ??
      vista.codigoCentroCosto ??
      vista.codigo_centro_costo ??
      vista.codigoExpediente ??
      vista.codigo_expediente ??
      vista.id,
  );
}

export function ContextoOperativoCard({
  contexto,
}: {
  contexto: WorkspaceV2ContextoOperativo;
}) {
  const vista = entityVista<ContextoVistaRecord>(contexto);

  const empresa = textValue(
    vista.empresa ?? vista.empresaCodigo ?? vista.empresa_codigo,
  );

  const cliente = textValue(
    vista.clienteDestino ??
      vista.cliente_destino ??
      vista.clienteDestinoNombre ??
      vista.cliente_destino_nombre,
  );

  const codigo = contextoCodigo(vista);
  const descripcion = textValue(vista.descripcion ?? vista.nombre);
  const estado = textValue(vista.estado, "Sin estado");

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle>Contexto Operativo</CardTitle>
          </div>
          <Badge variant="outline">{estado}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Empresa
            </dt>
            <dd className="mt-1 font-medium">{empresa}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Código / Centro
            </dt>
            <dd className="mt-1 font-medium">{codigo}</dd>
          </div>
          <div className="lg:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Descripción
            </dt>
            <dd className="mt-1 font-medium">{descripcion}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Cliente destino
            </dt>
            <dd className="mt-1 font-medium">{cliente}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}