"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Link2 } from "lucide-react";

import { AsociarDocumentoGrupoFacturaPanel } from "@/components/documental-v2/AsociarDocumentoGrupoFacturaPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceV2Capabilities } from "@/hooks/useWorkspaceV2Capabilities";
import {
  evaluarCorrespondenciaPagoFactura,
  getDocumentosCandidatosGrupoFacturaV2,
  getWorkspaceDocumentalV2,
  type FinanzasCorrespondenciaEvaluacion,
} from "@/services/documental-v2-workspace";
import type { WorkspaceV2Documento, WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import {
  entityVista,
  getAdjuntosGrupo,
  getContexto,
  getContextoEmpresaCodigo,
  getGrupoDocumentoPrincipalDocumentoId,
  getGrupoFacturaDocumentoId,
  getGrupoFacturaLabel,
  getGrupoFacturaPersistidoId,
  getGrupoFecha,
  getGrupoImporte,
  getGrupoProveedor,
  getGrupoRucProveedor,
  getGruposFactura,
  textValue,
} from "@/components/documental-v2/workspace-v2-utils";

function hasAdjunto(grupo: WorkspaceV2GrupoFactura, aliases: string[]) {
  const normalized = aliases.map((alias) => alias.toUpperCase());
  return getAdjuntosGrupo(grupo).some((documento: WorkspaceV2Documento) => {
    const vista = entityVista<Record<string, unknown>>(documento);
    const tipo = String(vista.tipoDocumental ?? vista.tipo_documental ?? "").toUpperCase();
    const relacion = String(vista.tipoRelacion ?? vista.tipo_relacion ?? "").toUpperCase();
    return normalized.some((alias) => tipo.includes(alias) || relacion.includes(alias));
  });
}


function isTransferenciaDocumento(documento: WorkspaceV2Documento) {
  const vista = entityVista<Record<string, unknown>>(documento);
  const tipo = String(vista.tipoDocumental ?? vista.tipo_documental ?? "").toUpperCase();
  const relacion = String(vista.tipoRelacion ?? vista.tipo_relacion ?? "").toUpperCase();
  return ["TRANSFERENCIA", "ADJUNTO_TRANSFERENCIA", "PAGO_TRANSFERENCIA"].some(
    (alias) => tipo.includes(alias) || relacion.includes(alias),
  );
}

function getWorkspaceDocumentoId(documento: WorkspaceV2Documento) {
  const vista = entityVista<Record<string, unknown>>(documento);
  const record = documento as Record<string, unknown>;
  const candidates = [
    vista.documentoId,
    vista.documento_id,
    record.documentoId,
    record.documento_id,
    vista.id,
    record.id,
  ];

  return candidates.find((value) => value !== null && value !== undefined && String(value).trim() !== "") ?? null;
}

function getTransferenciaDocumento(grupo: WorkspaceV2GrupoFactura) {
  return getAdjuntosGrupo(grupo).find(isTransferenciaDocumento) ?? null;
}

function msiiRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function msiiText(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
}

function msiiRecordId(value: unknown) {
  const record = msiiRecord(value);
  if (!record) return "";

  return (
    msiiText(record.id) ||
    msiiText(record.documentoId) ||
    msiiText(record.documento_id) ||
    msiiText(record.documentoPrincipalId) ||
    msiiText(record.documento_principal_id)
  );
}

function msiiFindRecordById(source: unknown, targetId: unknown): Record<string, unknown> | null {
  const expected = msiiText(targetId);
  if (!expected) return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = msiiFindRecordById(item, expected);
      if (found) return found;
    }
    return null;
  }

  const record = msiiRecord(source);
  if (!record) return null;

  if (msiiRecordId(record) === expected) return record;

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") continue;
    const found = msiiFindRecordById(value, expected);
    if (found) return found;
  }

  return null;
}

