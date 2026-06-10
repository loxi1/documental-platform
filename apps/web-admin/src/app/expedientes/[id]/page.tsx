"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDocumentosAlertas } from "@/hooks/useAlertas";
import {
  useExpediente,
  useExpedienteEstadoDocumental,
  useExpedienteResumen,
  useExpedienteTimeline,
} from "@/hooks/useExpedientes";
import type { DocumentoAlerta } from "@/types/alerta";
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


function estadoAlerta(alerta: DocumentoAlerta) {
  return String(alerta.estado ?? "activa");
}

function tipoAlerta(alerta: DocumentoAlerta) {
  return String(alerta.tipoAlerta ?? alerta.tipo_alerta ?? "ALERTA");
}

function mensajeAlerta(alerta: DocumentoAlerta) {
  return String(alerta.mensaje ?? "Sin mensaje registrado.");
}

function alertaDocumentoId(alerta: DocumentoAlerta) {
  return String(alerta.documentoId ?? alerta.documento_id ?? "-");
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

  const documentosDelExpediente = [
    documentoPrincipal,
    ...documentosAdjuntos,
  ].filter(Boolean) as ExpedienteDocumento[];

  const documentosIds = documentosDelExpediente
    .map((documento) => documento.documentoId)
    .filter(Boolean);

  const alertasExpedienteQuery = useDocumentosAlertas(documentosIds);
  const alertasExpediente = alertasExpedienteQuery.alertas;
  const alertasActivas = alertasExpediente.filter(
    (alerta) => estadoAlerta(alerta) !== "resuelta",
  );

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

      <div className="grid gap-4 lg:grid-cols-5">
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

        <Card>
          <CardHeader>
            <CardTitle>Alertas activas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {alertasActivas.length}
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
              <Empty className="p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin documento principal</EmptyTitle>
                  <EmptyDescription>
                    Este expediente aún no tiene OC, OS o factura principal vinculada.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
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
              <Empty className="md:col-span-2">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin documentos adjuntos</EmptyTitle>
                  <EmptyDescription>
                    Cuando se agreguen guías, notas de ingreso o pagos aparecerán aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas del expediente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasExpedienteQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Cargando alertas del expediente...
            </div>
          ) : alertasActivas.length ? (
            <div className="space-y-3">
              {alertasActivas.map((alerta) => (
                <div
                  key={`${alertaDocumentoId(alerta)}-${alerta.id}`}
                  className="flex flex-col gap-3 rounded-lg border p-3 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{tipoAlerta(alerta)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Documento #{alertaDocumentoId(alerta)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{mensajeAlerta(alerta)}</p>
                  </div>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/alertas?documentoId=${alertaDocumentoId(alerta)}`}>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Ver alerta
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Sin alertas activas</EmptyTitle>
                <EmptyDescription>
                  No hay observaciones pendientes en los documentos de este expediente.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
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
                <div key={item.id ?? index} className="relative pl-7">
                  <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background">
                    <span className="h-2 w-2 rounded-full bg-foreground" />
                  </span>
                  {index < timeline.length - 1 ? (
                    <span className="absolute bottom-[-0.75rem] left-[7px] top-5 w-px bg-border" />
                  ) : null}
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-sm font-medium">{tituloTimeline(item)}</div>
                    <div className="text-sm text-muted-foreground">
                      {descripcionTimeline(item)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fechaTimeline(item)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarClock className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Timeline sin eventos</EmptyTitle>
                  <EmptyDescription>
                    Los eventos de OCR, vinculación y alertas aparecerán aquí.
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
