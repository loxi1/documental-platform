import type {
  WorkspaceDocumentalV2,
  WorkspaceV2Alerta,
  WorkspaceV2ContextoOperativo,
  WorkspaceV2Documento,
  WorkspaceV2GrupoFactura,
  WorkspaceV2Record,
} from "@/types/documental-v2-workspace";

type AnyRecord = Record<string, unknown>;

export function textValue(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

/**
 * El contrato oficial Sprint 1.6H devuelve entidades V2 con forma:
 * { estadoPersistencia, vista, persistido }.
 * Esta función lee siempre la vista real sin modificar ni persistir nada.
 */
export function entityVista<T = AnyRecord>(value: unknown): T {
  const record = asRecord(value);
  const vista = record.vista;
  return (vista && typeof vista === "object" ? vista : record) as T;
}

export function entityPersistencia(value: unknown) {
  const record = asRecord(value);
  return typeof record.estadoPersistencia === "string" ? record.estadoPersistencia : null;
}

export function parseMetadata(value: unknown): WorkspaceV2Record {
  const normalized = entityVista(value);
  if (!normalized) return {};
  if (typeof normalized === "object" && !Array.isArray(normalized)) return normalized as WorkspaceV2Record;
  if (typeof normalized === "string") {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as WorkspaceV2Record) : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function nestedMetadata(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = parseMetadata(vista.metadata);
  const candidates = [metadata, metadata.ocr, metadata.ocrMetadata, metadata.resultadoOcr, metadata.metadata, metadata.compatibilidad];

  for (const candidate of candidates) {
    const parsed = parseMetadata(candidate);
    if (Object.keys(parsed).length > 0) return parsed;
  }

  return metadata;
}

export function firstArray<T>(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[];
  }
  return [] as T[];
}

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function formatDate(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);

  return parsed.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatMoney(value: unknown, currency?: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  const currencyCode = String(currency ?? "").toUpperCase().includes("USD") ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currencyCode,
  }).format(numericValue);
}

export function isPrincipal(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);

  // Contrato V2 oficial: esPrincipalActivo viene calculado por backend desde esPrincipal V1.
  // No se infiere desde tipoRelacion.
  return vista.esPrincipal === true || vista.es_principal === true || vista.esPrincipalActivo === true;
}

export function getContexto(workspace: WorkspaceDocumentalV2): WorkspaceV2ContextoOperativo {
  const compatibilidad = asRecord((workspace as AnyRecord).compatibilidad);

  const candidate =
    workspace.contextoOperativo ??
    workspace.contexto_operativo ??
    workspace.contexto ??
    (workspace as AnyRecord).contenedorOperativo ??
    (workspace as AnyRecord).contenedor_operativo ??
    compatibilidad.contenedorOperativo ??
    compatibilidad.contenedor_operativo;

  const contexto = entityVista<WorkspaceV2ContextoOperativo>(candidate);

  return Object.keys(contexto).length
    ? contexto
    : {
        id: workspace.expedienteId ?? workspace.expediente_id ?? workspace.id,
      };
}

export function getDocumentoPrincipal(workspace: WorkspaceDocumentalV2) {
  const direct =
    workspace.documentoOperativoPrincipal ??
    workspace.documento_operativo_principal ??
    workspace.documentoPrincipal ??
    workspace.documento_principal ??
    null;

  if (direct) return entityVista<WorkspaceV2Documento>(direct);

  const documentos = firstArray<WorkspaceV2Documento>(
    (workspace as AnyRecord).documentosOperativosPrincipales,
    (workspace as AnyRecord).documentos_operativos_principales,
    asRecord((workspace as AnyRecord).compatibilidad).documentosOperativosPrincipales,
    asRecord((workspace as AnyRecord).compatibilidad).documentos_operativos_principales,
  );

  const principal = documentos.find((documento) => isPrincipal(documento)) ?? documentos[0] ?? null;
  return principal ? entityVista<WorkspaceV2Documento>(principal) : null;
}

export function getGruposFactura(workspace: WorkspaceDocumentalV2) {
  return firstArray<WorkspaceV2GrupoFactura>(
    workspace.gruposFactura,
    workspace.grupos_factura,
    workspace.gruposDeFactura,
    workspace.grupos_de_factura,
    asRecord((workspace as AnyRecord).compatibilidad).gruposFactura,
    asRecord((workspace as AnyRecord).compatibilidad).grupos_factura,
  );
}

export function getAdjuntosNoClasificados(workspace: WorkspaceDocumentalV2) {
  return firstArray<WorkspaceV2Documento>(
    workspace.adjuntosSinClasificar,
    workspace.adjuntos_sin_clasificar,
    workspace.documentosPendientesClasificacion,
    workspace.documentos_pendientes_clasificacion,
    workspace.documentosNoClasificados,
    workspace.documentos_no_clasificados,
    asRecord((workspace as AnyRecord).compatibilidad).adjuntosNoClasificados,
    asRecord((workspace as AnyRecord).compatibilidad).adjuntos_no_clasificados,
  );
}

