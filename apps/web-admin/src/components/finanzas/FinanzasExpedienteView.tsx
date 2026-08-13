"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { FinanzasDocumentoPrincipalOperativoCard } from "@/components/finanzas/FinanzasDocumentoPrincipalOperativoCard";
import { FinanzasGrupoFacturaPagoPanel } from "@/components/finanzas/FinanzasGrupoFacturaPagoPanel";
import { useExpediente } from "@/hooks/useExpedientes";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  entityVista,
  getAdjuntosGrupo,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaPersistidoId,
  getGruposFactura,
} from "@/components/documental-v2/workspace-v2-utils";
import type {
  WorkspaceDocumentalV2,
  WorkspaceV2Documento,
  WorkspaceV2GrupoFactura,
} from "@/types/documental-v2-workspace";
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

function documentoId(documento?: ExpedienteDocumento | null) {
  if (!documento) return "";
  const doc = documento as unknown as Record<string, unknown>;
  return String(doc.documentoId ?? doc.documento_id ?? doc.id ?? "").trim();
}

function workspaceDocumentoId(documento: WorkspaceV2Documento) {
  const vista = entityVista<Record<string, unknown>>(documento);
  const record = documento as Record<string, unknown>;
  const value =
    vista.documentoId ??
    vista.documento_id ??
    record.documentoId ??
    record.documento_id ??
    vista.id ??
    record.id;

  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
}

function selectedGrupo(
  workspace: WorkspaceDocumentalV2,
  grupoFacturaId: string,
): WorkspaceV2GrupoFactura | null {
  if (!grupoFacturaId) return null;

  return (
    getGruposFactura(workspace).find(
      (grupo) =>
        String(getGrupoFacturaPersistidoId(grupo) ?? "") === grupoFacturaId,
    ) ?? null
  );
}

function documentosDelGrupo(
  expediente: Expediente,
  grupo: WorkspaceV2GrupoFactura,
) {
  const allowed = new Set<string>();

  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const principalDocumentoId =
    getGrupoDocumentoPrincipalDocumentoId(grupo);

  if (facturaDocumentoId !== null && facturaDocumentoId !== undefined) {
    allowed.add(String(facturaDocumentoId));
  }

  if (principalDocumentoId !== null && principalDocumentoId !== undefined) {
    allowed.add(String(principalDocumentoId));
  }

  for (const adjunto of getAdjuntosGrupo(grupo)) {
    const id = workspaceDocumentoId(adjunto);
    if (id) allowed.add(id);
  }

  if (!allowed.size) return [];

  return getAllDocuments(expediente).filter((documento) =>
    allowed.has(documentoId(documento)),
  );
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


function getDocumentoIdLegacy(documento: ExpedienteDocumento) {
  const doc = documento as unknown as Record<string, unknown>;
  return String(doc.documentoId ?? doc.documento_id ?? doc.id ?? "");
}

function getArchivoId(documento?: ExpedienteDocumento | null) {
  if (!documento) return null;

  const doc = documento as unknown as Record<string, unknown>;
  const value = doc.archivoId ?? doc.archivo_id;

  if (value === null || value === undefined || value === "") return null;

  return value as number | string;
}

function legacyBadgeLabel(documento: ExpedienteDocumento) {
  if (getDocumentoIdLegacy(documento) === "21") return "Principal V2 vigente";
  return isPrincipal(documento) ? "Legacy histórico" : "Adjunto legacy";
}

function DocumentoCard({
  documento,
  onPreview,
}: {
  documento: ExpedienteDocumento;
  onPreview: (documento: ExpedienteDocumento) => void;
}) {
  const archivoId = getArchivoId(documento);

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{documentoLabel(documento)}</div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {documentoDescripcion(documento)}
          </div>
        </div>

        {archivoId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Ver documento"
            aria-label={`Ver ${documentoLabel(documento)}`}
            onClick={() => onPreview(documento)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}

        <Badge variant="outline" className="hidden text-muted-foreground">
          {legacyBadgeLabel(documento)}
        </Badge>
      </div>
    </div>
  );
}

export function FinanzasExpedienteView({ id }: { id: string | number }) {
  const searchParams = useSearchParams();
  const grupoFacturaId = (searchParams.get("grupoFacturaId") ?? "").trim();

  const expedienteQuery = useExpediente(id);
  const workspaceQuery = useQuery({
    queryKey: ["finanzas-ver-workspace-grupo", String(id), grupoFacturaId],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id && grupoFacturaId),
  });

  const [previewDocumento, setPreviewDocumento] =
    useState<ExpedienteDocumento | null>(null);

  const expediente = expedienteQuery.data;
  const workspace = workspaceQuery.data;
  const grupo =
    grupoFacturaId && workspace
      ? selectedGrupo(workspace, grupoFacturaId)
      : null;

  const documentos =
    expediente && grupo
      ? documentosDelGrupo(expediente, grupo)
      : grupoFacturaId
        ? []
        : getAllDocuments(expediente);

  const transferencia = hasDocument(documentos, [
    "PAGO_TRANSFERENCIA",
    "TRANSFERENCIA",
    "ADJUNTO_TRANSFERENCIA",
  ]);
  const previewArchivoId = getArchivoId(previewDocumento);

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

  if (grupoFacturaId && workspaceQuery.isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-44 w-full" />
      </main>
    );
  }

  if (
    grupoFacturaId &&
    (workspaceQuery.isError || !workspace || !grupo)
  ) {
    return (
      <main className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href="/finanzas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Contexto de factura no disponible</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No se pudo resolver el grupo de factura solicitado para este
            expediente. No se mostrarán documentos de otros grupos.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{getCodigo(expediente)}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{getEmpresa(expediente)}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{getDescripcion(expediente)}</span>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-3">
          <Link href="/finanzas">Volver</Link>
        </Button>
      </div>

      <Card className="hidden">
        <CardHeader className="pb-2">
          <CardTitle>Control de pago</CardTitle>
          <p className="text-sm text-muted-foreground">
            La cabecera operativa se toma de la factura y del OC/OS del grupo seleccionado, no del principal global del expediente.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <EstadoDocBadge label="Transferencia" active={transferencia} />
        </CardContent>
      </Card>

      <FinanzasDocumentoPrincipalOperativoCard
        id={id}
        onVer={(principalDocumentoId) => {
          const documentoPrincipal = getAllDocuments(expediente).find(
            (documento) =>
              documentoId(documento) === String(principalDocumentoId),
          );

          if (documentoPrincipal) {
            setPreviewDocumento(documentoPrincipal);
          }
        }}
      />

      <FinanzasGrupoFacturaPagoPanel
        id={id}
        grupoFacturaId={grupoFacturaId || null}
        documentos={
          getAllDocuments(expediente) as unknown as Array<Record<string, unknown>>
        }
      />

      <Card className="hidden">
        <CardHeader className="pb-2">
          <CardTitle>
            {grupoFacturaId
              ? "Documentos de la factura"
              : "Documentos del expediente"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documentos.length ? documentos.map((documento, index) => (
            <DocumentoCard
              key={String((documento as any).documentoId ?? (documento as any).documento_id ?? index)}
              documento={documento}
              onPreview={setPreviewDocumento}
            />
          )) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay documentos vinculados.</div>
          )}
        </CardContent>
      </Card>

      {previewDocumento && previewArchivoId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${documentoLabel(previewDocumento)}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewDocumento(null);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-5 top-5 z-10"
              aria-label="Cerrar vista previa"
              onClick={() => setPreviewDocumento(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={previewArchivoId}
              title={documentoLabel(previewDocumento)}
              className="max-h-[80vh]"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
