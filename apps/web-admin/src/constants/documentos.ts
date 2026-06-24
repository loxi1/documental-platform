export type DocumentoConfiabilidad = "fuerte" | "validacion";

export type DocumentoCargaOption = {
  label: string;
  description: string;
  tipoEsperado: string;
  tipoRelacionSugerida: string;
  confiabilidad: DocumentoConfiabilidad;
};

export type DocumentoVisualState =
  | "pendiente_carga"
  | "subido"
  | "pendiente_ocr"
  | "pendiente_validacion"
  | "validado"
  | "rechazado"
  | "error";

export type DocumentoVisualInfo = {
  state: DocumentoVisualState;
  label: string;
  className: string;
  badgeClassName: string;
};

export const DOCUMENTO_PRINCIPAL_OPTIONS = [
  {
    label: "Orden de compra",
    description: "",
    tipoEsperado: "OC",
    tipoRelacionSugerida: "principal_oc",
    confiabilidad: "fuerte",
  },
  {
    label: "Orden de servicio",
    description: "",
    tipoEsperado: "OS",
    tipoRelacionSugerida: "principal_os",
    confiabilidad: "fuerte",
  },
  {
    label: "Factura directa",
    description: "",
    tipoEsperado: "FACTURA",
    tipoRelacionSugerida: "principal_factura",
    confiabilidad: "fuerte",
  },
] as const satisfies readonly DocumentoCargaOption[];

export const DOCUMENTO_ADJUNTO_OPTIONS = [
  {
    label: "Factura",
    description: "",
    tipoEsperado: "FACTURA",
    tipoRelacionSugerida: "adjunto_factura",
    confiabilidad: "fuerte",
  },
  {
    label: "Guía",
    description: "",
    tipoEsperado: "GUIA",
    tipoRelacionSugerida: "adjunto_guia",
    confiabilidad: "fuerte",
  },
  {
    label: "Otro sustento",
    description: "",
    tipoEsperado: "OTRO",
    tipoRelacionSugerida: "adjunto_otro",
    confiabilidad: "validacion",
  },
] as const satisfies readonly DocumentoCargaOption[];

