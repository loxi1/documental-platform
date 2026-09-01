import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function WorkspaceHeader({ id }: { id: string | number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Contexto documental</h1>
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="h-3 w-3" />
            Solo lectura
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Documento principal, facturas y documentos asociados.
        </p>
      </div>

      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-3">
        <Link href="/compras">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Link>
      </Button>
    </div>
  );
}
