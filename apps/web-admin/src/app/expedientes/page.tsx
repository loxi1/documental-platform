"use client";

import Link from "next/link";
import { FileText, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExpedientes } from "@/hooks/useExpedientes";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expediente } from "@/types/expediente";

function empresa(expediente: Expediente) {
  return expediente.empresa_codigo ?? expediente.empresaCodigo ?? "-";
}

function tipo(expediente: Expediente) {
  return expediente.tipo_expediente ?? expediente.tipoExpediente ?? "-";
}

function codigoOp(expediente: Expediente) {
  return expediente.codigo_op ?? expediente.codigoOp ?? "-";
}

function clavePrincipal(expediente: Expediente) {
  return expediente.clave_principal ?? expediente.clavePrincipal ?? "-";
}

function totalDocumentos(expediente: Expediente) {
  const totalDesdeDetalle = expediente.documentos?.length;
  const totalDesdeResumen =
    (expediente.documentoPrincipal ? 1 : 0) +
    (expediente.documentosAdjuntos?.length ?? 0);

  return totalDesdeDetalle ?? totalDesdeResumen;
}

export default function ExpedientesPage() {
  const { data, isLoading, error } = useExpedientes();

  if (isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error cargando expedientes.
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expedientes</h1>
          <p className="text-sm text-muted-foreground">
            Unidad principal del negocio: documento principal, adjuntos,
            timeline, resumen y trazabilidad contable.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Prioridad: revisar expediente y completar documentación.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Listado
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">ID</th>
                  <th>Correlativo</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Código OP</th>
                  <th>Estado</th>
                  <th>Documentos</th>
                  <th>Clave principal</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {data?.map((expediente) => (
                  <tr key={expediente.id} className="border-b">
                    <td className="py-2">{expediente.id}</td>
                    <td className="font-medium">{expediente.correlativo}</td>
                    <td>{empresa(expediente)}</td>
                    <td>{tipo(expediente)}</td>
                    <td>{codigoOp(expediente)}</td>
                    <td>
                      <Badge variant="secondary">
                        {expediente.estado ?? "abierto"}
                      </Badge>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {totalDocumentos(expediente)}
                      </span>
                    </td>
                    <td
                      className="max-w-80 truncate font-mono text-xs"
                      title={clavePrincipal(expediente)}
                    >
                      {clavePrincipal(expediente)}
                    </td>
                    <td className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/expedientes/${expediente.id}`}>Ver</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!data?.length && (
              <Empty className="mt-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderKanban className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin expedientes registrados</EmptyTitle>
                  <EmptyDescription>
                    Los expedientes creados desde OCR o de forma manual aparecerán aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}