"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  FilePlus2,
  FileText,
  Paperclip,
  Pencil,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpediente, useExpedienteEstadoDocumental } from "@/hooks/useExpedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function empresa(expediente?: Expediente) {
  return text(expediente?.empresa_codigo ?? expediente?.empresaCodigo);
}

function codigo(expediente?: Expediente) {
  return text(expediente?.codigo_expediente ?? expediente?.codigoExpediente, "");
}

function clave(expediente?: Expediente) {
  return text(expediente?.clave_principal ?? expediente?.clavePrincipal, "");
}

function tituloExpediente(expediente?: Expediente) {
  if (!expediente) return "-";
  return codigo(expediente) || (clave(expediente) ? "SIN EXPEDIENTE" : "PENDIENTE");
}

function shouldHideDescription(description?: string | null) {
  const value = text(description, "").toLowerCase();

  if (!value) return true;

  return [
    "expediente documental de prueba",
    "expediente creado desde ocr confirmado",
    "expediente creado desde ocr",
  ].some((technicalText) => value.includes(technicalText));
}

function descripcionExpediente(expediente?: Expediente) {
  if (!expediente) return "-";
  if (!shouldHideDescription(expediente.descripcion)) return expediente.descripcion ?? "-";
  if (clave(expediente)) return "Factura directa";
  if (codigo(expediente).startsWith("05")) return "Orden de Producción";
  if (codigo(expediente).startsWith("03")) return "Centro de costo";
  return "Pendiente de descripción";
}

function creadoEn(expediente?: Expediente) {
  return text(expediente?.creado_en ?? expediente?.creadoEn, "Sin fecha");
}

function actualizadoEn(expediente?: Expediente) {
  return text(expediente?.actualizado_en ?? expediente?.actualizadoEn, "Sin fecha");
}

function allDocuments(expediente?: Expediente): ExpedienteDocumento[] {
  if (!expediente) return [];
  return [
    ...(expediente.documentos ?? []),
    ...(expediente.documentoPrincipal ? [expediente.documentoPrincipal] : []),
    ...(expediente.documentosAdjuntos ?? []),
  ];
}

function principal(expediente?: Expediente) {
  return (
    expediente?.documentoPrincipal ??
    expediente?.documentos?.find((documento) => documento.esPrincipal) ??
    expediente?.documentosAdjuntos?.find((documento) => documento.esPrincipal) ??
    null
  );
}

function normalizeDocumentType(value?: string | null) {
  const raw = text(value, "DOC").toUpperCase();

  if (raw.includes("FACTURA")) return "FACTURA";
  if (raw.includes("OC")) return "OC";
  if (raw.includes("OS")) return "OS";
  if (raw.includes("GUIA") || raw.includes("GUÍA")) return "GUÍA";
  if (raw.includes("NOTA")) return "NOTA INGRESO";
  if (raw.includes("TRANSFERENCIA")) return "TRANSFERENCIA";
  if (raw.includes("DETRACCION") || raw.includes("DETRACCIÓN")) return "DETRACCIÓN";

  return raw.replace("PRINCIPAL_", "").replace("ADJUNTO_", "").replaceAll("_", " ");
}

function documentLabel(documento?: ExpedienteDocumento | null) {
  if (!documento) return "Sin documento";
  const tipo = normalizeDocumentType(documento.tipoDocumental ?? documento.tipoRelacion);
  const numero = [documento.serie, documento.numero].filter(Boolean).join("-");
  return numero ? `${tipo} ${numero}` : tipo;
}

function principalFromClave(expediente?: Expediente) {
  const clavePrincipal = clave(expediente);
  if (!clavePrincipal) return "Sin principal";

  const parts = clavePrincipal.split("|").filter(Boolean);
  const tipo = parts.find((part) => ["FACTURA", "OC", "OS"].includes(part.toUpperCase()));

  if (tipo?.toUpperCase() === "FACTURA") {
    const serie = parts.at(-2);
    const numero = parts.at(-1);
    return serie && numero ? `FACTURA ${serie}-${numero}` : "FACTURA";
  }

  if (tipo?.toUpperCase() === "OC" || tipo?.toUpperCase() === "OS") {
    const numero = parts.at(-1);
    return numero ? `${tipo.toUpperCase()} ${numero}` : tipo.toUpperCase();
  }

  return clavePrincipal;
}

