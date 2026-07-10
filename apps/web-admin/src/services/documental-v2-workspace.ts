import { api } from "@/services/api";
import type { ApiEnvelope, WorkspaceDocumentalV2 } from "@/types/documental-v2-workspace";

function unwrapWorkspace(payload: unknown): WorkspaceDocumentalV2 {
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

  if (current && typeof current === "object" && "workspace" in current && current.workspace) {
    return current.workspace as WorkspaceDocumentalV2;
  }

  return (current ?? {}) as WorkspaceDocumentalV2;
}

export async function getWorkspaceDocumentalV2(id: string | number) {
  const { data } = await api.get<ApiEnvelope<WorkspaceDocumentalV2> | WorkspaceDocumentalV2>(
    `/documental-v2/workspace/expedientes-v1/${id}`,
  );

  return unwrapWorkspace(data);
}