function msiiDocumentoLabel(source: unknown, fallback: string) {
  const record = msiiRecord(source);
  if (!record) return fallback;

  const tipo = msiiText(
    record.tipoDocumental ??
      record.tipo_documental ??
      record.tipo ??
      record.tipoDocumento ??
      record.tipo_documento,
  )
    .replace("PRINCIPAL_", "")
    .replace("ADJUNTO_", "")
    .replaceAll("_", " ")
    .toUpperCase();

  const serie = msiiText(record.serie ?? record.serieDocumento ?? record.serie_documento);
  const numero = msiiText(record.numero ?? record.numeroDocumento ?? record.numero_documento);
  const numeroCompleto = [serie, numero].filter(Boolean).join("-");

  if (tipo && numeroCompleto) return `${tipo} ${numeroCompleto}`;
  if (numeroCompleto) return numeroCompleto;
  return fallback;
}

function msiiPrincipalGrupoLabel(source: unknown, documentoBaseId: unknown) {
  const documentoId = msiiText(documentoBaseId);
  const principal = msiiFindRecordById(source, documentoId);

  if (!documentoId) return "OC/OS asociado";
  if (!principal) return `OC/OS documento ${documentoId}`;

  return msiiDocumentoLabel(principal, `OC/OS documento ${documentoId}`);
}

function msiiFacturaGrupoLabel(source: unknown, facturaDocumentoId: unknown, fallback: string) {
  const facturaId = msiiText(facturaDocumentoId);
  const factura = msiiFindRecordById(source, facturaId);

  if (!facturaId) return fallback;
  if (!factura) return fallback;

  return msiiDocumentoLabel(factura, fallback);
}

function asBool(value: unknown) {
  return value === true || String(value).trim().toLowerCase() === "true";
}

function estadoTexto(value: unknown, fallback = "No informado") {
  return textValue(value, fallback);
}

function getEstadoGeneral(evaluacion: FinanzasCorrespondenciaEvaluacion | undefined) {
  return estadoTexto(evaluacion?.estadoGeneral ?? evaluacion?.estado, "Correspondencia pendiente");
}

function getRequiereDecisionHumana(evaluacion: FinanzasCorrespondenciaEvaluacion | undefined) {
  return asBool(evaluacion?.requiereDecisionHumana ?? evaluacion?.requiere_decision_humana);
}

function getPermiteAsociacionOrdinaria(evaluacion: FinanzasCorrespondenciaEvaluacion | undefined) {
  const record = (evaluacion ?? {}) as Record<string, unknown>;
  const value = record.permiteAsociacionOrdinaria ?? record.permite_asociacion_ordinaria;

  if (value === null || value === undefined || value === "") return null;
  return asBool(value);
}

function getAdvertencias(evaluacion: FinanzasCorrespondenciaEvaluacion | undefined) {
  const advertencias = evaluacion?.advertencias;
  return Array.isArray(advertencias) ? advertencias.filter(Boolean).map(String) : [];
}

function getComparacion(
  evaluacion: FinanzasCorrespondenciaEvaluacion | undefined,
  key: "proveedor" | "moneda" | "importe" | "documentoReferenciado",
) {
  const comparaciones = evaluacion?.comparaciones ?? {};
  if (key === "documentoReferenciado") {
    return comparaciones.documentoReferenciado ?? comparaciones.documento_referenciado ?? null;
  }
  return comparaciones[key] ?? null;
}

function getValorFactura(comparacion: ReturnType<typeof getComparacion>) {
  return estadoTexto(
    comparacion?.factura ?? comparacion?.facturaValor ?? comparacion?.valorFactura,
    "No informado",
  );
}

function getValorSustento(comparacion: ReturnType<typeof getComparacion>) {
  return estadoTexto(
    comparacion?.pago ??
      comparacion?.sustento ??
      comparacion?.sustentoValor ??
      comparacion?.valorSustento,
    "No informado",
  );
}