function hasDocument(expediente: Expediente, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());

  return allDocuments(expediente).some((documento) => {
    const tipo = String(documento.tipoDocumental ?? "").toUpperCase();
    const relacion = String(documento.tipoRelacion ?? "").toUpperCase();

    return normalizedAliases.some(
      (alias) => tipo.includes(alias) || relacion.includes(alias),
    );
  });
}

function DocumentCard({ documento }: { documento: ExpedienteDocumento }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{documentLabel(documento)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {documento.claveDocumental ?? documento.nombreArchivo ?? "Sin clave/documento"}
          </div>
        </div>
        <Badge variant={documento.esPrincipal ? "default" : "secondary"}>
          {documento.esPrincipal ? "Principal" : "Adjunto"}
        </Badge>
      </div>
    </div>
  );
}

function QuickMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function CompraExpedienteView({ id }: { id: string | number }) {
  const expedienteQuery = useExpediente(id);
  const estadoQuery = useExpedienteEstadoDocumental(id);

  const expediente = expedienteQuery.data;
  const documentos = allDocuments(expediente);
  const documentoPrincipal = principal(expediente);
  const adjuntos = documentos.filter((documento) => !documento.esPrincipal);
  const factura = expediente ? hasDocument(expediente, ["FACTURA", "ADJUNTO_FACTURA", "PRINCIPAL_FACTURA"]) : false;
  const guia = expediente ? hasDocument(expediente, ["GUIA", "GUÍA"]) : false;

  if (expedienteQuery.isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-44 w-full" />
      </main>
    );
  }

  if (expedienteQuery.error || !expediente) {
    return <main className="p-6 text-red-600">No se pudo cargar el expediente.</main>;
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
            <Link href="/compras">
              <ArrowLeft className="h-4 w-4" />
              Volver a compras
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Expediente {tituloExpediente(expediente)}</h1>
          <p className="text-sm text-muted-foreground">
            {descripcionExpediente(expediente)} · {empresa(expediente)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/compras/${id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/compras/${id}/editar?accion=adjuntar`}>
              <FilePlus2 className="h-4 w-4" />
              Adjuntar
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <QuickMetric label="Documento principal" value={documentoPrincipal ? documentLabel(documentoPrincipal) : principalFromClave(expediente)} />
        <QuickMetric label="Adjuntos" value={adjuntos.length} />
        <QuickMetric label="Factura" value={factura ? "Presente" : "Pendiente"} />
        <QuickMetric label="Guía" value={guia ? "Presente" : "Pendiente"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Datos del expediente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Empresa</div>
              <div className="font-semibold">{empresa(expediente)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expediente</div>
              <div className="font-mono font-semibold">{tituloExpediente(expediente)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <Badge variant="secondary">{expediente.estado ?? "abierto"}</Badge>
            </div>
            <div className="md:col-span-3">
              <div className="text-xs text-muted-foreground">Descripción</div>
              <div className="font-medium">{descripcionExpediente(expediente)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-dashed p-4 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <AlertTriangle className="h-4 w-4" />
                Sin alertas pendientes
              </div>
              <p className="mt-1 text-xs">
                Las alertas serán creadas manualmente por Contabilidad cuando solicite correcciones o archivos.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documento principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentoPrincipal ? (
            <DocumentCard documento={documentoPrincipal} />
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              {principalFromClave(expediente)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Documentos asociados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {adjuntos.length ? (
            adjuntos.map((documento) => (
              <DocumentCard key={`${documento.documentoId}-${documento.tipoRelacion}`} documento={documento} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Todavía no hay adjuntos relacionados.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Historial del expediente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
            <div>
              <div className="font-medium">Expediente creado</div>
              <div className="text-muted-foreground">{creadoEn(expediente)}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
            <div>
              <div className="font-medium">Última actualización</div>
              <div className="text-muted-foreground">{actualizadoEn(expediente)}</div>
            </div>
          </div>
          {estadoQuery.data ? (
            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
              <div>
                <div className="font-medium">Estado documental consultado</div>
                <div className="text-muted-foreground">Información disponible para revisión visual.</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
