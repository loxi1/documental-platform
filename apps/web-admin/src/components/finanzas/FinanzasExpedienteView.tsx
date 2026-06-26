"use client";

import Link from "next/link";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpediente } from "@/hooks/useExpedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function field<T = unknown>(source: unknown, key: string): T | undefined {
  if (!source || typeof source !== "object") return undefined;
  return (source as Record<string, T | undefined>)[key];
}

function listField<T = unknown>(source: unknown, key: string): T[] {
  const value = field<unknown>(source, key);
  return Array.isArray(value) ? (value as T[]) : [];
}

function getEmpresa(expediente: Expediente) {
  return text(field(expediente, "empresa_codigo") ?? field(expediente, "empresaCodigo"), "-");
}

function getCodigo(expediente: Expediente) {
  return text(field(expediente, "codigo_expediente") ?? field(expediente, "codigoExpediente"), "SIN EXPEDIENTE");
}

function getDescripcion(expediente: Expediente) {
  return text(field(expediente, "descripcion"), "Pendiente de descripción");
}

function getAllDocuments(expediente?: Expediente | null) {
  if (!expediente) return [];

  const documentos = listField<ExpedienteDocumento>(expediente, "documentos");
  const documentosLista = listField<ExpedienteDocumento>(expediente, "documentosLista");
  const documentosPrincipales = listField<ExpedienteDocumento>(expediente, "documentosPrincipales");
  const documentoPrincipal = field<ExpedienteDocumento | null>(expediente, "documentoPrincipal");
  const documentosAdjuntos = listField<ExpedienteDocumento>(expediente, "documentosAdjuntos");

  const all = [
    ...documentos,
    ...documentosLista,
    ...documentosPrincipales,
    ...(documentoPrincipal ? [documentoPrincipal] : []),
    ...documentosAdjuntos,
  ];

  const seen = new Set<string>();
  return all.filter((documento, index) => {
    const doc = documento as unknown as Record<string, unknown>;
    const key = String(
      doc.documentoId ??
        doc.documento_id ??
        doc.claveDocumental ??
        doc.clave_documental ??
        `${doc.tipoDocumental ?? doc.tipo_documental ?? "DOC"}-${index}`,
    );

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPrincipal(expediente?: Expediente | null): ExpedienteDocumento | null {
  if (!expediente) return null;

  const documentoPrincipal = field<ExpedienteDocumento | null>(expediente, "documentoPrincipal");
  if (documentoPrincipal) return documentoPrincipal;

  return getAllDocuments(expediente).find((documento) => {
    const doc = documento as unknown as Record<string, unknown>;
    const relacion = String(doc.tipoRelacion ?? doc.tipo_relacion ?? "").toLowerCase();
    const esPrincipal = doc.esPrincipal === true || doc.es_principal === true || String(doc.es_principal).toLowerCase() === "t";
    return esPrincipal || relacion.startsWith("principal_");
  }) ?? null;
}

function isPrincipal(documento: ExpedienteDocumento) {
  const doc = documento as unknown as Record<string, unknown>;
  const relacion = String(doc.tipoRelacion ?? doc.tipo_relacion ?? "").toLowerCase();
  return Boolean(doc.esPrincipal === true || doc.es_principal === true || String(doc.es_principal).toLowerCase() === "t" || relacion.startsWith("principal_"));
}

function normalizeTipo(value: unknown) {
  return text(value, "DOC")
    .replace("PRINCIPAL_", "")
    .replace("ADJUNTO_", "")
    .replaceAll("_", " ")
    .toUpperCase();
}

function documentoLabel(documento?: ExpedienteDocumento | null) {
  if (!documento) return "Sin documento";
  const doc = documento as unknown as Record<string, unknown>;
  const tipo = normalizeTipo(doc.tipoDocumental ?? doc.tipo_documental ?? doc.tipoRelacion ?? doc.tipo_relacion);
  const serie = text(doc.serie, "");
  const numero = text(doc.numero, "");
  const labelNumero = [serie, numero].filter(Boolean).join("-");
  return labelNumero ? `${tipo} ${labelNumero}` : tipo;
}

function documentoDescripcion(documento?: ExpedienteDocumento | null) {
  if (!documento) return "—";
  const doc = documento as unknown as Record<string, unknown>;
  const proveedor = text(doc.razonSocialEmisor ?? doc.razon_social_emisor ?? doc.proveedor ?? doc.razonSocial, "");
  const fecha = text(doc.fechaEmision ?? doc.fecha_emision, "");
  const monto = text(doc.montoTotal ?? doc.monto_total, "");
  return [proveedor, fecha, monto ? `Monto ${monto}` : ""].filter(Boolean).join(" · ") || text(doc.claveDocumental ?? doc.clave_documental, "—");
}

function hasDocument(documentos: ExpedienteDocumento[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());
  return documentos.some((documento) => {
    const doc = documento as unknown as Record<string, unknown>;
    const tipo = String(doc.tipoDocumental ?? doc.tipo_documental ?? "").toUpperCase();
    const relacion = String(doc.tipoRelacion ?? doc.tipo_relacion ?? "").toUpperCase();
    return normalizedAliases.some((alias) => tipo.includes(alias) || relacion.includes(alias));
  });
}

function EstadoDocBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className={active ? "gap-1" : "gap-1 text-muted-foreground"}>
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function DocumentoCard({ documento }: { documento: ExpedienteDocumento }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{documentoLabel(documento)}</div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{documentoDescripcion(documento)}</div>
        </div>
        <Badge variant={isPrincipal(documento) ? "default" : "secondary"}>
          {isPrincipal(documento) ? "Principal" : "Adjunto"}
        </Badge>
      </div>
    </div>
  );
}

export function FinanzasExpedienteView({ id }: { id: string | number }) {
  const expedienteQuery = useExpediente(id);
  const expediente = expedienteQuery.data;
  const documentos = getAllDocuments(expediente);
  const principal = getPrincipal(expediente);
  const adjuntos = documentos.filter((documento) => !isPrincipal(documento));
  const transferencia = hasDocument(documentos, ["PAGO_TRANSFERENCIA", "TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA"]);
  const detraccion = hasDocument(documentos, ["PAGO_DETRACCION", "DETRACCION", "DETRACCIÓN", "ADJUNTO_DETRACCION"]);

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
          <Button asChild variant="ghost" size="sm" className="mb-1 px-0">
            <Link href="/finanzas">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Finanzas</h1>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{getCodigo(expediente)}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{getEmpresa(expediente)}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"> {getDescripcion(expediente)}</span>
          </div>
          
        </div>

        <Button asChild>
          <Link href={`/finanzas/${id}/editar?accion=adjuntar`}>
            <FilePlus2 className="h-4 w-4" />
            Adjuntar
          </Link>
        </Button>
      </div>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Documento principal</CardTitle>
          </CardHeader>
          <CardContent>
            {principal ? (
              <div className="rounded-xl border bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <div className="text-lg font-semibold">{documentoLabel(principal)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{documentoDescripcion(principal)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Sin documento principal.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Control finanzas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <EstadoDocBadge label="Transferencia" active={transferencia} />
            <EstadoDocBadge label="Detracción" active={detraccion} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Documentos vinculados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documentos.length ? documentos.map((documento, index) => (
            <DocumentoCard key={String((documento as any).documentoId ?? (documento as any).documento_id ?? index)} documento={documento} />
          )) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay documentos vinculados.</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
