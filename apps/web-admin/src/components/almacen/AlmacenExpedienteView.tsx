"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";

import { AlmacenDocumentoPrincipalOperativoCard } from "@/components/almacen/AlmacenDocumentoPrincipalOperativoCard";
import { AlmacenGrupoFacturaOperativoPanel } from "@/components/almacen/AlmacenGrupoFacturaOperativoPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpediente } from "@/hooks/useExpedientes";
import { getDocumentoArchivoPreviewUrl } from "@/services/documentos-preview";
import { getWorkspaceDocumentalV2 } from "@/services/documental-v2-workspace";
import {
  entityVista,
  getAdjuntosGrupo,
  getGrupoFacturaPersistidoId,
  getGruposFactura,
} from "@/components/documental-v2/workspace-v2-utils";
import type {
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

function selectedGrupo(
  workspace: Awaited<ReturnType<typeof getWorkspaceDocumentalV2>>,
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

function grupoHasDocument(
  grupo: WorkspaceV2GrupoFactura | null,
  aliases: string[],
) {
  if (!grupo) return false;

  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());

  return getAdjuntosGrupo(grupo).some((documento: WorkspaceV2Documento) => {
    const vista = entityVista<Record<string, unknown>>(documento);
    const tipo = String(
      vista.tipoDocumental ?? vista.tipo_documental ?? "",
    ).toUpperCase();
    const relacion = String(
      vista.tipoRelacion ?? vista.tipo_relacion ?? "",
    ).toUpperCase();

    return normalizedAliases.some(
      (alias) => tipo.includes(alias) || relacion.includes(alias),
    );
  });
}


function workspaceDocumentoId(documento: WorkspaceV2Documento) {
  const vista = entityVista<Record<string, unknown>>(documento);
  const value = vista.documentoId ?? vista.documento_id ?? vista.id;
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function expedienteDocumentoId(documento: ExpedienteDocumento) {
  const doc = documento as unknown as Record<string, unknown>;
  const value = doc.documentoId ?? doc.documento_id ?? doc.id;
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function expedienteArchivoId(documento: ExpedienteDocumento) {
  const doc = documento as unknown as Record<string, unknown>;
  const value =
    doc.archivoId ??
    doc.archivo_id ??
    doc.archivoActualId ??
    doc.archivo_actual_id;
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function workspaceDocumentoTipo(documento: WorkspaceV2Documento) {
  const vista = entityVista<Record<string, unknown>>(documento);
  return String(
    vista.tipoDocumental ??
      vista.tipo_documental ??
      vista.tipoRelacion ??
      vista.tipo_relacion ??
      "",
  )
    .trim()
    .toUpperCase();
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
        <Badge variant="outline" className="text-muted-foreground">
          {isPrincipal(documento) ? "Legacy histórico" : "Adjunto legacy"}
        </Badge>
      </div>
    </div>
  );
}

export function AlmacenExpedienteView({ id }: { id: string | number }) {
  const searchParams = useSearchParams();
  const grupoFacturaId = (searchParams.get("grupoFacturaId") ?? "").trim();

  const expedienteQuery = useExpediente(id);
  const workspaceQuery = useQuery({
    queryKey: ["almacen-ver-workspace-grupo", String(id), grupoFacturaId],
    enabled: Boolean(id && grupoFacturaId),
    queryFn: () => getWorkspaceDocumentalV2(id),
  });

  const expediente = expedienteQuery.data;
  const workspace = workspaceQuery.data;
  const grupo =
    grupoFacturaId && workspace
      ? selectedGrupo(workspace, grupoFacturaId)
      : null;

  const documentos = getAllDocuments(expediente);
  const [previewDocumento, setPreviewDocumento] = useState<{
    titulo: string;
    signedUrl: string;
  } | null>(null);
  const [previewDocumentoError, setPreviewDocumentoError] =
    useState<string | null>(null);

  const principal = getPrincipal(expediente);
  const facturaDocumentoId = grupoFacturaDocumentoId(grupo);
  const facturaAsociadaGrupo =
    facturaDocumentoId
      ? documentos.find(
          (candidate) =>
            expedienteDocumentoId(candidate) === String(facturaDocumentoId),
        ) ?? null
      : null;

  const factura = grupoFacturaId
    ? Boolean(grupo)
    : hasDocument(documentos, [
        "FACTURA",
        "ADJUNTO_FACTURA",
        "PRINCIPAL_FACTURA",
      ]);

  const guia = grupoFacturaId
    ? grupoHasDocument(grupo, ["GUIA", "GUÍA", "GUIA_REMISION", "ADJUNTO_GUIA"])
    : hasDocument(documentos, ["GUIA", "GUÍA", "GUIA_REMISION"]);

  const notaIngreso = grupoFacturaId
    ? grupoHasDocument(grupo, [
        "NOTA_INGRESO",
        "NOTA INGRESO",
        "ADJUNTO_NOTA_INGRESO",
      ])
    : hasDocument(documentos, ["NOTA_INGRESO", "NOTA INGRESO"]);

  
  function grupoFacturaDocumentoId(
    grupo: WorkspaceV2GrupoFactura | null,
  ): string | null {
    if (!grupo) return null;

    const vista = entityVista<Record<string, unknown>>(grupo);
    const metadata =
      vista.metadata && typeof vista.metadata === "object" && !Array.isArray(vista.metadata)
        ? (vista.metadata as Record<string, unknown>)
        : null;

    const compatibilidad =
      metadata?.compatibilidad &&
      typeof metadata.compatibilidad === "object" &&
      !Array.isArray(metadata.compatibilidad)
        ? (metadata.compatibilidad as Record<string, unknown>)
        : null;

    const documentoV1 =
      compatibilidad?.documentoV1 &&
      typeof compatibilidad.documentoV1 === "object" &&
      !Array.isArray(compatibilidad.documentoV1)
        ? (compatibilidad.documentoV1 as Record<string, unknown>)
        : null;

    return text(
      vista.facturaDocumentoId ??
        vista.factura_documento_id ??
        vista.documentoId ??
        vista.documento_id ??
        documentoV1?.documentoId ??
        documentoV1?.documento_id,
      "",
    ) || null;
  }

  const documentosAsociadosGrupo = grupo
    ? getAdjuntosGrupo(grupo)
        .map((workspaceDocumento) => {
          const documentoId = workspaceDocumentoId(workspaceDocumento);
          if (!documentoId) return null;

          const tipo = workspaceDocumentoTipo(workspaceDocumento);
          const esGuia = tipo.includes("GUIA") || tipo.includes("GUÍA");
          const esNotaIngreso =
            tipo.includes("NOTA_INGRESO") ||
            tipo.includes("NOTA INGRESO");

          if (!esGuia && !esNotaIngreso) return null;

          const documento =
            documentos.find(
              (candidate) =>
                expedienteDocumentoId(candidate) === documentoId,
            ) ?? null;

          return {
            workspaceDocumento,
            documentoId,
            documento,
            esGuia,
            esNotaIngreso,
          };
        })
        .filter(
          (
            item,
          ): item is {
            workspaceDocumento: WorkspaceV2Documento;
            documentoId: string;
            documento: ExpedienteDocumento | null;
            esGuia: boolean;
            esNotaIngreso: boolean;
          } => item !== null,
        )
    : [];

  const guiasAsociadasGrupo = documentosAsociadosGrupo.filter(
    (item) => item.esGuia,
  );

  const notasIngresoAsociadasGrupo = documentosAsociadosGrupo.filter(
    (item) => item.esNotaIngreso,
  );

  async function abrirDocumentoAsociado(
    documento: ExpedienteDocumento | null,
  ) {
    if (!documento) return;

    const archivoId = expedienteArchivoId(documento);
    if (!archivoId) {
      setPreviewDocumentoError(
        "No se pudo resolver el archivo activo del documento.",
      );
      return;
    }

    try {
      setPreviewDocumentoError(null);
      const preview = await getDocumentoArchivoPreviewUrl(archivoId);
      setPreviewDocumento({
        titulo: documentoLabel(documento),
        signedUrl: preview.signedUrl,
      });
    } catch (error) {
      setPreviewDocumentoError(
        error instanceof Error
          ? error.message
          : "No se pudo abrir la vista previa del documento.",
      );
    }
  }

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
          <Link href="/almacen">
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Almacén</h1>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{getCodigo(expediente)}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{getEmpresa(expediente)}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"> {getDescripcion(expediente)}</span>
          </div>

        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/almacen">Volver</Link>
        </Button>


      </div>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <AlmacenDocumentoPrincipalOperativoCard
          expedienteId={id}
          grupoFacturaId={grupoFacturaId || null}
          fallbackTitle={
            grupoFacturaId ? null : principal ? documentoLabel(principal) : null
          }
          fallbackDescription={
            grupoFacturaId
              ? null
              : principal
                ? documentoDescripcion(principal)
                : null
          }
          fallbackActive={Boolean(!grupoFacturaId && principal)}
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Control almacén</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <EstadoDocBadge label="Factura" active={factura} />
            <EstadoDocBadge label="Guía" active={guia} />
            <EstadoDocBadge label="NI" active={notaIngreso} />
          </CardContent>
        </Card>
      </section>

      <AlmacenGrupoFacturaOperativoPanel
        expedienteId={id}
        grupoFacturaId={grupoFacturaId || null}
        modo="ver"
      />

      {grupoFacturaId && grupo ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Documentos asociados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div
                className={
                  facturaAsociadaGrupo
                    ? "rounded-xl border p-3"
                    : "rounded-xl border border-dashed p-3"
                }
              >
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Factura
                </div>

                {facturaAsociadaGrupo ? (
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        ✓ {documentoLabel(facturaAsociadaGrupo)}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {documentoDescripcion(facturaAsociadaGrupo)}
                      </div>
                    </div>

                    {expedienteArchivoId(facturaAsociadaGrupo) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => void abrirDocumentoAsociado(facturaAsociadaGrupo)}
                      >
                        Ver
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    — Factura no registrada
                  </div>
                )}
              </div>
              <div
                className={
                  guiasAsociadasGrupo.length
                    ? "rounded-xl border p-3"
                    : "rounded-xl border border-dashed p-3"
                }
              >
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Guía de remisión
                </div>

                {guiasAsociadasGrupo.length ? (
                  <div className="divide-y">
                    {guiasAsociadasGrupo.map((item) => {
                      const vista = entityVista<Record<string, unknown>>(
                        item.workspaceDocumento,
                      );

                      return (
                        <div
                          key={`guia-${item.documentoId}`}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              ✓{" "}
                              {item.documento
                                ? documentoLabel(item.documento)
                                : text(
                                    vista.documentoLabel,
                                    "Guía de remisión",
                                  )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {item.documento
                                ? documentoDescripcion(item.documento)
                                : [
                                    text(
                                      vista.fechaEmision ?? vista.fecha,
                                      "",
                                    ),
                                    text(vista.proveedorNombre, ""),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                          </div>

                          {item.documento &&
                          expedienteArchivoId(item.documento) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                void abrirDocumentoAsociado(item.documento)
                              }
                            >
                              Ver
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-3 text-sm text-muted-foreground">
                    — Guía no registrada
                  </div>
                )}
              </div>

              <div
                className={
                  notasIngresoAsociadasGrupo.length
                    ? "rounded-xl border p-3"
                    : "rounded-xl border border-dashed p-3"
                }
              >
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Nota de ingreso
                </div>

                {notasIngresoAsociadasGrupo.length ? (
                  <div className="divide-y">
                    {notasIngresoAsociadasGrupo.map((item) => {
                      const vista = entityVista<Record<string, unknown>>(
                        item.workspaceDocumento,
                      );

                      return (
                        <div
                          key={`ni-${item.documentoId}`}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              ✓{" "}
                              {item.documento
                                ? documentoLabel(item.documento)
                                : text(
                                    vista.documentoLabel,
                                    "Nota de ingreso",
                                  )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {item.documento
                                ? documentoDescripcion(item.documento)
                                : [
                                    text(
                                      vista.fechaEmision ?? vista.fecha,
                                      "",
                                    ),
                                    text(vista.proveedorNombre, ""),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                          </div>

                          {item.documento &&
                          expedienteArchivoId(item.documento) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                void abrirDocumentoAsociado(item.documento)
                              }
                            >
                              Ver
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-3 text-sm text-muted-foreground">
                    — Nota de ingreso no registrada
                  </div>
                )}
              </div>
            </div>

            {previewDocumentoError ? (
              <p className="mt-3 text-sm text-red-600">
                {previewDocumentoError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!grupoFacturaId ? (
        <Card>
          <details>
            <summary className="cursor-pointer list-none px-6 py-4">
              <div className="flex flex-col gap-1">
                <CardTitle>Documentos legacy del expediente</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Uso administrativo / diagnóstico. No reemplaza el Principal V2 vigente ni el grupo documental de recepción.
                </p>
              </div>
            </summary>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {documentos.length ? documentos.map((documento, index) => (
                <DocumentoCard key={String((documento as any).documentoId ?? (documento as any).documento_id ?? index)} documento={documento} />
              )) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay documentos vinculados.</div>
              )}
            </CardContent>
          </details>
        </Card>
      ) : null}

      <Modal
        isOpen={Boolean(previewDocumento)}
        onClose={() => {
          setPreviewDocumento(null);
          setPreviewDocumentoError(null);
        }}
        className="mx-4 w-[calc(100vw-2rem)] max-w-6xl p-4 md:p-5"
      >
        <div className="space-y-3">
          <div className="pr-10">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Vista previa documental
            </div>
            <div className="mt-1 text-lg font-semibold">
              {previewDocumento?.titulo ?? "Documento"}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-muted/20">
            {previewDocumento?.signedUrl ? (
              <iframe
                title={previewDocumento.titulo}
                src={previewDocumento.signedUrl}
                className="h-[72vh] w-full bg-white"
              />
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreviewDocumento(null);
                setPreviewDocumentoError(null);
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

    </main>
  );
}
