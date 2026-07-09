"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2, ShieldAlert, WifiOff } from "lucide-react";

import { WorkspaceDocumentalV2 } from "@/components/documental-v2/WorkspaceDocumentalV2";
import { WorkspaceHeader } from "@/components/documental-v2/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";

function getHttpStatus(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }

  return undefined;
}

function ErrorState({ error }: { error: unknown }) {
  const status = getHttpStatus(error);
  const isAuthError = status === 401 || status === 403;

  return (
    <Card>
      <CardContent className="py-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="rounded-full bg-muted p-4 text-muted-foreground">
            {isAuthError ? <ShieldAlert className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {isAuthError ? "No autorizado para ver este Workspace" : "No se pudo cargar el Workspace Documental V2"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAuthError
              ? "Verifica que exista un accessToken de workspace vigente para consumir el API Gateway."
              : "La vista consume exclusivamente GET /api/v1/documental-v2/workspace/expedientes-v1/:id por API Gateway."}
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/compras">Volver a Compras</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocumentalV2WorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["documental-v2-workspace", id],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  return (
    <main className="space-y-5">
      <WorkspaceHeader id={id ?? "—"} />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando Workspace Documental V2 desde API Gateway...
          </CardContent>
        </Card>
      ) : null}

      {isError ? <ErrorState error={error} /> : null}

      {!isLoading && !isError && !data ? (
        <Card>
          <CardContent className="py-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                <FileSearch className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Workspace sin datos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                El Gateway respondió, pero no devolvió información suficiente para renderizar el Workspace V2.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data ? <WorkspaceDocumentalV2 workspace={data} /> : null}
    </main>
  );
}
