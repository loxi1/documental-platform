"use client";

import { Layers3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceV2Capabilities } from "@/hooks/useWorkspaceV2Capabilities";
import type { WorkspaceDocumentalV2 as WorkspaceDocumentalV2Type } from "@/types/documental-v2-workspace";
import { AdjuntosList } from "./AdjuntosList";
import { ContextoOperativoCard } from "./ContextoOperativoCard";
import { DocumentoOperativoPrincipalCard } from "./DocumentoOperativoPrincipalCard";
import { GrupoFacturaCard } from "./GrupoFacturaCard";
import {
  getAdjuntosGrupo,
  getAdjuntosNoClasificados,
  getContexto,
  getDocumentoId,
  getDocumentoPrincipal,
  getGruposFactura,
} from "./workspace-v2-utils";

export function WorkspaceDocumentalV2({
  workspace,
  onRefresh,
}: {
  workspace: WorkspaceDocumentalV2Type;
  onRefresh?: () => Promise<unknown> | unknown;
}) {
  const contexto = getContexto(workspace);
  const principal = getDocumentoPrincipal(workspace);
  const gruposFactura = getGruposFactura(workspace);
  const adjuntosNoClasificados = getAdjuntosNoClasificados(workspace);

  const documentosAsociadosIds = new Set(
    gruposFactura
      .flatMap((grupo) => getAdjuntosGrupo(grupo))
      .map((documento) => String(getDocumentoId(documento) ?? "").trim())
      .filter(Boolean),
  );

  const adjuntosPendientes = adjuntosNoClasificados.filter((documento) => {
    const documentoId = String(getDocumentoId(documento) ?? "").trim();
    return !documentoId || !documentosAsociadosIds.has(documentoId);
  });

  const capabilities = useWorkspaceV2Capabilities();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
<ContextoOperativoCard contexto={contexto} />
      <DocumentoOperativoPrincipalCard
        documento={principal}
        contexto={contexto}
        onWorkspaceRefresh={onRefresh}
        canAssociatePrincipal={capabilities.canAssociatePrincipal}
        canCancelPrincipal={capabilities.canCancelPrincipal}
      />

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Layers3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Facturas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cada factura muestra sus documentos asociados.
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
                  canAssociateGroupDocument={capabilities.canAssociateGroupDocument}
                  canCancelGroup={capabilities.canCancelGroup}
                  canRemoveGroupDocument={capabilities.canRemoveGroupDocument}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              No hay facturas disponibles para este contexto.
            </div>
          )}
        </CardContent>
      </Card>

      {adjuntosPendientes.length ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Documentos sin asociar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Documentos que todavía no pertenecen a ninguna factura.
            </p>
          </CardHeader>
          <CardContent>
            <AdjuntosList documentos={adjuntosPendientes} />
          </CardContent>
        </Card>
      ) : null}
</div>
  );
}
