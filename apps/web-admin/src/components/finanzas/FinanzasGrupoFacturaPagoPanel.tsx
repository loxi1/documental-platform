"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmarOcrConExpediente } from "@/services/ocr-procesamiento";
import { CreditCard, Eye, Link2, Pencil, X } from "lucide-react";

import { AsociarDocumentoGrupoFacturaPanel } from "@/components/documental-v2/AsociarDocumentoGrupoFacturaPanel";
import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { Badge } from "@/components/ui/badge";
import { getDocumentoArchivos } from "@/services/documentos";
import { getRevisionContable } from "@/services/revision-contable";
import { getExpedienteDocumentos } from "@/services/expedientes";
import { getOcrResultado, getOcrResultados } from "@/services/ocr-resultados";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceV2Capabilities } from "@/hooks/useWorkspaceV2Capabilities";
import {
  evaluarCorrespondenciaPagoFactura,
  getDocumentosCandidatosGrupoFacturaV2,
  getGrupoFacturaDocumentosV2,
  getWorkspaceDocumentalV2,
  type FinanzasCorrespondenciaEvaluacion,
} from "@/services/documental-v2-workspace";
import type { WorkspaceV2Documento, WorkspaceV2GrupoFactura } from "@/types/documental-v2-workspace";
import {
  entityVista,
  getAdjuntosGrupo,
  getContexto,
  getContextoEmpresaCodigo,
  getDocumentoPrincipal,
  getDocumentoTipo,
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

function getTransferenciaDocumentos(grupo: WorkspaceV2GrupoFactura) {
  return getAdjuntosGrupo(grupo).filter(isTransferenciaDocumento);
}

function getTransferenciaDocumento(grupo: WorkspaceV2GrupoFactura) {
  return getTransferenciaDocumentos(grupo)[0] ?? null;
}

function numeroFinanzas(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/S\/\.?/gi, "")
    .replace(/PEN/gi, "")
    .replace(/SOLES?/gi, "")
    .replace(/US\$/gi, "")
    .replace(/USD/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function montoDocumentoFinanzas(documento: Record<string, unknown> | null | undefined) {
  if (!documento) return null;

  const metadata =
    documento.metadata &&
    typeof documento.metadata === "object" &&
    !Array.isArray(documento.metadata)
      ? (documento.metadata as Record<string, unknown>)
      : null;

  return numeroFinanzas(
    documento.monto_total ??
      documento.montoTotal ??
      metadata?.montoTotal ??
      metadata?.monto_total,
  );
}

function monedaFinanzas(documento: Record<string, unknown> | null | undefined) {
  if (!documento) return "PEN";

  const metadata =
    documento.metadata &&
    typeof documento.metadata === "object" &&
    !Array.isArray(documento.metadata)
      ? (documento.metadata as Record<string, unknown>)
      : null;
  const metadataOcr =
    metadata?.ocr &&
    typeof metadata.ocr === "object" &&
    !Array.isArray(metadata.ocr)
      ? (metadata.ocr as Record<string, unknown>)
      : null;
  const metadataOcrConfirmada =
    metadataOcr?.metadata &&
    typeof metadataOcr.metadata === "object" &&
    !Array.isArray(metadataOcr.metadata)
      ? (metadataOcr.metadata as Record<string, unknown>)
      : null;
  const metadataCompatibilidad =
    metadata?.compatibilidad &&
    typeof metadata.compatibilidad === "object" &&
    !Array.isArray(metadata.compatibilidad)
      ? (metadata.compatibilidad as Record<string, unknown>)
      : null;
  const metadataDocumentoV1 =
    metadataCompatibilidad?.documentoV1 &&
    typeof metadataCompatibilidad.documentoV1 === "object" &&
    !Array.isArray(metadataCompatibilidad.documentoV1)
      ? (metadataCompatibilidad.documentoV1 as Record<string, unknown>)
      : null;

  const raw = String(
    documento.moneda ??
      metadata?.moneda ??
      metadataOcrConfirmada?.moneda ??
      metadataDocumentoV1?.moneda ??
      "PEN",
  )
    .trim()
    .toUpperCase();
  const normalizada = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s._-]+/g, "");

  if (["S/", "S/.", "SOLES", "SOL", "PEN"].includes(raw)) return "PEN";
  if (
    ["$", "US$", "USD", "DOLARES", "DOLAR"].includes(raw) ||
    ["DOLARESAMERICANOS", "DOLARAME", "USDDOLLARS"].includes(normalizada)
  ) {
    return "USD";
  }
  return raw || "PEN";
}
function formatMontoFinanzas(value: number, currency = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "PEN",
  }).format(value);
}

function banderaRevisionFinanzasFila(item: unknown) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;

  const record = item as Record<string, unknown>;
  const fila =
    record.filaFactura &&
    typeof record.filaFactura === "object" &&
    !Array.isArray(record.filaFactura)
      ? (record.filaFactura as Record<string, unknown>)
      : null;

  return Boolean(
    fila?.requiereRevisionFinanzas ??
      fila?.requiere_revision_finanzas ??
      record.requiereRevisionFinanzas ??
      record.requiere_revision_finanzas ??
      false,
  );
}

function filaGrupoFacturaId(item: unknown) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const record = item as Record<string, unknown>;
  const fila =
    record.filaFactura &&
    typeof record.filaFactura === "object" &&
    !Array.isArray(record.filaFactura)
      ? (record.filaFactura as Record<string, unknown>)
      : null;

  return (
    fila?.grupoFacturaId ??
    fila?.grupo_factura_id ??
    record.grupoFacturaId ??
    record.grupo_factura_id ??
    null
  );
}

function filaExpedienteId(item: unknown) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const record = item as Record<string, unknown>;
  const fila =
    record.filaFactura &&
    typeof record.filaFactura === "object" &&
    !Array.isArray(record.filaFactura)
      ? (record.filaFactura as Record<string, unknown>)
      : null;

  return (
    fila?.expedienteId ??
    fila?.expediente_id ??
    record.expedienteId ??
    record.expediente_id ??
    null
  );
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

type ComparacionPagoLabel =
  | "Proveedor"
  | "Moneda"
  | "Importe"
  | "Documento referenciado";