function getResultadoComparacion(comparacion: ReturnType<typeof getComparacion>) {
  return estadoTexto(comparacion?.resultado ?? comparacion?.estado ?? comparacion?.mensaje ?? comparacion?.detalle, "No verificable");
}

function ResultadoBadge({ resultado }: { resultado: string }) {
  const normalized = resultado.toLowerCase();
  const variant = normalized.includes("no coincide") || normalized.includes("bloque") || normalized.includes("incompatible")
    ? "destructive"
    : normalized.includes("coincide") || normalized.includes("valid")
      ? "secondary"
      : "outline";

  return <Badge variant={variant}>{resultado}</Badge>;
}

function EvaluacionCorrespondenciaPago({
  hasSustento,
  isLoading,
  isError,
  evaluacion,
  asociacionYaResuelta,
}: {
  hasSustento: boolean;
  isLoading: boolean;
  isError: boolean;
  evaluacion?: FinanzasCorrespondenciaEvaluacion;
  asociacionYaResuelta: boolean;
}) {
  if (!hasSustento) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        Sin sustento de pago asociado al grupo.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        Revisando factura y sustento de pago...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        No se pudo consultar la evaluación de correspondencia. Mantener revisión humana antes de asociar o validar el sustento.
      </div>
    );
  }

  if (!evaluacion) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        Correspondencia pendiente de evaluación.
      </div>
    );
  }

  const requiereDecisionHumana = getRequiereDecisionHumana(evaluacion);
  const permiteAsociacionOrdinaria = getPermiteAsociacionOrdinaria(evaluacion);
  const advertencias = getAdvertencias(evaluacion);
  const rows = [
    ["Proveedor", getComparacion(evaluacion, "proveedor")],
    ["Moneda", getComparacion(evaluacion, "moneda")],
    ["Importe", getComparacion(evaluacion, "importe")],
    ["Documento referenciado", getComparacion(evaluacion, "documentoReferenciado")],
  ] as const;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          Evaluación técnica: {getEstadoGeneral(evaluacion)}
        </Badge>
        {asociacionYaResuelta ? (
          <Badge variant="secondary">Asociación ya resuelta</Badge>
        ) : null}
        {!asociacionYaResuelta && requiereDecisionHumana ? (
          <Badge variant="secondary">Revisión humana requerida</Badge>
        ) : null}
        {!asociacionYaResuelta && permiteAsociacionOrdinaria === false ? (
          <Badge variant="destructive">Debe decidirse antes de asociar</Badge>
        ) : null}
        {!asociacionYaResuelta && permiteAsociacionOrdinaria === true ? (
          <Badge variant="outline">Asociación ordinaria permitida</Badge>
        ) : null}
      </div>

      {asociacionYaResuelta ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p className="font-medium">Asociación</p>
          <p className="mt-1">
            Ya resuelta para este sustento de pago en el grupo seleccionado.
          </p>
        </div>
      ) : null}

      {!asociacionYaResuelta && requiereDecisionHumana ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Siguiente paso: decisión humana</p>
          <p className="mt-1 text-muted-foreground dark:text-amber-200/80">
            Revise la factura y la transferencia. Luego elija aceptar la asociación u observarla.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Aceptar asociación</Badge>
            <Badge variant="outline">Observar</Badge>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Comparación</th>
              <th className="py-2 pr-3 font-medium">Factura</th>
              <th className="py-2 pr-3 font-medium">Sustento</th>
              <th className="py-2 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, comparacion]) => {
              const resultado = getResultadoComparacion(comparacion);
              return (
                <tr key={label} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{label}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{getValorFactura(comparacion)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{getValorSustento(comparacion)}</td>
                  <td className="py-2"><ResultadoBadge resultado={resultado} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {advertencias.length ? (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          {advertencias.map((advertencia, index) => (
            <p key={`${advertencia}-${index}`}>{advertencia}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EstadoPagoBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className={active ? "gap-1" : "gap-1 text-muted-foreground"}>
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function GrupoPagoCard({
  workspace,
  grupo,
  expedienteId,
  editable,
  canAssociateGroupDocument,
  onRefresh,
  onAdjuntarTransferencia,
}: {
  workspace: unknown;
  grupo: WorkspaceV2GrupoFactura;
  expedienteId: string | number;
  editable: boolean;
  canAssociateGroupDocument: boolean;
  onRefresh: () => Promise<unknown> | unknown;
  onAdjuntarTransferencia?: (grupoFacturaId: string | number) => void;
}) {
  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);
  const pagoDocumento = getTransferenciaDocumento(grupo);
  const pagoDocumentoId = pagoDocumento ? getWorkspaceDocumentoId(pagoDocumento) : null;
  const sustentoPago = Boolean(pagoDocumentoId);
  const principalOperativo = msiiPrincipalGrupoLabel(workspace, principalDocumentoId);
  const facturaOperativa = msiiFacturaGrupoLabel(workspace, facturaDocumentoId, getGrupoFacturaLabel(grupo));
  const correspondenciaQuery = useQuery({
    queryKey: ["finanzas-correspondencia-pago-factura", facturaDocumentoId, pagoDocumentoId],
    enabled: Boolean(facturaDocumentoId && pagoDocumentoId),
    queryFn: () => evaluarCorrespondenciaPagoFactura({
      facturaDocumentoId: facturaDocumentoId as string | number,
      pagoDocumentoId: pagoDocumentoId as string | number,
    }),
  });

  const candidatosGrupoQuery = useQuery({
    queryKey: [
      "finanzas-candidatos-grupo-pago-actual",
      grupoFacturaId,
      pagoDocumentoId,
    ],
    enabled: Boolean(grupoFacturaId && pagoDocumentoId),
    queryFn: () =>
      getDocumentosCandidatosGrupoFacturaV2({
        grupoFacturaId: grupoFacturaId as string | number,
        tipoDocumental: "TRANSFERENCIA",
        pagina: 1,
        limite: 20,
      }),
  });

  const candidatoPagoExacto =
    candidatosGrupoQuery.data?.find(
      (candidato) => String(candidato.documentoId) === String(pagoDocumentoId),
    ) ?? null;

  // GUARD 1:
  // La consulta es paginada. Ausencia del candidato NO demuestra "no asociado".
  // Solo una coincidencia exacta con yaAsociadoGrupoV2=true resuelve el estado.
  const pagoYaAsociadoGrupoActivo =
    candidatoPagoExacto?.yaAsociadoGrupoV2 === true;

  const recepcionConEvidencia = hasAdjunto(grupo, [
    "GUIA_REMISION",
    "GUIA",
    "GUÍA",
    "ADJUNTO_GUIA",
    "NOTA_INGRESO",
    "NOTA INGRESO",
    "ADJUNTO_NOTA_INGRESO",
  ]);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{facturaOperativa}</h3>
            <Badge variant="secondary">Pago en revisión</Badge>
            <Badge variant="outline">OC/OS: {principalOperativo}</Badge>
            <span className="sr-only">
              grupoFacturaId {String(grupoFacturaId ?? "")} documentoBaseId {String(principalDocumentoId ?? "")} facturaDocumentoId {String(facturaDocumentoId ?? "")}
            </span>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
              <dd className="mt-1 font-medium">{getGrupoProveedor(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">RUC</dt>
              <dd className="mt-1 font-medium">{getGrupoRucProveedor(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
              <dd className="mt-1 font-medium">{getGrupoFecha(grupo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Importe</dt>
              <dd className="mt-1 font-medium">{getGrupoImporte(grupo)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Factura seleccionada</Badge>
            <Badge variant="outline">Principal del grupo seleccionado</Badge>
            <Badge variant="outline">Estado documental {textValue(entityVista<Record<string, unknown>>(grupo).estadoRevisionLabel ?? entityVista<Record<string, unknown>>(grupo).estado_revision_label ?? entityVista<Record<string, unknown>>(grupo).estado, "Sin estado")}</Badge>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap gap-2">
              <EstadoPagoBadge label="Factura" active />
              <EstadoPagoBadge label="Recepción" active={recepcionConEvidencia} />
              <EstadoPagoBadge label="Sustento de pago" active={sustentoPago} />
            </div>
            {!recepcionConEvidencia ? (
              <p className="text-xs text-muted-foreground">
                Recepción sin evidencia asociada en el grupo. Finanzas no infiere recepción completa solo por existir factura o grupo persistido.
              </p>
            ) : null}
            {sustentoPago ? (
              <p className="text-xs text-muted-foreground">
                Sustento de pago presente. Finanzas no infiere factura pagada, conciliada, liquidada ni saldo cero sin validación de correspondencia.
              </p>
            ) : null}
            <EvaluacionCorrespondenciaPago
              hasSustento={sustentoPago}
              isLoading={correspondenciaQuery.isLoading || correspondenciaQuery.isFetching}
              isError={correspondenciaQuery.isError}
              evaluacion={correspondenciaQuery.data}
              asociacionYaResuelta={pagoYaAsociadoGrupoActivo}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/workspace/expedientes-v1/${expedienteId}`}>
              <Link2 className="h-4 w-4" />
              Ver trazabilidad completa
            </Link>
          </Button>
          {editable ? (
            <>
              {grupoFacturaId && onAdjuntarTransferencia ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onAdjuntarTransferencia(grupoFacturaId)}
                >
                  Adjuntar sustento de pago
                </Button>
              ) : null}
              <AsociarDocumentoGrupoFacturaPanel
                grupoFacturaId={grupoFacturaId}
                modo="finanzas"
                authorized={canAssociateGroupDocument}
                onAssociated={async () => {
                  await Promise.all([
                    Promise.resolve(onRefresh()),
                    candidatosGrupoQuery.refetch(),
                  ]);
                }}
              />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href={`/finanzas/${expedienteId}/editar?grupoFacturaId=${grupoFacturaId}`}>Adjuntar sustento de pago</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanzasGrupoFacturaPagoPanel({
  id,
  editable = false,
  onAdjuntarTransferencia,
}: {
  id: string | number;
  editable?: boolean;
  onAdjuntarTransferencia?: (grupoFacturaId: string | number) => void;
}) {
  const capabilities = useWorkspaceV2Capabilities();

  const workspaceQuery = useQuery({
    queryKey: ["finanzas-v2-grupos-pago", String(id)],
    queryFn: () => getWorkspaceDocumentalV2(id),
    enabled: Boolean(id),
  });

  if (workspaceQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Pagos por factura</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Pagos por factura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo cargar la información operativa de pago. Finanzas debe esperar la organización documental del grupo.
          </div>
        </CardContent>
      </Card>
    );
  }

  const workspace = workspaceQuery.data;
  const gruposPersistidos = getGruposFactura(workspace).filter((grupo) => Boolean(getGrupoFacturaPersistidoId(grupo)));
  const contexto = getContexto(workspace);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Pagos por factura</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista operativa para revisar factura, sustento de pago y decisión humana cuando corresponda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getContextoEmpresaCodigo(contexto) || "Empresa"}</Badge>
            <Badge variant="outline">{gruposPersistidos.length} factura(s) en revisión</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gruposPersistidos.length ? (
          gruposPersistidos.map((grupo, index) => (
            <GrupoPagoCard
              key={String(getGrupoFacturaPersistidoId(grupo) ?? index)}
              grupo={grupo}
              workspace={workspace}
              expedienteId={id}
              editable={editable}
              canAssociateGroupDocument={capabilities.canAssociateGroupDocument}
              onRefresh={() => workspaceQuery.refetch()}
              onAdjuntarTransferencia={onAdjuntarTransferencia}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No hay facturas organizadas para revisión de pago. Finanzas debe esperar la organización documental de Compras.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
