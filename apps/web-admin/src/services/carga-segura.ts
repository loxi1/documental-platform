import { api } from "./api";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";
import type {
  CargaSeguraOrigen,
  CargaSeguraUploadOptions,
  CargaSeguraUploadPayload,
  CargaSeguraUploadResponse,
} from "@/types/carga-segura";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function crearCargaSeguraIdempotencyKey(
  origen: CargaSeguraOrigen,
  expedienteId: string | number,
  areaOrigen: string = "compras",
) {
  return `${areaOrigen.toLowerCase()}:${origen}:${expedienteId}:${randomId()}`;
}

function normalizeCargaSeguraResponse(
  response: CargaSeguraUploadResponse,
): CargaSeguraUploadResponse {
  return {
    ...response,
    cargaOperacionId: response.cargaOperacionId ?? response.operacionId ?? null,
  };
}

export function buildCargaSeguraPayloadDesdeGuiada(
  payload: CargaGuiadaPayloadPreview,
): CargaSeguraUploadPayload {
  if (payload.expedienteId === undefined || payload.expedienteId === null || payload.expedienteId === "") {
    throw new Error("Carga segura requiere expedienteId.");
  }

  const tipoRelacion = payload.tipoRelacionSugerida ?? null;

  return {
    areaOrigen: payload.areaOrigen,
    tipoDocumental: payload.tipoEsperado,
    expedienteId: payload.expedienteId,
    documentoBaseId: payload.documentoBaseId ?? null,
    grupoFacturaId: payload.grupoFacturaId ?? null,
    tipoRelacion,
    esPrincipal: payload.esPrincipal ?? String(tipoRelacion ?? "").startsWith("principal_"),
    canalIngreso: payload.canalIngreso,
    observacion: payload.observacion ?? null,
    metadata: {
      areaOrigen: payload.areaOrigen,
      observacion: payload.observacion ?? null,
      origenFrontend: `web-admin-${String(payload.areaOrigen).toLowerCase()}`,
      contratoOrigen: "carga-guiada-prevalidacion",
    },
  };
}

function buildCargaSeguraFormData(
  payload: CargaSeguraUploadPayload,
  file: File,
) {
  const formData = new FormData();

  formData.append("archivo", file);
  formData.append("expedienteId", String(payload.expedienteId));

  if (payload.documentoBaseId !== undefined && payload.documentoBaseId !== null) {
    formData.append("documentoBaseId", String(payload.documentoBaseId));
  }

  if (payload.grupoFacturaId !== undefined && payload.grupoFacturaId !== null) {
    formData.append("grupoFacturaId", String(payload.grupoFacturaId));
  }

  formData.append("tipoDocumental", String(payload.tipoDocumental));

  if (payload.tipoRelacion) {
    formData.append("tipoRelacion", String(payload.tipoRelacion));
  }

  formData.append("esPrincipal", String(payload.esPrincipal));
  formData.append("canalIngreso", payload.canalIngreso);

  const metadata = payload.metadata ?? {};
  const metadataSeguro = {
    ...metadata,
    ...(payload.observacion ? { observacion: payload.observacion } : {}),
  };

  if (Object.keys(metadataSeguro).length > 0) {
    formData.append("metadata", JSON.stringify(metadataSeguro));
  }

  return formData;
}

export async function subirDocumentoCargaSegura(
  payload: CargaGuiadaPayloadPreview | CargaSeguraUploadPayload,
  file: File,
  options: CargaSeguraUploadOptions,
) {
  if (!options.idempotencyKey?.trim()) {
    throw new Error("Carga segura requiere idempotency-key.");
  }

  const securePayload =
    "tipoEsperado" in payload
      ? buildCargaSeguraPayloadDesdeGuiada(payload)
      : payload;

  const formData = buildCargaSeguraFormData(securePayload, file);

  const { data } = await api.post<
    ApiEnvelope<CargaSeguraUploadResponse> | CargaSeguraUploadResponse
  >("/documentos/carga-segura", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "idempotency-key": options.idempotencyKey,
    },
  });

  return normalizeCargaSeguraResponse(unwrap<CargaSeguraUploadResponse>(data));
}

