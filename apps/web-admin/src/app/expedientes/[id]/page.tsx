"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useExpediente,
  useExpedienteEstadoDocumental,
  useExpedienteResumen,
  useExpedienteTimeline,
} from "@/hooks/useExpedientes";
import type { ExpedienteDocumento, ExpedienteTimelineItem } from "@/types/expediente";

function asString(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fechaTimeline(item: ExpedienteTimelineItem) {
  return item.fecha ?? item.creado_en ?? item.creadoEn ?? "";
}

function tituloTimeline(item: ExpedienteTimelineItem) {
  return item.titulo ?? item.evento ?? item.tipo ?? "Evento";
}

function descripcionTimeline(item: ExpedienteTimelineItem) {
  return item.descripcion ?? item.mensaje ?? "Sin descripción";
}

function documentoLabel(documento?: ExpedienteDocumento | null) {
  if (!documento) return "Sin documento principal";

  const partes = [
    documento.tipoDocumental,
    documento.serie,
    documento.numero,
  ].filter(Boolean);

  return partes.length ? partes.join(" ") : `Documento #${documento.documentoId}`;
}

function DocumentoCard({ documento }: { documento: ExpedienteDocumento }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{documentoLabel(documento)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            ID documento: {documento.documentoId}
          </div>
        </div>

        <Badge variant={documento.esPrincipal ? "default" : "outline"}>
          {documento.tipoRelacion ?? (documento.esPrincipal ? "principal" : "adjunto")}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
        <div>RUC: {documento.rucEmisor ?? "-"}</div>
        <div>Estado: {documento.estado ?? "-"}</div>
        <div>Orden: {documento.orden ?? "-"}</div>
      </div>
    </div>
  );
}

export default function ExpedienteDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const expedienteQuery = useExpediente(id);
  const resumenQuery = useExpedienteResumen(id);
  const timelineQuery = useExpedienteTimeline(id);
  const estadoDocumentalQuery = useExpedienteEstadoDocumental(id);

  const expediente = expedienteQuery.data;
  const resumen = resumenQuery.data;
  const timeline = timelineQuery.data ?? [];
  const estadoDocumental = estadoDocumentalQuery.data;

  const documentoPrincipal =
    expediente?.documentoPrincipal ?? resumen?.documentoPrincipal ?? null;

  const documentosAdjuntos =
    expediente?.documentosAdjuntos ?? resumen?.documentosAdjuntos ?? [];

  const presentes =
    estadoDocumental?.presentes ?? estadoDocumental?.documentosPresentes ?? [];

  const faltantes =
    estadoDocumental?.faltantes ?? estadoDocumental?.documentosFaltantes ?? [];

  if (expedienteQuery.isLoading) {
    return <div className="p-6">Cargando expediente...</div>;
  }

  if (expedienteQuery.error || !expediente) {
    return (
      <div className="space-y-4 p-6">
        <Button asChild variant="outline">
          <Link href="/expedientes">Volver</Link>
        </Button>
        <div className="text-red-600">No se pudo cargar el expediente.</div>
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild className="mb-3" size="sm" variant="ghost">
            <Link href="/expedientes">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{expediente.correlativo}</h1>
          <p className="text-sm text-muted-foreground">
            Detalle operativo del expediente: resumen, estado documental,
            documentos y timeline.
          </p>
        </div>

        <Badge variant="secondary" className="w-fit">
          {expediente.estado ?? "abierto"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.empresa_codigo ?? expediente.empresaCodigo)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.tipo_expediente ?? expediente.tipoExpediente)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Código OP</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {asString(expediente.codigo_op ?? expediente.codigoOp)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjuntos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {documentosAdjuntos.length}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documento principal</CardTitle>
          </CardHeader>
          <CardContent>
            {documentoPrincipal ? (
              <DocumentoCard documento={documentoPrincipal} />
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Este expediente aún no tiene documento principal.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado documental</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Presentes
              </div>
              <div className="flex flex-wrap gap-2">
                {presentes.length ? (
                  presentes.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Sin datos.</span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <XCircle className="h-4 w-4" /> Faltantes
              </div>
              <div className="flex flex-wrap gap-2">
                {faltantes.length ? (
                  faltantes.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No hay faltantes reportados.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {documentosAdjuntos.length ? (
              documentosAdjuntos.map((documento) => (
                <DocumentoCard key={documento.documentoId} documento={documento} />
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                No hay documentos adjuntos registrados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeline.length ? (
              timeline.map((item, index) => (
                <div key={item.id ?? index} className="border-l pl-4">
                  <div className="text-sm font-medium">{tituloTimeline(item)}</div>
                  <div className="text-sm text-muted-foreground">
                    {descripcionTimeline(item)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fechaTimeline(item)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay eventos en el timeline.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
