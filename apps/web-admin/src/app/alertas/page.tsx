"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Search,
} from "lucide-react";

import { MetricCard } from "@/components/documental/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useDocumentoAlertas, useResolverDocumentoAlerta } from "@/hooks/useAlertas";
import type { DocumentoAlerta } from "@/types/alerta";

function pick<T>(...values: T[]) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function alertaId(alerta: DocumentoAlerta) {
  return pick(alerta.id, "-");
}

function tipoAlerta(alerta: DocumentoAlerta) {
  return pick(alerta.tipo_alerta, alerta.tipoAlerta, "ALERTA");
}

function estadoAlerta(alerta: DocumentoAlerta) {
  return String(pick(alerta.estado, "activa"));
}

function mensajeAlerta(alerta: DocumentoAlerta) {
  return pick(alerta.mensaje, "Sin mensaje registrado.");
}

function fechaAlerta(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 19);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function creadoEn(alerta: DocumentoAlerta) {
  return fechaAlerta(pick(alerta.creado_en, alerta.creadoEn, null));
}

function resueltoEn(alerta: DocumentoAlerta) {
  return fechaAlerta(pick(alerta.resuelto_en, alerta.resueltoEn, null));
}

function AlertasContent() {
  const searchParams = useSearchParams();
  const documentoIdParam = searchParams.get("documentoId") ?? undefined;
  const [documentoIdInput, setDocumentoIdInput] = useState(documentoIdParam ?? "");
  const [documentoId, setDocumentoId] = useState<string | undefined>(documentoIdParam);
  const [resolviendoId, setResolviendoId] = useState<number | string | null>(null);

  const alertasQuery = useDocumentoAlertas(documentoId);
  const resolverAlerta = useResolverDocumentoAlerta();

  const alertas = useMemo(() => alertasQuery.data ?? [], [alertasQuery.data]);
  const activas = alertas.filter((alerta) => estadoAlerta(alerta) !== "resuelta");
  const resueltas = alertas.filter((alerta) => estadoAlerta(alerta) === "resuelta");

  useEffect(() => {
    if (!documentoIdParam) return;

    setDocumentoIdInput(documentoIdParam);
    setDocumentoId(documentoIdParam);
  }, [documentoIdParam]);

  function consultar() {
    const value = documentoIdInput.trim();
    if (!value) return;
    setDocumentoId(value);
  }

  async function resolver(alerta: DocumentoAlerta) {
    if (!documentoId) return;

    const alertaId = alerta.id;

    if (alertaId === undefined || alertaId === null || alertaId === "-") return;

    setResolviendoId(alertaId);

    try {
      await resolverAlerta.mutateAsync({
        documentoId,
        alertaId,
      });
    } finally {
      setResolviendoId(null);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta alertas operativas por documento y resuelve observaciones
            cuando ya fueron atendidas.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => alertasQuery.refetch()}
          disabled={!documentoId || alertasQuery.isFetching}
        >
          <RefreshCcw className="mr-1 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta por documento</CardTitle>
          <CardDescription>
            Por ahora el backend expone alertas desde el documento. Ingresa el ID
            del documento para revisar sus alertas activas e históricas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Documento ID
              </span>
              <Input
                value={documentoIdInput}
                onChange={(event) => setDocumentoIdInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") consultar();
                }}
                placeholder="Ej. 1"
                inputMode="numeric"
              />
            </label>

            <div className="flex items-end">
              <Button className="w-full md:w-auto" type="button" onClick={consultar}>
                <Search className="mr-1 h-4 w-4" />
                Consultar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Documento consultado"
          value={documentoId ?? "-"}
          description="Documento usado para consultar alertas."
        />

        <MetricCard
          title="Alertas activas"
          value={activas.length}
          description="Avisos pendientes de resolver."
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={activas.length > 0 ? "warning" : "success"}
        />

        <MetricCard
          title="Alertas resueltas"
          value={resueltas.length}
          description="Observaciones ya atendidas."
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
      </div>

      {alertasQuery.error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            No se pudieron cargar las alertas. Verifica el documento o el backend.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas del documento
          </CardTitle>
          <CardDescription>
            Las alertas son avisos operativos. No bloquean el expediente ni el
            documento, pero ayudan a contabilidad a dar seguimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!documentoId ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Consulta un documento</EmptyTitle>
                <EmptyDescription>
                  Ingresa un Documento ID para consultar sus alertas activas e históricas.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : alertasQuery.isLoading ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Cargando alertas...</EmptyTitle>
                <EmptyDescription>Estamos consultando el historial del documento.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : alertas.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">ID</th>
                    <th>Tipo</th>
                    <th>Mensaje</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Resuelto</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((alerta) => {
                    const id = alertaId(alerta);
                    const estado = estadoAlerta(alerta);
                    const activa = estado !== "resuelta";

                    return (
                      <tr key={String(id)} className="border-b align-top">
                        <td className="py-3 font-medium">{id}</td>
                        <td>
                          <Badge variant={activa ? "destructive" : "secondary"}>
                            {String(tipoAlerta(alerta))}
                          </Badge>
                        </td>
                        <td className="max-w-xl">
                          <div className="font-medium">{String(mensajeAlerta(alerta))}</div>
                          {alerta.metadata ? (
                            <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
                              {JSON.stringify(alerta.metadata, null, 2)}
                            </pre>
                          ) : null}
                        </td>
                        <td>
                          <Badge variant={activa ? "outline" : "secondary"}>
                            {estado}
                          </Badge>
                        </td>
                        <td>{creadoEn(alerta)}</td>
                        <td>{resueltoEn(alerta)}</td>
                        <td className="text-right">
                          {activa ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolver(alerta)}
                              disabled={
                                resolverAlerta.isPending && resolviendoId === id
                              }
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Resolver
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Resuelta
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Sin alertas registradas</EmptyTitle>
                <EmptyDescription>
                  Este documento no tiene alertas activas ni históricas.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AlertasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando alertas...</div>}>
      <AlertasContent />
    </Suspense>
  );
}