function getValorSustentoVisual(
  label: ComparacionPagoLabel,
  comparacion: ReturnType<typeof getComparacion>,
  metadataEfectiva?: Record<string, unknown> | null,
) {
  if (!metadataEfectiva) {
    return getValorSustento(comparacion);
  }

  let valorDraft: unknown = null;

  if (label === "Proveedor") {
    valorDraft =
      metadataEfectiva.rucProveedor ??
      metadataEfectiva.proveedorNombre;
  } else if (label === "Moneda") {
    valorDraft = metadataEfectiva.moneda;
  } else if (label === "Importe") {
    valorDraft = metadataEfectiva.montoTotal;
  } else if (label === "Documento referenciado") {
    valorDraft =
      metadataEfectiva.documentoReferenciado ??
      metadataEfectiva.comprobante;
  }

  if (
    valorDraft === null ||
    valorDraft === undefined ||
    (typeof valorDraft === "string" && valorDraft.trim() === "")
  ) {
    return getValorSustento(comparacion);
  }

  if (label === "Importe") {
    const importeNumero =
      typeof valorDraft === "number"
        ? valorDraft
        : Number(String(valorDraft).replace(/,/g, ""));

    if (Number.isFinite(importeNumero)) {
      return importeNumero.toFixed(2);
    }
  }

  return estadoTexto(valorDraft, getValorSustento(comparacion));
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
  sustentoMetadataEfectiva,
}: {
  hasSustento: boolean;
  isLoading: boolean;
  isError: boolean;
  evaluacion?: FinanzasCorrespondenciaEvaluacion;
  asociacionYaResuelta: boolean;
  sustentoMetadataEfectiva?: Record<string, unknown> | null;
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
          Estado de validación: {getEstadoGeneral(evaluacion)}
        </Badge>
        {asociacionYaResuelta ? (
          <Badge variant="secondary">Validación registrada</Badge>
        ) : null}
        {!asociacionYaResuelta && requiereDecisionHumana ? (
          <Badge variant="secondary">Revisión requerida</Badge>
        ) : null}
        {!asociacionYaResuelta && permiteAsociacionOrdinaria === false ? (
          <Badge variant="destructive">Requiere validación</Badge>
        ) : null}
        {!asociacionYaResuelta && permiteAsociacionOrdinaria === true ? (
          <Badge variant="outline">Validación disponible</Badge>
        ) : null}
      </div>

      {asociacionYaResuelta ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p className="font-medium">Validación</p>
          <p className="mt-1">
            Este sustento de pago ya tiene una decisión registrada para la factura seleccionada.
          </p>
        </div>
      ) : null}

      {!asociacionYaResuelta && requiereDecisionHumana ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Siguiente paso: validar sustento</p>
          <p className="mt-1 text-muted-foreground dark:text-amber-200/80">
            Revise la factura y el sustento de pago antes de confirmar.
          </p>
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
                  <td className="py-2 pr-3 text-muted-foreground">
                    {getValorSustentoVisual(
                      label,
                      comparacion,
                      sustentoMetadataEfectiva,
                    )}
                  </td>
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
  documentos,
  principalSlot,
  canAssociateGroupDocument,
  onRefresh,
  ocrResultadoIdDecisionForzada = null,
  onDecisionResuelta,
  onAdjuntarTransferencia,
  onEditarPago,
}: {
  workspace: unknown;
  grupo: WorkspaceV2GrupoFactura;
  expedienteId: string | number;
  editable: boolean;
  documentos: Array<Record<string, unknown>>;
  principalSlot?: ReactNode;
  canAssociateGroupDocument: boolean;
  onRefresh: () => Promise<unknown> | unknown;
  ocrResultadoIdDecisionForzada?: number | null;
  onDecisionResuelta?: () => void;
  onAdjuntarTransferencia?: (grupoFacturaId: string | number) => void;
  onEditarPago?: (documento: Record<string, unknown>) => void;
}) {
  const [previewPagoAbierto, setPreviewPagoAbierto] = useState(false);
  const [previewPagoPersistido, setPreviewPagoPersistido] = useState<{
    archivoId: string | number;
    title: string;
  } | null>(null);
  const [previewPagoPersistidoLoading, setPreviewPagoPersistidoLoading] = useState<
    string | number | null
  >(null);
  const [previewPagoPersistidoError, setPreviewPagoPersistidoError] = useState<
    string | null
  >(null);
  const [previewFacturaAbierto, setPreviewFacturaAbierto] = useState(false);

  const grupoFacturaId = getGrupoFacturaPersistidoId(grupo);
  const principalDocumentoId = getGrupoDocumentoPrincipalDocumentoId(grupo);
  const facturaDocumentoId = getGrupoFacturaDocumentoId(grupo);

  const pagosDocumento = getTransferenciaDocumentos(grupo);
  const pagoDocumento = pagosDocumento[0] ?? null;
  const pagoDocumentoId = pagoDocumento ? getWorkspaceDocumentoId(pagoDocumento) : null;

  const vinculosGrupoQuery = useQuery({
    queryKey: [
      "finanzas-v2-grupos-pago",
      String(expedienteId),
      "vinculos-activos",
      String(grupoFacturaId),
    ],
    enabled: Boolean(grupoFacturaId),
    queryFn: () =>
      getGrupoFacturaDocumentosV2(grupoFacturaId as string | number),
  });

  const vinculosGrupo = vinculosGrupoQuery.data ?? [];

  const vinculosPagoActivos = vinculosGrupo.filter((vinculo) => {
    const record = vinculo as Record<string, unknown>;
    const estado = String(record.estado ?? "").trim().toLowerCase();
    const tipoRelacion = String(
      record.tipoRelacion ?? record.tipo_relacion ?? "",
    )
      .trim()
      .toLowerCase();

    return estado === "activo" && tipoRelacion === "adjunto_transferencia";
  });

  // R9:
  // Cardinalidad canónica = vínculos activos de grupo_factura_documentos.
  // documentos[] solo enriquece por documentoId. Si falta el documento,
  // el vínculo se conserva y no se inventa monto.
  const pagosPersistidos: Record<string, unknown>[] = vinculosPagoActivos.map(
    (vinculo) => {
      const recordVinculo = vinculo as Record<string, unknown>;
      const documentoId =
        recordVinculo.documentoId ??
        recordVinculo.documento_id ??
        null;

      const documentoPersistido =
        documentos.find((documento) => {
          const persistidoId =
            documento.documento_id ??
            documento.documentoId ??
            documento.id;

          return (
            documentoId !== null &&
            documentoId !== undefined &&
            String(persistidoId ?? "") === String(documentoId)
          );
        }) ?? null;

      const metadataVinculo =
        recordVinculo.metadata &&
        typeof recordVinculo.metadata === "object" &&
        !Array.isArray(recordVinculo.metadata)
          ? (recordVinculo.metadata as Record<string, unknown>)
          : null;

      const metadataPersistida =
        documentoPersistido?.metadata &&
        typeof documentoPersistido.metadata === "object" &&
        !Array.isArray(documentoPersistido.metadata)
          ? (documentoPersistido.metadata as Record<string, unknown>)
          : null;

      return {
        ...recordVinculo,
        ...(documentoPersistido ?? {}),
        documentoId,
        documento_id: documentoId,
        grupoFacturaId:
          recordVinculo.grupoFacturaId ??
          recordVinculo.grupo_factura_id ??
          grupoFacturaId,
        tipoRelacion:
          recordVinculo.tipoRelacion ??
          recordVinculo.tipo_relacion ??
          null,
        estadoVinculo: recordVinculo.estado ?? null,
        metadata:
          metadataPersistida || metadataVinculo
            ? {
                ...(metadataVinculo ?? {}),
                ...(metadataPersistida ?? {}),
              }
            : undefined,
      } as Record<string, unknown>;
    },
  );

  const facturaDocumentoPersistido =
    documentos.find((documento) => {
      const documentoId =
        documento.documento_id ??
        documento.documentoId ??
        documento.id;

      return (
        facturaDocumentoId !== null &&
        facturaDocumentoId !== undefined &&
        String(documentoId ?? "") === String(facturaDocumentoId)
      );
    }) ?? null;

  const facturaMontoNumero = montoDocumentoFinanzas(facturaDocumentoPersistido);
  const facturaMoneda = monedaFinanzas(facturaDocumentoPersistido);

  const pagadoAcumulado = pagosPersistidos.reduce((acumulado, documento) => {
    return acumulado + (montoDocumentoFinanzas(documento) ?? 0);
  }, 0);

  const saldoPendiente =
    facturaMontoNumero !== null
      ? Math.max(
          Math.round((facturaMontoNumero - pagadoAcumulado) * 100) / 100,
          0,
        )
      : null;

  const estadoPagoFactura =
    facturaMontoNumero === null
      ? "PENDIENTE DE PAGO"
      : saldoPendiente !== null && saldoPendiente <= 0.01
        ? "COMPLETO"
        : pagosPersistidos.length > 0
          ? "PENDIENTE DE PAGO"
          : "SIN PAGOS";

  async function abrirPreviewPagoPersistido(
    documento: Record<string, unknown>,
    index: number,
  ) {
    const documentoId =
      documento.documento_id ??
      documento.documentoId ??
      documento.id;

    if (
      documentoId === null ||
      documentoId === undefined ||
      String(documentoId).trim() === ""
    ) {
      setPreviewPagoPersistidoError(
        "El pago no tiene documento asociado para previsualizar.",
      );
      return;
    }

    setPreviewPagoPersistidoError(null);
    setPreviewPagoPersistidoLoading(documentoId as string | number);

    try {
      const response = await getDocumentoArchivos(
        documentoId as string | number,
      );
      const archivos = response?.data ?? response?.archivos ?? [];
      const actual =
        archivos.find((archivo) => archivo.es_version_actual === true) ??
        (archivos.length === 1 ? archivos[0] : null);

      if (!actual?.id) {
        setPreviewPagoPersistidoError(
          "El pago no tiene archivo disponible para previsualizar.",
        );
        return;
      }

      setPreviewPagoPersistido({
        archivoId: actual.id,
        title: `Pago ${index + 1}`,
      });
    } catch {
      setPreviewPagoPersistidoError(
        "No se pudo cargar el documento del pago.",
      );
    } finally {
      setPreviewPagoPersistidoLoading(null);
    }
  }

  const puedeAdjuntarOtroPago =
    saldoPendiente === null || saldoPendiente > 0.01;

  const candidatosGrupoQuery = useQuery({
    queryKey: [
      "finanzas-candidatos-grupo-pago-actual",
      grupoFacturaId,
    ],
    enabled: Boolean(grupoFacturaId),
    queryFn: () =>
      getDocumentosCandidatosGrupoFacturaV2({
        grupoFacturaId: grupoFacturaId as string | number,
        tipoDocumental: "TRANSFERENCIA",
        pagina: 1,
        limite: 20,
      }),
  });

  const grupoFacturaIdNumerico = Number(grupoFacturaId);
  const grupoFacturaIdValido =
    Number.isInteger(grupoFacturaIdNumerico) && grupoFacturaIdNumerico > 0;

  const contextoOperativoFinanzas = getContexto(
    workspace as Parameters<typeof getContexto>[0],
  );
  const empresaFinanzas = String(
    getContextoEmpresaCodigo(contextoOperativoFinanzas) ?? "",
  )
    .trim()
    .toUpperCase();

  const revisionFinanzasCanonicaQuery = useQuery({
    queryKey: [
      "finanzas-revision-canonica-grupo",
      empresaFinanzas,
      String(expedienteId ?? ""),
      String(grupoFacturaId ?? ""),
    ],
    enabled: Boolean(
      empresaFinanzas &&
        expedienteId &&
        grupoFacturaIdValido,
    ),
    queryFn: () =>
      getRevisionContable({
        empresa: empresaFinanzas,
        soloPendientesFinanzas: true,
        limit: 100,
        offset: 0,
      }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const revisionFinanzasCanonicaActiva =
    revisionFinanzasCanonicaQuery.data?.items?.some(
      (item) =>
        String(filaExpedienteId(item) ?? "") === String(expedienteId ?? "") &&
        String(filaGrupoFacturaId(item) ?? "") === String(grupoFacturaId ?? ""),
    ) ?? false;

  const queryClient = useQueryClient();
  const [motivoDecisionInline, setMotivoDecisionInline] = useState("");
  const [decisionInlineEnviando, setDecisionInlineEnviando] = useState(false);
  const [decisionInlineError, setDecisionInlineError] = useState<string | null>(
    null,
  );

  const ocrResultadosGrupoQuery = useQuery({
    queryKey: [
      "finanzas-ocr-pago-pendiente-grupo",
      grupoFacturaId,
    ],
    enabled: Boolean(grupoFacturaIdValido),
    queryFn: () =>
      getOcrResultados({
        grupoFacturaId: grupoFacturaIdNumerico,
      }),
  });

  const ocrTransferenciasPendientes =
    ocrResultadosGrupoQuery.data?.filter((ocr) => {
      const tipo = String(ocr.tipo_propuesto ?? "").toUpperCase();
      const estado = String(ocr.estado ?? "").toLowerCase();
      const grupoCoincide =
        ocr.grupoFacturaId !== null &&
        ocr.grupoFacturaId !== undefined &&
        String(ocr.grupoFacturaId) === String(grupoFacturaId);

      return (
        tipo === "TRANSFERENCIA" &&
        estado === "pendiente_validacion" &&
        grupoCoincide &&
        ocr.documento_id !== null &&
        ocr.documento_id !== undefined &&
        Number.isInteger(Number(ocr.documento_id)) &&
        Number(ocr.documento_id) > 0 &&
        Number.isInteger(Number(ocr.archivo_id)) &&
        Number(ocr.archivo_id) > 0
      );
    }) ?? [];

  function metadataOcrDetalle(
    detalle: Record<string, unknown> | null | undefined,
  ) {
    if (!detalle) return null;

    const metadata =
      detalle.metadata &&
      typeof detalle.metadata === "object" &&
      !Array.isArray(detalle.metadata)
        ? (detalle.metadata as Record<string, unknown>)
        : null;

    const metadataInterna =
      metadata?.metadata &&
      typeof metadata.metadata === "object" &&
      !Array.isArray(metadata.metadata)
        ? (metadata.metadata as Record<string, unknown>)
        : null;

    return metadataInterna ?? metadata;
  }

  function validacionPendienteDesdeDetalle(
    detalle: Record<string, unknown> | null | undefined,
  ) {
    if (!detalle) return null;

    const metadataExterior =
      detalle.metadata &&
      typeof detalle.metadata === "object" &&
      !Array.isArray(detalle.metadata)
        ? (detalle.metadata as Record<string, unknown>)
        : null;

    const metadataInterior =
      metadataExterior?.metadata &&
      typeof metadataExterior.metadata === "object" &&
      !Array.isArray(metadataExterior.metadata)
        ? (metadataExterior.metadata as Record<string, unknown>)
        : null;

    const draftExterior =
      metadataExterior?.validacionPendientePago &&
      typeof metadataExterior.validacionPendientePago === "object" &&
      !Array.isArray(metadataExterior.validacionPendientePago)
        ? (metadataExterior.validacionPendientePago as Record<string, unknown>)
        : null;

    const draftInterior =
      metadataInterior?.validacionPendientePago &&
      typeof metadataInterior.validacionPendientePago === "object" &&
      !Array.isArray(metadataInterior.validacionPendientePago)
        ? (metadataInterior.validacionPendientePago as Record<string, unknown>)
        : null;

    return draftExterior ?? draftInterior;
  }

  function identidadPendienteDesdeDraft(
    draft: Record<string, unknown> | null,
  ) {
    if (!draft) return null;

    return draft.identidad &&
      typeof draft.identidad === "object" &&
      !Array.isArray(draft.identidad)
      ? (draft.identidad as Record<string, unknown>)
      : draft;
  }

  // 160: auditoría read-only. La lista observada se deriva del estado
  // persistido CONSUMIDO + OBSERVAR y nunca participa en pagosPersistidos.
  const ocrCandidatosObservados =
    ocrResultadosGrupoQuery.data?.filter((ocr) => {
      const tipo = String(ocr.tipo_propuesto ?? "").toUpperCase();
      const estado = String(ocr.estado ?? "").toLowerCase();
      const grupoCoincide =
        ocr.grupoFacturaId !== null &&
        ocr.grupoFacturaId !== undefined &&
        String(ocr.grupoFacturaId) === String(grupoFacturaId);

      return (
        tipo === "TRANSFERENCIA" &&
        estado === "confirmado" &&
        grupoCoincide &&
        Number.isInteger(Number(ocr.id)) &&
        Number(ocr.id) > 0
      );
    }) ?? [];

  const ocrDetallesObservadosQueries = useQueries({
    queries: ocrCandidatosObservados.map((ocr) => ({
      queryKey: ["finanzas-ocr-observado-detalle", Number(ocr.id)],
      queryFn: () => getOcrResultado(Number(ocr.id)),
      staleTime: 0,
      refetchOnMount: "always" as const,
    })),
  });

  const sustentosObservados: Record<string, unknown>[] =
    ocrDetallesObservadosQueries.flatMap((query) => {
      const detalle =
        query.data && typeof query.data === "object" && !Array.isArray(query.data)
          ? (query.data as unknown as Record<string, unknown>)
          : null;
      if (!detalle) return [];

      const draft = validacionPendienteDesdeDetalle(detalle);
      const identidad = identidadPendienteDesdeDraft(draft);
      const estado = String(draft?.estado ?? "").toUpperCase();
      const accion = String(draft?.accion ?? "").toUpperCase();
      const grupoCoincide =
        String(identidad?.grupoFacturaId ?? "") === String(grupoFacturaId ?? "");
      const expedienteCoincide =
        String(identidad?.expedienteId ?? "") === String(expedienteId ?? "");
      const facturaCoincide =
        String(identidad?.facturaDocumentoId ?? "") ===
        String(facturaDocumentoId ?? "");

      if (
        estado !== "CONSUMIDO" ||
        accion !== "OBSERVAR" ||
        !grupoCoincide ||
        !expedienteCoincide ||
        !facturaCoincide
      ) {
        return [];
      }

      const metadataConfirmada = metadataOcrDetalle(detalle);
      return [{
        ...detalle,
        documentoId: detalle.documento_id ?? identidad?.documentoId ?? null,
        documento_id: detalle.documento_id ?? identidad?.documentoId ?? null,
        metadata: {
          ...(metadataConfirmada ?? {}),
          ocr: detalle.metadata,
        },
        validacionPendientePago: draft,
      }];
    });

  const documentosExpedienteQuery = useQuery({
    queryKey: ["expedientes", String(expedienteId ?? ""), "documentos"],
    enabled: Boolean(
      revisionFinanzasCanonicaActiva &&
        expedienteId &&
        grupoFacturaIdValido,
    ),
    queryFn: () => getExpedienteDocumentos(expedienteId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const documentosExpediente = (() => {
    const value = documentosExpedienteQuery.data as unknown;

    if (Array.isArray(value)) {
      return value as Array<Record<string, unknown>>;
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.items)) {
      return record.items as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.documentos)) {
      return record.documentos as Array<Record<string, unknown>>;
    }

    if (
      record.data &&
      typeof record.data === "object" &&
      !Array.isArray(record.data)
    ) {
      const nested = record.data as Record<string, unknown>;

      if (Array.isArray(nested.items)) {
        return nested.items as Array<Record<string, unknown>>;
      }

      if (Array.isArray(nested.documentos)) {
        return nested.documentos as Array<Record<string, unknown>>;
      }

      if (Array.isArray(nested.results)) {
        return nested.results as Array<Record<string, unknown>>;
      }
    }

    if (Array.isArray(record.results)) {
      return record.results as Array<Record<string, unknown>>;
    }

    return [];
  })();

  const decisionPersistenteQuery = useQuery({
    queryKey: [
      "finanzas-ocr-decision-persistente-grupo",
      String(expedienteId ?? ""),
      String(grupoFacturaId ?? ""),
      String(facturaDocumentoId ?? ""),
    ],
    enabled: Boolean(
      revisionFinanzasCanonicaActiva &&
        grupoFacturaIdValido &&
        expedienteId &&
        facturaDocumentoId &&
        documentosExpedienteQuery.isSuccess,
    ),
    queryFn: async () => {
      const candidatosPersistidos = documentosExpediente
        .map((documento) => {
          const metadata =
            documento.metadata &&
            typeof documento.metadata === "object" &&
            !Array.isArray(documento.metadata)
              ? (documento.metadata as Record<string, unknown>)
              : null;

          const metadataOcr =
            metadata?.ocr &&
            typeof metadata.ocr === "object" &&
            !Array.isArray(metadata.ocr)
              ? (metadata.ocr as Record<string, unknown>)
              : null;

          const draftExterior =
            metadata?.validacionPendientePago &&
            typeof metadata.validacionPendientePago === "object" &&
            !Array.isArray(metadata.validacionPendientePago)
              ? (metadata.validacionPendientePago as Record<string, unknown>)
              : null;

          const draftOcr =
            metadataOcr?.validacionPendientePago &&
            typeof metadataOcr.validacionPendientePago === "object" &&
            !Array.isArray(metadataOcr.validacionPendientePago)
              ? (metadataOcr.validacionPendientePago as Record<string, unknown>)
              : null;

          const draft = draftExterior ?? draftOcr;
          const identidad = identidadPendienteDesdeDraft(draft);

          const draftGrupoFacturaId =
            identidad?.grupoFacturaId ?? draft?.grupoFacturaId;
          const draftExpedienteId =
            identidad?.expedienteId ?? draft?.expedienteId;
          const draftFacturaDocumentoId =
            identidad?.facturaDocumentoId ?? draft?.facturaDocumentoId;
          const ocrResultadoId =
            identidad?.ocrResultadoId ??
            draft?.ocrResultadoId ??
            metadata?.ocrResultadoId ??
            metadataOcr?.ocrResultadoId ??
            null;

          return {
            draft,
            identidad,
            draftGrupoFacturaId,
            draftExpedienteId,
            draftFacturaDocumentoId,
            ocrResultadoId,
          };
        })
        .filter((candidato) => {
          if (
            String(candidato.draft?.estado ?? "").toUpperCase() !==
            "PENDIENTE_DECISION"
          ) {
            return false;
          }

          return (
            String(candidato.draftGrupoFacturaId ?? "") ===
              String(grupoFacturaId ?? "") &&
            String(candidato.draftExpedienteId ?? "") ===
              String(expedienteId ?? "") &&
            String(candidato.draftFacturaDocumentoId ?? "") ===
              String(facturaDocumentoId ?? "")
          );
        });

      for (const candidato of candidatosPersistidos) {
        const ocrId = Number(candidato.ocrResultadoId);
        if (!Number.isInteger(ocrId) || ocrId <= 0) continue;

        const detalle = await getOcrResultado(ocrId);
        const detalleRecord = detalle as unknown as Record<string, unknown>;

        const draftDetalle =
          validacionPendienteDesdeDetalle(detalleRecord) ?? candidato.draft;

        if (
          String(draftDetalle?.estado ?? "").toUpperCase() !==
          "PENDIENTE_DECISION"
        ) {
          continue;
        }

        const identidadDetalle =
          identidadPendienteDesdeDraft(draftDetalle) ?? candidato.identidad;

        const draftGrupoFacturaId =
          identidadDetalle?.grupoFacturaId ?? draftDetalle?.grupoFacturaId;
        const draftExpedienteId =
          identidadDetalle?.expedienteId ?? draftDetalle?.expedienteId;
        const draftFacturaDocumentoId =
          identidadDetalle?.facturaDocumentoId ??
          draftDetalle?.facturaDocumentoId;
        const pagoDocumentoId =
          identidadDetalle?.documentoId ??
          draftDetalle?.documentoId ??
          detalle.documento_id;

        if (
          String(draftGrupoFacturaId ?? "") !== String(grupoFacturaId ?? "") ||
          String(draftExpedienteId ?? "") !== String(expedienteId ?? "") ||
          String(draftFacturaDocumentoId ?? "") !==
            String(facturaDocumentoId ?? "")
        ) {
          continue;
        }

        const pagoDocumentoIdNumero = Number(pagoDocumentoId);
        if (
          !Number.isInteger(pagoDocumentoIdNumero) ||
          pagoDocumentoIdNumero <= 0
        ) {
          continue;
        }

        const evaluacionActual = await evaluarCorrespondenciaPagoFactura({
          facturaDocumentoId: Number(facturaDocumentoId),
          pagoDocumentoId: pagoDocumentoIdNumero,
        });

        const estadoActual = String(
          evaluacionActual?.estado ?? "",
        ).toUpperCase();

        if (
          estadoActual === "OBSERVADA" ||
          estadoActual === "VALIDADA" ||
          estadoActual === "EXCEPCION_AUTORIZADA"
        ) {
          continue;
        }

        return {
          resumen: detalle,
          detalle,
          evaluacion: evaluacionActual,
        };
      }

      return null;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const ocrPersistidoDecision =
    decisionPersistenteQuery.data?.resumen ?? null;

  const ocrForzadoDecision =
    ocrResultadoIdDecisionForzada !== null
      ? ocrResultadosGrupoQuery.data?.find(
          (ocr) =>
            Number(ocr.id) === Number(ocrResultadoIdDecisionForzada) &&
            String(ocr.tipo_propuesto ?? "").toUpperCase() === "TRANSFERENCIA" &&
            String(ocr.grupoFacturaId ?? "") === String(grupoFacturaId ?? ""),
        ) ?? null
      : null;

  const ocrPendienteUnico =
    ocrForzadoDecision ??
    ocrPersistidoDecision ??
    (ocrTransferenciasPendientes.length === 1
      ? ocrTransferenciasPendientes.reduce(
          (_unico, actual) => actual,
          null as (typeof ocrTransferenciasPendientes)[number] | null,
        )
      : null);

  const existeTransferenciaPendiente =
    ocrTransferenciasPendientes.length > 0 ||
    Boolean(ocrForzadoDecision) ||
    Boolean(ocrPersistidoDecision) ||
    revisionFinanzasCanonicaActiva;

  const ocrDetalleQuery = useQuery({
    queryKey: [
      "finanzas-ocr-pago-pendiente-detalle",
      ocrPendienteUnico?.id ?? null,
    ],
    enabled: Boolean(ocrPendienteUnico?.id),
    queryFn: () =>
      getOcrResultado(Number(ocrPendienteUnico?.id)),
  });

  const ocrDetalle = ocrDetalleQuery.data ?? null;

  const ocrDetalleValido =
    Boolean(ocrPendienteUnico && ocrDetalle) &&
    Number(ocrDetalle?.id) === Number(ocrPendienteUnico?.id) &&
    Number(ocrDetalle?.documento_id) === Number(ocrPendienteUnico?.documento_id) &&
    Number(ocrDetalle?.archivo_id) === Number(ocrPendienteUnico?.archivo_id) &&
    String(ocrDetalle?.tipo_propuesto ?? "").toUpperCase() === "TRANSFERENCIA" &&
    (
      String(ocrDetalle?.estado ?? "").toLowerCase() === "pendiente_validacion" ||
      (
        (
          ocrResultadoIdDecisionForzada !== null &&
          Number(ocrDetalle?.id) === Number(ocrResultadoIdDecisionForzada)
        ) ||
        (
          ocrPersistidoDecision &&
          Number(ocrDetalle?.id) === Number(ocrPersistidoDecision.id)
        )
      )
    ) &&
    (
      ocrDetalle?.grupoFacturaId === null ||
      ocrDetalle?.grupoFacturaId === undefined ||
      String(ocrDetalle.grupoFacturaId) === String(grupoFacturaId)
    );

  const ocrDetalleMetadata =
    ocrDetalle?.metadata &&
    typeof ocrDetalle.metadata === "object" &&
    !Array.isArray(ocrDetalle.metadata)
      ? (ocrDetalle.metadata as Record<string, unknown>)
      : null;

  const validacionPendientePago =
    ocrDetalleMetadata?.validacionPendientePago &&
    typeof ocrDetalleMetadata.validacionPendientePago === "object" &&
    !Array.isArray(ocrDetalleMetadata.validacionPendientePago)
      ? (ocrDetalleMetadata.validacionPendientePago as Record<string, unknown>)
      : null;

  const validacionPendienteRequest =
    validacionPendientePago?.request &&
    typeof validacionPendientePago.request === "object" &&
    !Array.isArray(validacionPendientePago.request)
      ? (validacionPendientePago.request as Record<string, unknown>)
      : null;

  const validacionPendienteIdentidad =
    validacionPendientePago?.identidad &&
    typeof validacionPendientePago.identidad === "object" &&
    !Array.isArray(validacionPendientePago.identidad)
      ? (validacionPendientePago.identidad as Record<string, unknown>)
      : validacionPendientePago;

  const draftGrupoFacturaId =
    validacionPendienteIdentidad?.grupoFacturaId ??
    validacionPendienteRequest?.grupoFacturaId;

  const draftExpedienteId =
    validacionPendienteIdentidad?.expedienteId ??
    validacionPendienteRequest?.expedienteId;

  const draftDocumentoBaseId =
    validacionPendienteIdentidad?.documentoBaseId ??
    validacionPendienteRequest?.documentoBaseId;

  const draftDocumentoId =
    validacionPendienteIdentidad?.documentoId ??
    validacionPendientePago?.documentoId ??
    ocrDetalle?.documento_id;

  const draftOcrResultadoId =
    validacionPendienteIdentidad?.ocrResultadoId ??
    validacionPendientePago?.ocrResultadoId ??
    ocrDetalle?.id;

  const draftFacturaDocumentoId =
    validacionPendienteIdentidad?.facturaDocumentoId ??
    validacionPendientePago?.facturaDocumentoId ??
    validacionPendienteRequest?.facturaDocumentoId;

  const identidadBaseCoincide =
    String(draftGrupoFacturaId ?? "") === String(grupoFacturaId ?? "") &&
    String(draftExpedienteId ?? "") === String(expedienteId ?? "") &&
    String(draftDocumentoBaseId ?? "") === String(principalDocumentoId ?? "") &&
    String(draftDocumentoId ?? "") === String(ocrDetalle?.documento_id ?? "") &&
    String(draftOcrResultadoId ?? "") === String(ocrDetalle?.id ?? "");

  const identidadFacturaCoincide =
    draftFacturaDocumentoId === null ||
    draftFacturaDocumentoId === undefined ||
    String(draftFacturaDocumentoId) === String(facturaDocumentoId ?? "");

  const validacionPendienteMetadata =
    validacionPendienteRequest?.metadata &&
    typeof validacionPendienteRequest.metadata === "object" &&
    !Array.isArray(validacionPendienteRequest.metadata)
      ? (validacionPendienteRequest.metadata as Record<string, unknown>)
      : null;

  const validacionPendientePagoValida =
    ocrDetalleValido &&
    String(validacionPendientePago?.estado ?? "").toUpperCase() ===
      "PENDIENTE_DECISION" &&
    identidadBaseCoincide &&
    identidadFacturaCoincide &&
    Boolean(validacionPendienteMetadata);

  const pagoDocumentoIdRecuperado =
    validacionPendientePagoValida
      ? ocrDetalle?.documento_id ?? null
      : null;

  async function resolverDecisionHumanaInline(
    accion: "OBSERVAR" | "AUTORIZAR_EXCEPCION",
  ) {
    const motivo = motivoDecisionInline.trim();
    if (!motivo) {
      setDecisionInlineError("Ingrese un comentario antes de registrar la decisión.");
      return;
    }

    const ocrResultadoId = Number(draftOcrResultadoId ?? ocrDetalle?.id);
    const expedienteIdPayload = Number(
      validacionPendienteRequest?.expedienteId ?? expedienteId,
    );
    const documentoBaseIdPayload = Number(
      validacionPendienteRequest?.documentoBaseId ?? principalDocumentoId,
    );
    const grupoFacturaIdPayload = Number(
      validacionPendienteRequest?.grupoFacturaId ?? grupoFacturaId,
    );

    if (
      !validacionPendientePagoValida ||
      !Number.isInteger(ocrResultadoId) ||
      ocrResultadoId <= 0 ||
      !Number.isInteger(expedienteIdPayload) ||
      expedienteIdPayload <= 0 ||
      !Number.isInteger(documentoBaseIdPayload) ||
      documentoBaseIdPayload <= 0 ||
      !Number.isInteger(grupoFacturaIdPayload) ||
      grupoFacturaIdPayload <= 0
    ) {
      setDecisionInlineError(
        "No se pudo reconstruir de forma segura la validación pendiente.",
      );
      return;
    }

    const tipoRelacion = textValue(
      validacionPendienteRequest?.tipoRelacion,
      "adjunto_transferencia",
    );
    const ordenRaw = Number(validacionPendienteRequest?.orden ?? 20);
    const orden =
      Number.isInteger(ordenRaw) && ordenRaw > 0 ? ordenRaw : 20;

    setDecisionInlineEnviando(true);
    setDecisionInlineError(null);

    try {
      await confirmarOcrConExpediente(ocrResultadoId, {
        expedienteId: expedienteIdPayload,
        documentoBaseId: documentoBaseIdPayload,
        grupoFacturaId: grupoFacturaIdPayload,
        tipoRelacion,
        esPrincipal: false,
        orden,
        metadata: validacionPendienteMetadata ?? {},
        observacion:
          accion === "OBSERVAR"
            ? "Pago observado desde Finanzas"
            : "Excepción de pago autorizada desde Finanzas",
        decisionCorrespondencia: {
          accion,
          motivo,
        },
      });

      setMotivoDecisionInline("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ocr-resultados"] }),
        queryClient.invalidateQueries({
          queryKey: ["finanzas-ocr-pago-pendiente-grupo", grupoFacturaId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["finanzas-ocr-pago-pendiente-detalle"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["expediente-documentos", String(expedienteId)],
        }),
        queryClient.invalidateQueries({
          queryKey: ["finanzas-v2-grupos-pago", String(expedienteId)],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "finanzas-ocr-decision-persistente-grupo",
            String(expedienteId ?? ""),
            String(grupoFacturaId ?? ""),
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "finanzas-revision-canonica-grupo",
            empresaFinanzas,
            String(expedienteId ?? ""),
            String(grupoFacturaId ?? ""),
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["expedientes", String(expedienteId ?? ""), "documentos"],
        }),
      ]);

      onDecisionResuelta?.();
    } catch (error) {
      setDecisionInlineError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la decisión humana.",
      );
    } finally {
      setDecisionInlineEnviando(false);
    }
  }

  const pagoDocumentoIdEfectivo =
    pagoDocumentoIdRecuperado ?? pagoDocumentoId;

  const sustentoPago = Boolean(pagoDocumentoIdEfectivo);
  const pagoVista = pagoDocumento
    ? entityVista<Record<string, unknown>>(pagoDocumento)
    : null;

  const pagoDocumentoPersistido =
    documentos.find((documento) => {
      const documentoId =
        documento.documento_id ??
        documento.documentoId ??
        documento.id;

      return (
        pagoDocumentoIdEfectivo !== null &&
        pagoDocumentoIdEfectivo !== undefined &&
        String(documentoId ?? "") === String(pagoDocumentoIdEfectivo)
      );
    }) ?? null;

  const pagoMetadataDocumento =
    pagoDocumentoPersistido?.metadata &&
    typeof pagoDocumentoPersistido.metadata === "object" &&
    !Array.isArray(pagoDocumentoPersistido.metadata)
      ? (pagoDocumentoPersistido.metadata as Record<string, unknown>)
      : null;

  const pagoMetadataOcrPendiente =
    validacionPendientePagoValida
      ? validacionPendienteMetadata
      : null;

  const pagoMetadata =
    pagoMetadataDocumento ?? pagoMetadataOcrPendiente;

  const pagoMetadataOcr =
    pagoMetadata?.ocr &&
    typeof pagoMetadata.ocr === "object" &&
    !Array.isArray(pagoMetadata.ocr)
      ? (pagoMetadata.ocr as Record<string, unknown>)
      : null;

  const pagoMetadataConfirmada =
    pagoMetadataOcr?.metadata &&
    typeof pagoMetadataOcr.metadata === "object" &&
    !Array.isArray(pagoMetadataOcr.metadata)
      ? (pagoMetadataOcr.metadata as Record<string, unknown>)
      : pagoMetadata;

  const pagoNumeroOperacion = textValue(
    pagoMetadataConfirmada?.numeroOperacion ??
      pagoMetadataConfirmada?.numero ??
      pagoDocumentoPersistido?.numero,
    "",
  );

  const pagoBanco = textValue(pagoMetadataConfirmada?.banco, "");

  const pagoFechaRaw = textValue(
    pagoMetadataConfirmada?.fechaPago ??
      pagoMetadataConfirmada?.fechaEmision ??
      pagoDocumentoPersistido?.fecha_emision ??
      pagoDocumentoPersistido?.fechaEmision,
    "",
  );

  const pagoMontoRaw = textValue(
    pagoMetadataConfirmada?.montoTotal ??
      pagoDocumentoPersistido?.monto_total ??
      pagoDocumentoPersistido?.montoTotal,
    "",
  );

  const pagoMoneda = textValue(
    pagoMetadataConfirmada?.moneda ?? pagoDocumentoPersistido?.moneda,
    "",
  );

  const pagoFecha = /^\d{4}-\d{2}-\d{2}$/.test(pagoFechaRaw)
    ? pagoFechaRaw.split("-").reverse().join("/")
    : pagoFechaRaw;

  const pagoMontoNumero = Number(pagoMontoRaw.replace(/,/g, ""));
  const pagoMonedaNormalizada = (() => {
    const raw = pagoMoneda
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (["S/", "S/.", "SOLES", "SOL", "PEN"].includes(raw)) return "PEN";
    if (
      ["$", "US$", "USD", "DOLARES", "DOLAR", "DOLARES AMERICANOS"].includes(
        raw,
      )
    ) {
      return "USD";
    }

    return "PEN";
  })();

  const pagoMonto =
    pagoMontoRaw && Number.isFinite(pagoMontoNumero)
      ? new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: pagoMonedaNormalizada,
        }).format(pagoMontoNumero)
      : pagoMontoRaw;

  const facturaArchivosQuery = useQuery({
    queryKey: ["finanzas-factura-archivos", facturaDocumentoId],
    enabled: Boolean(facturaDocumentoId),
    queryFn: () =>
      getDocumentoArchivos(facturaDocumentoId as string | number),
  });

  const facturaArchivos =
    facturaArchivosQuery.data?.data ??
    facturaArchivosQuery.data?.archivos ??
    [];

  const facturaArchivoActual =
    facturaArchivos.find((archivo) => archivo.es_version_actual === true) ??
    (facturaArchivos.length === 1 ? facturaArchivos[0] : null);

  const facturaArchivoId = facturaArchivoActual?.id ?? null;

  const pagoArchivosQuery = useQuery({
    queryKey: ["finanzas-pago-archivos", pagoDocumentoIdEfectivo],
    enabled: Boolean(pagoDocumentoIdEfectivo),
    queryFn: () =>
      getDocumentoArchivos(pagoDocumentoIdEfectivo as string | number),
  });

  const pagoArchivos =
    pagoArchivosQuery.data?.data ??
    pagoArchivosQuery.data?.archivos ??
    [];

  const pagoArchivoActual =
    pagoArchivos.find((archivo) => archivo.es_version_actual === true) ??
    (pagoArchivos.length === 1 ? pagoArchivos[0] : null);

  const pagoArchivoId = pagoArchivoActual?.id ?? null;

  const principalOperativo = msiiPrincipalGrupoLabel(workspace, principalDocumentoId);
  const principalDocumentoOperativo = getDocumentoPrincipal(
    workspace as Parameters<typeof getDocumentoPrincipal>[0],
  );
  const principalTipoRaw = principalDocumentoOperativo
    ? String(getDocumentoTipo(principalDocumentoOperativo)).trim().toUpperCase()
    : "";
  const principalTipoOperativo =
    principalTipoRaw === "OS" || principalTipoRaw.includes("SERVICIO")
      ? "OS"
      : principalTipoRaw === "OC" || principalTipoRaw.includes("COMPRA")
        ? "OC"
        : principalTipoRaw || "OC/OS";
  const facturaOperativa = msiiFacturaGrupoLabel(workspace, facturaDocumentoId, getGrupoFacturaLabel(grupo));
  const correspondenciaQuery = useQuery({
    queryKey: ["finanzas-correspondencia-pago-factura", facturaDocumentoId, pagoDocumentoIdEfectivo],
    enabled: Boolean(facturaDocumentoId && pagoDocumentoIdEfectivo),
    queryFn: () => evaluarCorrespondenciaPagoFactura({
      facturaDocumentoId: facturaDocumentoId as string | number,
      pagoDocumentoId: pagoDocumentoIdEfectivo as string | number,
    }),
  });

  const evaluacionCorrespondenciaPersistida =
    validacionPendientePagoValida &&
    validacionPendientePago?.evaluacion &&
    typeof validacionPendientePago.evaluacion === "object" &&
    !Array.isArray(validacionPendientePago.evaluacion)
      ? (validacionPendientePago.evaluacion as NonNullable<
          typeof correspondenciaQuery.data
        >)
      : null;

  const evaluacionCorrespondenciaEfectiva =
    validacionPendientePagoValida && evaluacionCorrespondenciaPersistida
      ? evaluacionCorrespondenciaPersistida
      : decisionPersistenteQuery.data?.evaluacion ??
        correspondenciaQuery.data ??
        evaluacionCorrespondenciaPersistida;

  const candidatoPagoExacto =
    candidatosGrupoQuery.data?.find(
      (candidato) =>
        String(candidato.documentoId) === String(pagoDocumentoIdEfectivo),
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

  if (vinculosGrupoQuery.isError) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        No se pudo leer el estado de pagos del grupo. Actualiza para reintentar.
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="min-w-0 space-y-4 lg:pr-5">
          {principalSlot ? <div>{principalSlot}</div> : null}

          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Factura
            </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate font-semibold">{facturaOperativa}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">
                {principalTipoOperativo}: {principalOperativo}
              </Badge>
              {facturaArchivoId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setPreviewFacturaAbierto(true)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Ver
                </Button>
              ) : null}
            </div>
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

          </div>

          <div className="hidden flex-wrap gap-2 text-xs">
            <Badge variant="outline">Factura seleccionada</Badge>
            <Badge variant="outline">Principal del grupo seleccionado</Badge>
            <Badge variant="outline">Estado documental {textValue(entityVista<Record<string, unknown>>(grupo).estadoRevisionLabel ?? entityVista<Record<string, unknown>>(grupo).estado_revision_label ?? entityVista<Record<string, unknown>>(grupo).estado, "Sin estado")}</Badge>
          </div>

          <div className="hidden space-y-1 pt-1" aria-hidden="true">
            <div className="flex flex-wrap gap-2">
              <EstadoPagoBadge label="Factura" active />
              <EstadoPagoBadge label="Sustento de pago" active={sustentoPago} />
            </div>
            {!recepcionConEvidencia ? null : null}
            {sustentoPago ? (
              <p className="text-xs text-muted-foreground">
                Sustento de pago registrado.
              </p>
            ) : null}
            <div className="hidden">
              <EvaluacionCorrespondenciaPago
                hasSustento={sustentoPago}
                isLoading={
                  !evaluacionCorrespondenciaPersistida &&
                  (correspondenciaQuery.isLoading ||
                    correspondenciaQuery.isFetching)
                }
                isError={!evaluacionCorrespondenciaPersistida && correspondenciaQuery.isError}
                evaluacion={evaluacionCorrespondenciaEfectiva ?? undefined}
                asociacionYaResuelta={pagoYaAsociadoGrupoActivo}
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-3 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Pagos
            </p>
            {editable &&
            grupoFacturaId &&
            onAdjuntarTransferencia &&
            puedeAdjuntarOtroPago ? (
              <Button
                type="button"
                size="sm"
                disabled={existeTransferenciaPendiente}
                onClick={() => onAdjuntarTransferencia(grupoFacturaId)}
              >
                {pagosPersistidos.length > 0
                  ? "Adjuntar otro pago"
                  : "Adjuntar sustento de pago"}
              </Button>
            ) : null}
          </div>

          {existeTransferenciaPendiente &&
          editable &&
          grupoFacturaId &&
          onAdjuntarTransferencia &&
          puedeAdjuntarOtroPago ? (
            <p className="w-full text-right text-xs text-amber-700">
              Resuelva la validación pendiente antes de adjuntar otro pago.
            </p>
          ) : null}

          <div className="w-full rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Estado de pago
              </p>
              <Badge variant={estadoPagoFactura === "COMPLETO" ? "secondary" : "outline"}>
                {estadoPagoFactura}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Pagado acumulado</dt>
                <dd className="mt-1 font-semibold">
                  {formatMontoFinanzas(pagadoAcumulado, facturaMoneda)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Saldo</dt>
                <dd className="mt-1 font-semibold">
                  {saldoPendiente === null
                    ? "No disponible"
                    : formatMontoFinanzas(saldoPendiente, facturaMoneda)}
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Sustentos de pago {pagosPersistidos.length ? `(${pagosPersistidos.length})` : ""}
          </p>

          {pagosPersistidos.length > 0 ? (
            <div className="w-full space-y-2">
              {pagosPersistidos.map((documento, index) => {
                const documentoId =
                  documento.documento_id ??
                  documento.documentoId ??
                  documento.id;
                const monto = montoDocumentoFinanzas(documento);
                const moneda = monedaFinanzas(documento);
                const metadata =
                  documento.metadata &&
                  typeof documento.metadata === "object" &&
                  !Array.isArray(documento.metadata)
                    ? (documento.metadata as Record<string, unknown>)
                    : null;
                const metadataCompatibilidad =
                  metadata?.compatibilidad &&
                  typeof metadata.compatibilidad === "object" &&
                  !Array.isArray(metadata.compatibilidad)
                    ? (metadata.compatibilidad as Record<string, unknown>)
                    : null;
                const metadataDocumentoV1 =
                  metadataCompatibilidad?.documentoV1 &&
                  typeof metadataCompatibilidad.documentoV1 === "object" &&
                  !Array.isArray(metadataCompatibilidad.documentoV1)
                    ? (metadataCompatibilidad.documentoV1 as Record<string, unknown>)
                    : null;
                const metadataOcr =
                  metadata?.ocr &&
                  typeof metadata.ocr === "object" &&
                  !Array.isArray(metadata.ocr)
                    ? (metadata.ocr as Record<string, unknown>)
                    : null;
                const metadataOcrConfirmada =
                  metadataOcr?.metadata &&
                  typeof metadataOcr.metadata === "object" &&
                  !Array.isArray(metadataOcr.metadata)
                    ? (metadataOcr.metadata as Record<string, unknown>)
                    : null;
                const draftPagoExterior =
                  metadata?.validacionPendientePago &&
                  typeof metadata.validacionPendientePago === "object" &&
                  !Array.isArray(metadata.validacionPendientePago)
                    ? (metadata.validacionPendientePago as Record<string, unknown>)
                    : null;
                const draftPagoOcr =
                  metadataOcr?.validacionPendientePago &&
                  typeof metadataOcr.validacionPendientePago === "object" &&
                  !Array.isArray(metadataOcr.validacionPendientePago)
                    ? (metadataOcr.validacionPendientePago as Record<string, unknown>)
                    : null;
                const draftPago = draftPagoExterior ?? draftPagoOcr;
                const metadataDocumentoV1Interior =
                  metadataDocumentoV1?.metadata &&
                  typeof metadataDocumentoV1.metadata === "object" &&
                  !Array.isArray(metadataDocumentoV1.metadata)
                    ? (metadataDocumentoV1.metadata as Record<string, unknown>)
                    : null;

                const metadataDocumentoV1Ocr =
                  metadataDocumentoV1Interior?.ocr &&
                  typeof metadataDocumentoV1Interior.ocr === "object" &&
                  !Array.isArray(metadataDocumentoV1Interior.ocr)
                    ? (metadataDocumentoV1Interior.ocr as Record<string, unknown>)
                    : null;

                const metadataDocumentoV1OcrConfirmada =
                  metadataDocumentoV1Ocr?.metadata &&
                  typeof metadataDocumentoV1Ocr.metadata === "object" &&
                  !Array.isArray(metadataDocumentoV1Ocr.metadata)
                    ? (metadataDocumentoV1Ocr.metadata as Record<string, unknown>)
                    : null;

                const banco = textValue(
                  metadataOcrConfirmada?.banco ??
                    metadata?.banco ??
                    metadataDocumentoV1?.banco ??
                    metadataDocumentoV1Interior?.banco ??
                    metadataDocumentoV1OcrConfirmada?.banco ??
                    documento.banco,
                  "",
                );
                const operacion = textValue(
                  metadataDocumentoV1?.numero ??
                    metadataOcrConfirmada?.numeroOperacion ??
                    metadataOcrConfirmada?.numero ??
                    metadata?.numeroOperacion ??
                    metadata?.numero_operacion ??
                    documento.numeroOperacion ??
                    documento.numero_operacion ??
                    documento.numero,
                  "",
                );
                const accionDecisionPago = String(
                  draftPago?.accion ?? "",
                ).toUpperCase();
                const pagoConExcepcionAutorizada =
                  String(draftPago?.estado ?? "").toUpperCase() === "CONSUMIDO" &&
                  accionDecisionPago === "AUTORIZAR_EXCEPCION";
                const motivoDecisionPago = textValue(
                  draftPago?.motivo,
                  "Motivo no disponible en el registro histórico",
                );
                const fechaDecisionPago = textValue(
                  draftPago?.consumidoEn,
                  "Fecha no disponible",
                );

                return (
                  <div
                    key={String(documentoId ?? index)}
                    className="rounded-lg border p-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Pago {index + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={previewPagoPersistidoLoading === documentoId}
                          onClick={() =>
                            void abrirPreviewPagoPersistido(documento, index)
                          }
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          {previewPagoPersistidoLoading === documentoId
                            ? "Abriendo..."
                            : "Ver"}
                        </Button>
                      </div>
                      <span className="font-semibold">
                        {monto === null
                          ? "Monto no disponible"
                          : formatMontoFinanzas(monto, moneda)}
                      </span>
                    </div>
                    {banco || operacion ? (
                      <p className="mt-1 text-muted-foreground">
                        {[banco, operacion ? `Op. ${operacion}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {pagoConExcepcionAutorizada ? (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5 text-amber-900">
                        <p className="font-semibold">Excepción autorizada</p>
                        <p className="mt-0.5">{motivoDecisionPago}</p>
                        <p className="mt-0.5 text-[11px] text-amber-800">
                          Decidido el {fechaDecisionPago.replace("T", " ").slice(0, 16)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {sustentosObservados.length > 0 ? (
            <details className="w-full rounded-lg border border-amber-200 bg-amber-50/40">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-amber-900">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span>Sustentos observados ({sustentosObservados.length})</span>
                  <span className="font-normal text-amber-800">
                    No afectan el pagado ni el saldo
                  </span>
                </span>
              </summary>
              <div className="border-t border-amber-200 p-3">
                <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-3 pb-2 text-[11px] font-semibold uppercase text-muted-foreground sm:grid">
                  <span>Sustento</span>
                  <span>Motivo de observación</span>
                  <span>Fecha de decisión</span>
                  <span>Importe</span>
                  <span>Acción</span>
                </div>
                <div className="space-y-2">
                  {sustentosObservados.map((documento, index) => {
                    const documentoId =
                      documento.documento_id ?? documento.documentoId ?? documento.id;
                    const metadata =
                      documento.metadata &&
                      typeof documento.metadata === "object" &&
                      !Array.isArray(documento.metadata)
                        ? (documento.metadata as Record<string, unknown>)
                        : null;
                    const draft =
                      documento.validacionPendientePago &&
                      typeof documento.validacionPendientePago === "object" &&
                      !Array.isArray(documento.validacionPendientePago)
                        ? (documento.validacionPendientePago as Record<string, unknown>)
                        : null;
                    const banco = textValue(metadata?.banco, "Banco no disponible");
                    const operacion = textValue(
                      metadata?.numeroOperacion ?? metadata?.numero,
                      "Operación no disponible",
                    );
                    const monto = montoDocumentoFinanzas(documento);
                    const moneda = monedaFinanzas(documento);
                    const motivoObservacion = textValue(
                      draft?.motivo,
                      "Motivo no disponible en el registro histórico",
                    );
                    const observadoEn = textValue(
                      draft?.consumidoEn,
                      "Fecha no disponible",
                    );

                    return (
                      <div
                        key={String(documentoId ?? index)}
                        className="grid gap-2 rounded-md border bg-background p-2 text-xs sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] sm:items-center sm:gap-3"
                      >
                        <div>
                          <span className="font-medium">{banco}</span>
                          <span className="text-muted-foreground"> · Op. {operacion}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {motivoObservacion}
                        </span>
                        <span className="text-muted-foreground">
                          {observadoEn.replace("T", " ").slice(0, 16)}
                        </span>
                        <span className="font-semibold">
                          {monto === null
                            ? "Monto no disponible"
                            : formatMontoFinanzas(monto, moneda)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={previewPagoPersistidoLoading === documentoId}
                          onClick={() => void abrirPreviewPagoPersistido(documento, index)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          {previewPagoPersistidoLoading === documentoId
                            ? "Abriendo..."
                            : "Ver"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          ) : null}

          {previewPagoPersistidoError ? (
            <p className="w-full text-xs text-amber-700">
              {previewPagoPersistidoError}
            </p>
          ) : null}

          {pagosPersistidos.length === 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Sustento de pago
              </p>

              {sustentoPago ? (
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">
                {textValue(
                  pagoVista?.tipoDocumental ??
                    pagoVista?.tipo_documental ??
                    (validacionPendientePagoValida
                      ? ocrDetalle?.tipo_propuesto
                      : null),
                  "Sustento de pago",
                )}
              </p>

              {pagoBanco || pagoNumeroOperacion ? (
                <p className="text-sm text-muted-foreground">
                  {[pagoBanco, pagoNumeroOperacion ? `Op. ${pagoNumeroOperacion}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              {pagoFecha || pagoMonto ? (
                <p className="text-sm text-muted-foreground">
                  {[pagoFecha, pagoMonto].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin sustento vinculado
                </p>
              )}
            </>
          ) : null}
          {pagoDocumentoIdRecuperado &&
          validacionPendientePagoValida &&
          evaluacionCorrespondenciaEfectiva &&
          getRequiereDecisionHumana(evaluacionCorrespondenciaEfectiva) ? (
            <div className="w-full space-y-3">
              <EvaluacionCorrespondenciaPago
                hasSustento={sustentoPago}
                isLoading={
                  correspondenciaQuery.isLoading ||
                  correspondenciaQuery.isFetching
                }
                isError={!evaluacionCorrespondenciaPersistida && correspondenciaQuery.isError}
                evaluacion={evaluacionCorrespondenciaEfectiva ?? undefined}
                asociacionYaResuelta={false}
                sustentoMetadataEfectiva={
                  validacionPendientePagoValida
                    ? pagoMetadataConfirmada
                    : null
                }
              />

              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {editable ? "Decisión requerida" : "Validación pendiente"}
                  </p>
                  <p className="mt-1 text-muted-foreground dark:text-amber-200/80">
                    {editable
                      ? "Registre el motivo y decida sin reabrir la validación OCR."
                      : "Este sustento requiere revisión. La vista actual es solo lectura."}
                  </p>
                </div>

                {pagoArchivoId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPagoAbierto(true)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    Ver documento
                  </Button>
                ) : null}

                {editable ? (
                  <>
                    <label className="block space-y-1.5">
                      <span className="font-medium">Comentario / motivo</span>
                      <textarea
                        value={motivoDecisionInline}
                        onChange={(event) => {
                          setMotivoDecisionInline(event.target.value);
                          if (decisionInlineError) setDecisionInlineError(null);
                        }}
                        disabled={decisionInlineEnviando}
                        rows={3}
                        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Explique la decisión sobre este sustento de pago."
                      />
                    </label>

                    {decisionInlineError ? (
                      <p className="font-medium text-destructive">
                        {decisionInlineError}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          decisionInlineEnviando ||
                          motivoDecisionInline.trim().length === 0
                        }
                        onClick={() =>
                          void resolverDecisionHumanaInline("OBSERVAR")
                        }
                      >
                        {decisionInlineEnviando
                          ? "Procesando..."
                          : "Observar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          decisionInlineEnviando ||
                          motivoDecisionInline.trim().length === 0
                        }
                        onClick={() =>
                          void resolverDecisionHumanaInline(
                            "AUTORIZAR_EXCEPCION",
                          )
                        }
                      >
                        {decisionInlineEnviando
                          ? "Procesando..."
                          : "Aceptar excepción"}
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      La autorización de excepción está sujeta al permiso específico
                      validado por el backend.
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {pagosPersistidos.length === 0 &&
          sustentoPago &&
          pagoArchivoId &&
          !validacionPendientePagoValida ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPagoAbierto(true)}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Ver
            </Button>
          ) : null}

          {editable &&
          pagosPersistidos.length === 0 &&
          sustentoPago &&
          pagoDocumentoPersistido &&
          onEditarPago ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Editar sustento de pago"
              aria-label="Editar sustento de pago"
              onClick={() => onEditarPago(pagoDocumentoPersistido)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
          ) : null}

          {editable &&
          grupoFacturaId &&
          onAdjuntarTransferencia &&
          !puedeAdjuntarOtroPago ? (
            <p className="text-xs font-medium text-muted-foreground">
              Factura completamente pagada. No se admiten más pagos.
            </p>
          ) : null}
        </div>
      </div>

      {previewPagoPersistido ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${previewPagoPersistido.title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewPagoPersistido(null);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa del pago"
              onClick={() => setPreviewPagoPersistido(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={previewPagoPersistido.archivoId}
              title={previewPagoPersistido.title}
            />
          </div>
        </div>
      ) : null}

      {previewFacturaAbierto && facturaArchivoId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de la factura"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewFacturaAbierto(false);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa de la factura"
              onClick={() => setPreviewFacturaAbierto(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={facturaArchivoId}
              title={facturaOperativa}
            />
          </div>
        </div>
      ) : null}

      {previewPagoAbierto && pagoArchivoId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del sustento de pago"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewPagoAbierto(false);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa"
              onClick={() => setPreviewPagoAbierto(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={pagoArchivoId}
              title="Sustento de pago"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FinanzasGrupoFacturaPagoPanel({
  id,
  editable = false,
  grupoFacturaId = null,
  documentos = [],
  principalSlot,
  ocrResultadoIdDecisionForzada = null,
  onDecisionResuelta,
  onAdjuntarTransferencia,
  onEditarPago,
}: {
  id: string | number;
  editable?: boolean;
  grupoFacturaId?: string | number | null;
  documentos?: Array<Record<string, unknown>>;
  principalSlot?: ReactNode;
  ocrResultadoIdDecisionForzada?: number | null;
  onDecisionResuelta?: () => void;
  onAdjuntarTransferencia?: (grupoFacturaId: string | number) => void;
  onEditarPago?: (documento: Record<string, unknown>) => void;
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
  const gruposPersistidos = getGruposFactura(workspace).filter((grupo) =>
    Boolean(getGrupoFacturaPersistidoId(grupo)),
  );

  const grupoSolicitado =
    grupoFacturaId === null || grupoFacturaId === undefined
      ? null
      : String(grupoFacturaId);

  const gruposVisibles = grupoSolicitado
    ? gruposPersistidos.filter(
        (grupo) =>
          String(getGrupoFacturaPersistidoId(grupo) ?? "") ===
          grupoSolicitado,
      )
    : gruposPersistidos;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Pagos por factura</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Vincula y consulta los sustentos de pago asociados a cada factura.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {grupoSolicitado && !gruposVisibles.length ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No se pudo resolver la factura solicitada. No se mostrarán otros
            grupos del expediente.
          </div>
        ) : gruposVisibles.length ? (
          gruposVisibles.map((grupo, index) => (
            <GrupoPagoCard
              key={String(getGrupoFacturaPersistidoId(grupo) ?? index)}
              grupo={grupo}
              workspace={workspace}
              expedienteId={id}
              editable={editable}
              documentos={documentos}
              principalSlot={principalSlot}
              canAssociateGroupDocument={capabilities.canAssociateGroupDocument}
              onRefresh={() => workspaceQuery.refetch()}
              ocrResultadoIdDecisionForzada={ocrResultadoIdDecisionForzada}
              onDecisionResuelta={onDecisionResuelta}
              onAdjuntarTransferencia={onAdjuntarTransferencia}
              onEditarPago={onEditarPago}
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