export function getAlertas(workspace: WorkspaceDocumentalV2) {
  const items = firstArray<unknown>(workspace.alertas, workspace.advertencias, asRecord((workspace as AnyRecord).compatibilidad).advertencias);

  return items.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `advertencia-${index}`,
        tipo: "Advertencia",
        titulo: "Advertencia del Workspace",
        mensaje: item,
        estado: "informativo",
      } as WorkspaceV2Alerta;
    }

    return item as WorkspaceV2Alerta;
  });
}

export function getDocumentoId(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return vista.documentoId ?? vista.documento_id ?? vista.id ?? vista.facturaDocumentoId ?? vista.factura_documento_id;
}

export function getDocumentoTipo(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);

  return textValue(
    vista.tipoDocumental ??
      vista.tipo_documental ??
      vista.tipoPrincipal ??
      vista.tipo_principal ??
      vista.tipoRelacionSugerida ??
      vista.tipo_relacion_sugerida ??
      vista.tipo ??
      metadata.tipoDocumental ??
      metadata.tipo_documental ??
      metadata.tipoRelacion ??
      metadata.tipo_relacion,
    "Documento",
  );
}

export function getEstado(value?: { estado?: string | null } | null) {
  const vista = entityVista<AnyRecord>(value);
  return textValue(vista.estado ?? entityPersistencia(value), "Sin estado");
}

export function getSerieNumero(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);
  const serie = vista.serie ?? metadata.serie;
  const numero = vista.numero ?? metadata.numero;
  if (serie || numero) return `${textValue(serie, "")}-${textValue(numero, "")}`.replace(/^-|-$/g, "");
  return textValue(vista.claveDocumental ?? vista.clave_documental ?? metadata.claveDocumental ?? metadata.clave_documental ?? getDocumentoId(vista as WorkspaceV2Documento));
}

export function getProveedor(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);
  return textValue(
    vista.proveedor ??
      vista.razonSocialEmisor ??
      vista.razon_social_emisor ??
      metadata.proveedor ??
      metadata.razonSocialEmisor ??
      metadata.razon_social_emisor,
  );
}

export function getRucProveedor(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);
  return textValue(
    vista.rucProveedor ??
      vista.ruc_proveedor ??
      vista.rucEmisor ??
      vista.ruc_emisor ??
      metadata.rucProveedor ??
      metadata.ruc_proveedor ??
      metadata.rucEmisor ??
      metadata.ruc_emisor,
  );
}

export function getFechaDocumento(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);
  return formatDate(vista.fechaEmision ?? vista.fecha_emision ?? vista.fecha ?? metadata.fechaEmision ?? metadata.fecha_emision);
}

export function getMontoDocumento(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const metadata = nestedMetadata(vista as WorkspaceV2Documento);
  const moneda = vista.moneda ?? metadata.moneda;
  return formatMoney(vista.montoTotal ?? vista.monto_total ?? vista.monto ?? metadata.montoTotal ?? metadata.monto_total, moneda);
}

export function documentoLabel(documento?: WorkspaceV2Documento | null) {
  return `${getDocumentoTipo(documento)} ${getSerieNumero(documento)}`.trim();
}

export function getFacturaFromGrupo(grupo: WorkspaceV2GrupoFactura) {
  const grupoRecord = asRecord(grupo);
  const vista = entityVista<AnyRecord>(grupo);
  const factura = vista.factura ?? vista.documentoFactura ?? vista.documento_factura ?? grupoRecord.factura ?? grupoRecord.documentoFactura ?? grupoRecord.documento_factura;

  if (factura) return entityVista<WorkspaceV2Documento>(factura);

  const facturaDocumentoId = vista.facturaDocumentoId ?? vista.factura_documento_id;
  if (!facturaDocumentoId) return null;

  // El contrato Sprint 1.6H expone el id de la factura en la vista del grupo.
  // Si no viene la factura completa, se crea solo una representación visual no persistida.
  return {
    documentoId: facturaDocumentoId,
    tipoDocumental: "FACTURA",
    estado: vista.estado,
    metadata: vista.metadata,
  } as WorkspaceV2Documento;
}

export function getAdjuntosGrupo(grupo: WorkspaceV2GrupoFactura) {
  const grupoRecord = asRecord(grupo);
  const vista = entityVista<AnyRecord>(grupo);
  const documentos = firstArray<WorkspaceV2Documento>(grupoRecord.documentos, vista.documentos, grupoRecord.adjuntos, vista.adjuntos);
  const factura = getFacturaFromGrupo(grupo);
  const facturaId = getDocumentoId(factura);

  if (!facturaId) return documentos;
  return documentos.filter((documento) => getDocumentoId(documento) !== facturaId);
}