const VISUAL_STATE_MAP: Record<DocumentoVisualState, DocumentoVisualInfo> = {
  pendiente_carga: {
    state: "pendiente_carga",
    label: "Pendiente de carga",
    className: "border-dashed bg-background",
    badgeClassName: "border-muted-foreground/30 text-muted-foreground",
  },
  subido: {
    state: "subido",
    label: "Subido",
    className: "border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20",
    badgeClassName: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  pendiente_ocr: {
    state: "pendiente_ocr",
    label: "Pendiente OCR",
    className: "border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/20",
    badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300",
  },
  pendiente_validacion: {
    state: "pendiente_validacion",
    label: "Pendiente validación",
    className: "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  validado: {
    state: "validado",
    label: "Validado",
    className: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  rechazado: {
    state: "rechazado",
    label: "Rechazado",
    className: "border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20",
    badgeClassName: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  error: {
    state: "error",
    label: "Error",
    className: "border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20",
    badgeClassName: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
};

function normalizeEstado(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function getDocumentoVisualState(doc?: Record<string, unknown> | null): DocumentoVisualInfo {
  if (!doc) return VISUAL_STATE_MAP.pendiente_carga;

  const ocrEstado = normalizeEstado(
    doc.ocr_estado ?? doc.ocrEstado ?? doc.estado_ocr ?? doc.estadoOcr,
  );
  const documentoEstado = normalizeEstado(doc.estado ?? doc.documento_estado ?? doc.documentoEstado);
  const archivoEstado = normalizeEstado(doc.archivo_estado ?? doc.archivoEstado);

  if ([ocrEstado, documentoEstado, archivoEstado].some((estado) => estado.includes("error"))) {
    return VISUAL_STATE_MAP.error;
  }

  if ([ocrEstado, documentoEstado].some((estado) => estado === "rechazado" || estado === "rechazada")) {
    return VISUAL_STATE_MAP.rechazado;
  }

  if (ocrEstado === "pendiente_validacion" || ocrEstado === "requiere_revision") {
    return VISUAL_STATE_MAP.pendiente_validacion;
  }

  if (
    ocrEstado === "confirmado" ||
    ocrEstado === "validado" ||
    documentoEstado === "validado" ||
    documentoEstado === "confirmado"
  ) {
    return VISUAL_STATE_MAP.validado;
  }

  if (documentoEstado === "pendiente_ocr") {
    return VISUAL_STATE_MAP.pendiente_ocr;
  }

  if (archivoEstado === "subido" || documentoEstado === "subido") {
    return VISUAL_STATE_MAP.subido;
  }

  return VISUAL_STATE_MAP.subido;
}

function firstText(source: Record<string, unknown> | undefined | null, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function metadataOf(doc?: Record<string, unknown> | null) {
  const metadata = doc?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function formatFecha(fecha: string) {
  if (!fecha) return "";
  const normalized = fecha.includes("T") ? fecha.slice(0, 10) : fecha;
  const parts = normalized.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return fecha;
}

function formatMonto(moneda: string, monto: string) {
  if (!monto) return "";
  const prefix = moneda.toUpperCase().includes("DOLAR") || moneda.toUpperCase() === "USD" ? "US$" : moneda.toUpperCase().includes("SOL") || moneda.toUpperCase() === "PEN" ? "S/" : moneda || "";
  const parsed = Number(monto);
  const formatted = Number.isFinite(parsed)
    ? parsed.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : monto;
  return `${prefix} ${formatted}`.trim();
}

function shortProveedor(value: string) {
  return value
    .replace(/SOCIEDAD ANONIMA CERRADA/gi, "S.A.C.")
    .replace(/SOCIEDAD ANONIMA/gi, "S.A.")
    .replace(/CORPORACION/gi, "CORP.")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDocumentoSummary(
  doc: Record<string, unknown> | undefined | null,
  option?: DocumentoCargaOption,
) {
  const metadata = metadataOf(doc);
  const tipo = firstText(doc, ["tipo_documental", "tipoDocumental"]) || option?.tipoEsperado || "DOC";
  const numero = firstText(doc, ["numero"]) || firstText(metadata, ["numero"]);
  const serie = firstText(doc, ["serie"]) || firstText(metadata, ["serie"]);
  const proveedor =
    firstText(doc, ["razon_social_emisor", "razonSocialEmisor", "proveedor", "emisor"]) ||
    firstText(metadata, ["proveedor", "razonSocialEmisor", "emisor"]);
  const ruc =
    firstText(doc, ["ruc_emisor", "rucEmisor", "rucProveedor"]) ||
    firstText(metadata, ["rucProveedor", "rucEmisor"]);
  const fecha = firstText(doc, ["fecha_emision", "fechaEmision"]) || firstText(metadata, ["fechaEmision", "fecha"]);
  const moneda = firstText(doc, ["moneda"]) || firstText(metadata, ["moneda"]);
  const monto = firstText(doc, ["monto_total", "montoTotal"]) || firstText(metadata, ["montoTotal", "total"]);
  const archivo = firstText(doc, ["nombre_archivo", "nombreArchivo", "archivo", "filename"]);
  const archivoId = firstText(doc, ["archivo_id", "archivoId"]);

  const serieNumero = serie && numero ? `${serie}-${numero}` : numero || serie;
  const title = serieNumero ? `${tipo} · ${serieNumero}` : `${tipo} · ${archivo || "Documento"}`;
  const providerLine = tipo === "FACTURA" && ruc
    ? `RUC ${ruc}${proveedor ? ` · ${shortProveedor(proveedor)}` : ""}`
    : proveedor
      ? shortProveedor(proveedor)
      : ruc
        ? `RUC ${ruc}`
        : "Metadata pendiente";

  const amount = formatMonto(moneda, monto);
  const date = formatFecha(fecha);
  const details = [amount, date].filter(Boolean).join(" · ");
  const displayName = [
    serieNumero ? `${tipo} ${serieNumero}` : tipo,
    proveedor ? shortProveedor(proveedor) : ruc ? `RUC ${ruc}` : archivo,
    date,
  ].filter(Boolean).join(" · ");

  return {
    tipo,
    title,
    providerLine,
    details,
    archivo,
    archivoId,
    displayName: displayName || `${tipo} · ${archivo || "Documento"}`,
  };
}
