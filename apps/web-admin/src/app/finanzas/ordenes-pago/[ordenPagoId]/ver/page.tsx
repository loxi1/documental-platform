"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { OrdenPagoVerView } from "@/components/finanzas/OrdenPagoVerView";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocumentoArchivos } from "@/services/documentos";
import { getGrupoFacturaDocumentosV2 } from "@/services/documental-v2-workspace";
import { getOrdenPago } from "@/services/finanzas";

export default function OrdenPagoVerPage() {
  const params = useParams<{ ordenPagoId: string }>();
  const rawId = params.ordenPagoId;
  const ordenPagoId = Number(rawId);
  const idValido =
    typeof rawId === "string" &&
    /^\d+$/.test(rawId) &&
    Number.isSafeInteger(ordenPagoId) &&
    ordenPagoId > 0;

  const ordenQuery = useQuery({
    queryKey: ["finanzas-orden-pago-ver", ordenPagoId],
    queryFn: () => getOrdenPago(ordenPagoId),
    enabled: idValido,
  });

  const detalle = ordenQuery.data ?? null;

  const archivosQuery = useQuery({
    queryKey: ["finanzas-orden-pago-ver-archivos", detalle?.documentoId],
    queryFn: () => getDocumentoArchivos(detalle!.documentoId),
    enabled: Boolean(detalle?.documentoId),
  });

  const documentosGrupoQuery = useQuery({
    queryKey: [
      "finanzas-orden-pago-ver-documentos-grupo",
      detalle?.grupoFacturaId,
    ],
    queryFn: () => getGrupoFacturaDocumentosV2(detalle!.grupoFacturaId),
    enabled: Boolean(detalle?.grupoFacturaId),
  });

  if (!idValido) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">
          La Orden de Pago solicitada no es válida.
        </CardContent>
      </Card>
    );
  }

  if (ordenQuery.isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </main>
    );
  }

  if (ordenQuery.error || !detalle) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">
          No se pudo cargar la Orden de Pago o no está disponible para este contexto.
        </CardContent>
      </Card>
    );
  }

  return (
    <OrdenPagoVerView
      detalle={detalle}
      archivosResponse={archivosQuery.data ?? null}
      archivosLoading={archivosQuery.isLoading}
      archivosError={Boolean(archivosQuery.error)}
      documentosGrupo={documentosGrupoQuery.data ?? []}
      documentosGrupoLoading={documentosGrupoQuery.isLoading}
      documentosGrupoError={Boolean(documentosGrupoQuery.error)}
    />
  );
}
