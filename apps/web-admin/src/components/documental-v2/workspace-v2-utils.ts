import type {
  WorkspaceDocumentalV2,
  WorkspaceV2Alerta,
  WorkspaceV2ContextoOperativo,
  WorkspaceV2Documento,
  WorkspaceV2GrupoFactura,
} from "@/types/documental-v2-workspace";

type AnyRecord = Record<string, unknown>;

export function textValue(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

const WORKSPACE_WARNING_LABELS: Record<string, string> = {
  EXPEDIENTE_V1_SIN_FACTURA: "No existen facturas asociadas.",
  EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL: "Falta asociar un documento operativo principal.",
  EXPEDIENTE_V1_CON_MULTIPLES_FACTURAS_REQUIERE_ASIGNACION_EXPLICITA:
    "Existen varias facturas pendientes de asignación explícita.",
};

function humanizeWorkspaceWarning(value: unknown) {
  const code = textValue(value, "");
  if (!code) return "Sin descripción adicional";
  return WORKSPACE_WARNING_LABELS[code] ?? code;
}

/**
 * El contrato oficial V2 entrega entidades con forma:
 * { estadoPersistencia, vista, persistido }.
 * El frontend solo representa campos normalizados de vista.
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

export function firstArray<T>(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[];
  }
  return [] as T[];
}

export function formatDate(value: unknown) {
  if (!value) return "—";

  const rawValue = String(value).trim();

  // Las fechas documentales del contrato V2 llegan como YYYY-MM-DD.
  // No deben parsearse con Date porque el timezone local puede retroceder un día.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(rawValue.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return rawValue.slice(0, 10);

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
  const normalizedCurrency = String(currency ?? "").trim().toUpperCase();

  if (!normalizedCurrency) {
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  const currencyCode = normalizedCurrency.includes("USD") || normalizedCurrency.includes("DOLAR") ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currencyCode,
  }).format(numericValue);
}

export function isPrincipal(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);

  // Contrato V2 oficial: esPrincipalActivo viene calculado por backend.
  // No se infiere desde tipoRelacion.
  return vista.esPrincipal === true || vista.es_principal === true || vista.esPrincipalActivo === true || vista.es_principal_activo === true;
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
    workspace.adjuntosNoClasificados,
    workspace.adjuntos_no_clasificados,
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
        mensaje: humanizeWorkspaceWarning(item),
        codigoTecnico: item,
        estado: "informativo",
      } as WorkspaceV2Alerta;
    }

    const alerta = item as WorkspaceV2Alerta;
    const mensaje = alerta.mensaje ?? alerta.descripcion;

    return {
      ...alerta,
      mensaje: humanizeWorkspaceWarning(mensaje),
      codigoTecnico: mensaje,
    } as WorkspaceV2Alerta;
  });
}

export function getDocumentoId(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return vista.documentoId ?? vista.documento_id ?? vista.id ?? vista.facturaDocumentoId ?? vista.factura_documento_id;
}

export function getDocumentoTipo(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);

  return textValue(
    vista.tipoDocumentalLabel ??
      vista.tipo_documental_label ??
      vista.tipoPrincipal ??
      vista.tipo_principal ??
      vista.tipoDocumental ??
      vista.tipo_documental ??
      vista.tipo,
    "Documento",
  );
}

export function getEstado(value?: { estado?: string | null } | null) {
  const vista = entityVista<AnyRecord>(value);
  return textValue(vista.estadoRevisionLabel ?? vista.estado_revision_label ?? vista.estado ?? entityPersistencia(value), "Sin estado");
}

export function getNumeroDocumento(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return textValue(vista.numeroDocumento ?? vista.numero_documento ?? vista.numero, "No informado");
}

export function getProveedor(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return textValue(vista.proveedorNombre ?? vista.proveedor_nombre ?? vista.proveedor, "No informado");
}

export function getRucProveedor(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return textValue(vista.proveedorRuc ?? vista.proveedor_ruc ?? vista.rucProveedor ?? vista.ruc_proveedor, "No informado");
}

export function getFechaDocumento(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return formatDate(vista.fechaEmision ?? vista.fecha_emision ?? vista.fecha);
}

export function getMontoDocumento(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  const moneda = vista.moneda;
  return formatMoney(vista.montoTotal ?? vista.monto_total ?? vista.monto ?? vista.importeTotal ?? vista.importe_total, moneda);
}

export function documentoLabel(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return textValue(vista.titulo ?? vista.documentoLabel ?? vista.documento_label, "Documento no informado");
}

export function getDocumentoArchivo(documento?: WorkspaceV2Documento | null) {
  const vista = entityVista<AnyRecord>(documento);
  return textValue(vista.nombreArchivo ?? vista.nombre_archivo, "No informado");
}

export function getGrupoVista(grupo: WorkspaceV2GrupoFactura) {
  return entityVista<WorkspaceV2GrupoFactura>(grupo);
}

export function getGrupoFacturaLabel(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return textValue(vista.facturaLabel ?? vista.factura_label, "Factura no informada");
}

export function getGrupoFacturaId(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return vista.facturaDocumentoId ?? vista.factura_documento_id;
}

export function getGrupoProveedor(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return textValue(vista.proveedorNombre ?? vista.proveedor_nombre ?? vista.proveedor, "No informado");
}

export function getGrupoRucProveedor(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return textValue(vista.proveedorRuc ?? vista.proveedor_ruc, "No informado");
}

export function getGrupoFecha(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return formatDate(vista.fechaEmision ?? vista.fecha_emision ?? vista.fecha);
}

export function getGrupoImporte(grupo: WorkspaceV2GrupoFactura) {
  const vista = getGrupoVista(grupo) as AnyRecord;
  return formatMoney(vista.importeTotal ?? vista.importe_total, vista.moneda);
}

export function getAdjuntosGrupo(grupo: WorkspaceV2GrupoFactura) {
  const grupoRecord = asRecord(grupo);
  const vista = entityVista<AnyRecord>(grupo);
  return firstArray<WorkspaceV2Documento>(grupoRecord.documentos, vista.documentos, grupoRecord.adjuntos, vista.adjuntos);
}
