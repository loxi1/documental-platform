import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function WorkspaceHeader({ id }: { id: string | number }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/compras">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a Compras
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Workspace Documental V2</h1>
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="h-3 w-3" />
            Solo lectura
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista experimental conectada únicamente al contrato oficial del API Gateway.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contrato Gateway</p>
        <p className="mt-1 font-mono text-xs">/documental-v2/workspace/expedientes-v1/{id}</p>
      </div>
    </div>
  );
}
