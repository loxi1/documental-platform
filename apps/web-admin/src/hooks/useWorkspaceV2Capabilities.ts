"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";

export const WORKSPACE_V2_ACTIONS = {
  view: "documental_v2.workspace.ver",
  associatePrincipal: "documental_v2.workspace.principal.asociar",
  cancelPrincipal: "documental_v2.workspace.principal.anular",
  associateGroupDocument: "documental_v2.workspace.grupo.asociar_documento",
  cancelGroup: "documental_v2.workspace.grupo.anular",
  removeGroupDocument: "documental_v2.workspace.grupo.quitar_documento",
} as const;

export type WorkspaceV2Capabilities = {
  canViewWorkspace: boolean;
  canAssociatePrincipal: boolean;
  canCancelPrincipal: boolean;
  canAssociateGroupDocument: boolean;
  canCancelGroup: boolean;
  canRemoveGroupDocument: boolean;
  isReadOnly: boolean;
};

export function useWorkspaceV2Capabilities(): WorkspaceV2Capabilities {
  const { contexto } = useAuth();

  return useMemo(() => {
    const actions = new Set(contexto?.permisos?.actions ?? []);
    const hasAction = (action: string) => actions.has(action);

    const canAssociatePrincipal = hasAction(WORKSPACE_V2_ACTIONS.associatePrincipal);
    const canCancelPrincipal = hasAction(WORKSPACE_V2_ACTIONS.cancelPrincipal);
    const canAssociateGroupDocument = hasAction(WORKSPACE_V2_ACTIONS.associateGroupDocument);
    const canCancelGroup = hasAction(WORKSPACE_V2_ACTIONS.cancelGroup);
    const canRemoveGroupDocument = hasAction(WORKSPACE_V2_ACTIONS.removeGroupDocument);

    return {
      canViewWorkspace: hasAction(WORKSPACE_V2_ACTIONS.view),
      canAssociatePrincipal,
      canCancelPrincipal,
      canAssociateGroupDocument,
      canCancelGroup,
      canRemoveGroupDocument,
      isReadOnly:
        !canAssociatePrincipal &&
        !canCancelPrincipal &&
        !canAssociateGroupDocument &&
        !canCancelGroup &&
        !canRemoveGroupDocument,
    };
  }, [contexto]);
}