export type ComprasTempContext = {
  tipoDocumental: 'OC' | 'OS' | 'FACTURA'; expedienteId: number;
  documentoBaseId?: number; grupoFacturaId?: number;
};
export type ComprasTempResult = Record<string, any> & { tempId: number; tempIdentity: string; tempContextKey: string };
function comprasTempContextKey(context: ComprasTempContext) {
  return `bbti:compras-temp:${context.expedienteId}:${context.tipoDocumental}:${context.documentoBaseId ?? ''}`;
}
export async function recuperarTemporalCompras(context: ComprasTempContext): Promise<ComprasTempResult | null> {
  const contextKey = comprasTempContextKey(context);
  const record = sessionStorage.getItem(contextKey);
  if (!record) return null;
  const identity = JSON.parse(record);
  if (!identity.tempId) throw new Error('La reserva TEMP no devolvió respuesta. Reintenta seleccionando el mismo archivo.');
  const row = unwrap<any>((await api.get(`/documentos/tmp/${identity.tempId}`)).data);
  const candidate = row.ocrCandidate;
  let result: any = candidate?.resultado ?? {};
  if (!candidate && !row.documentalResult) {
    try {
      result = unwrap<any>((await api.post(`/documentos/tmp/${identity.tempId}/procesar-ocr`,
        { tipoEsperado: context.tipoDocumental }, { headers: { 'Idempotency-Key': identity.key } })).data);
    } catch {
      // Consultar recupera una respuesta tardía; nunca se vuelve a subir el archivo.
      const latest = unwrap<any>((await api.get(`/documentos/tmp/${identity.tempId}`)).data);
      result = latest.ocrCandidate?.resultado ?? { ok: false, ocrEstado: latest.ocrCandidate?.status ?? 'FAILED' };
    }
  }
  const preview = row.documentalResult ? null : unwrap<any>((await api.get(`/documentos/tmp/${identity.tempId}/preview-url`)).data);
  const draft = row.borradorDocumental?.metadata;
  return { ...result, tempId: identity.tempId, tempIdentity: identity.key, tempContextKey: contextKey,
    id: null, documentoId: null, documento_id: null, archivoId: null, archivo_id: null, ocrResultadoId: null, ocr_resultado_id: null,
    tipoDocumental: context.tipoDocumental, tipoEsperado: context.tipoDocumental,
    metadata: { ...(result.metadata?.metadata ?? result.metadata ?? {}), ...(draft ?? {}), tipoDocumental: context.tipoDocumental },
    nombreArchivo: row.nombreOriginal, signedUrl: preview?.signedUrl ?? preview?.url,
    archivo: { nombreArchivo: row.nombreOriginal, signedUrl: preview?.signedUrl ?? preview?.url },
    documentalResult: row.documentalResult, temporal: true };
}
export async function cargarTemporalCompras(file: File, context: ComprasTempContext): Promise<ComprasTempResult> {
  const contextKey = comprasTempContextKey(context);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
    .map(v => v.toString(16).padStart(2, '0')).join('');
  const previous = sessionStorage.getItem(contextKey);
  let record = previous ? JSON.parse(previous) : null;
  if (record && record.hash !== hash) throw new Error('Existe una carga TEMP pendiente. Recupérala antes de seleccionar otro archivo.');
  if (!record) { record = { key: randomId(), hash }; sessionStorage.setItem(contextKey, JSON.stringify(record)); }
  if (!record.tempId) {
    const form = new FormData(); form.append('archivo', file);
    const row = unwrap<any>((await api.post('/documentos/tmp', form, { headers: { 'Idempotency-Key': record.key } })).data);
    if (!Number.isSafeInteger(row.tempId) || row.tempId <= 0) throw new Error('TEMP sin identidad válida');
    record.tempId = row.tempId; sessionStorage.setItem(contextKey, JSON.stringify(record));
  }
  return (await recuperarTemporalCompras(context))!;
}
export async function validarTemporalCompras(result: ComprasTempResult, input: Record<string, any>, draft = false) {
  const data = { ...input, expedienteId: Number(input.expedienteId),
    ...(input.documentoBaseId == null ? {} : { documentoBaseId: Number(input.documentoBaseId) }),
    tipoDocumental: result.tipoDocumental };
  const response = unwrap<any>((await api.post(`/documentos/tmp/${result.tempId}/promover`,
    draft ? { borradorDocumental: data } : { confirmacionDocumental: data },
    { headers: { 'Idempotency-Key': result.tempIdentity } })).data);
  if (!draft) sessionStorage.removeItem(result.tempContextKey);
  return response;
}
