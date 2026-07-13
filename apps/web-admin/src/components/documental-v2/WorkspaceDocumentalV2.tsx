import { Layers3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AsociarDocumentoGrupoFacturaV2Result,
  AsociarDocumentoPrincipalV2Result,
  WorkspaceDocumentalV2 as WorkspaceDocumentalV2Type,
} from "@/types/documental-v2-workspace";
import { AdjuntosList } from "./AdjuntosList";
import { ContextoOperativoCard } from "./ContextoOperativoCard";
import { DocumentoOperativoPrincipalCard } from "./DocumentoOperativoPrincipalCard";
import { GrupoFacturaCard } from "./GrupoFacturaCard";
import { WorkspaceAlertas } from "./WorkspaceAlertas";
import {
  getAdjuntosNoClasificados,
  getAlertas,
  getContexto,
  getDocumentoPrincipal,
  getGruposFactura,
} from "./workspace-v2-utils";

export function WorkspaceDocumentalV2({
  workspace,
  onRefresh,
}: {
  workspace: WorkspaceDocumentalV2Type;
  onRefresh?: (result: AsociarDocumentoPrincipalV2Result | AsociarDocumentoGrupoFacturaV2Result) => Promise<unknown> | unknown;
}) {
  const contexto = getContexto(workspace);
  const principal = getDocumentoPrincipal(workspace);
  const gruposFactura = getGruposFactura(workspace);
  const adjuntosNoClasificados = getAdjuntosNoClasificados(workspace);
  const alertas = getAlertas(workspace);

  return (
    <div className="space-y-4">
      <ContextoOperativoCard contexto={contexto} />
      <DocumentoOperativoPrincipalCard documento={principal} contexto={contexto} onWorkspaceRefresh={onRefresh} />

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Layers3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Grupos de Factura</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cada tarjeta representa un Grupo de Factura devuelto por el Workspace V2.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gruposFactura.length ? (
            <div className="space-y-4">
              {gruposFactura.map((grupo, index) => (
                <GrupoFacturaCard
                  key={`${grupo.id ?? grupo.grupoFacturaId ?? grupo.grupo_factura_id ?? "grupo"}-${index}`}
                  grupo={grupo}
                  index={index}
                  onWorkspaceRefresh={onRefresh}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              El Workspace no devolvió grupos de factura para este contexto.
            </div>
          )}
        </CardContent>
      </Card>

      {adjuntosNoClasificados.length ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Documentos pendientes de clasificación</CardTitle>
            <p className="text-sm text-muted-foreground">
              Documentos devueltos por el Workspace sin asociación a un Grupo de Factura. No se clasifican desde frontend.
            </p>
          </CardHeader>
          <CardContent>
            <AdjuntosList documentos={adjuntosNoClasificados} />
          </CardContent>
        </Card>
      ) : null}

      <WorkspaceAlertas alertas={alertas} />
    </div>
  );
}
