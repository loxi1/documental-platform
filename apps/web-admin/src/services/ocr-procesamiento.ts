import { api } from "./api";

export type ProcesarOcrPayload = {
  tipoEsperado?: string;
  areaOrigen?: string;
  canalIngreso?: string;
  reprocesar?: boolean;
};

export type ProcesarOcrResultado = {
  ok?: boolean;
  documentoId?: number | string | null;
  documento_id?: number | string | null;
  archivoId?: number | string | null;
  archivo_id?: number | string | null;
  tipoDocumental?: string | null;
  tipo_documental?: string | null;
  confidence?: number | string | null;
  estado?: string | null;
  claveDocumental?: string | null;
  clave_documental?: string | null;
  expedienteId?: number | string | null;
  expediente_id?: number | string | null;
  expedienteVinculado?: Record<string, unknown> | null;
  expediente_vinculado?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | string | null;
  [key: string]: unknown;
};

function unwrapDeep<T = unknown>(payload: unknown): T {
  let current = payload as { data?: unknown } | unknown;

  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    (current as { data?: unknown }).data !== current
  ) {
    current = (current as { data?: unknown }).data;
  }

  return current as T;
}

export async function procesarArchivoOcr(
  archivoId: number | string,
  payload: ProcesarOcrPayload,
): Promise<ProcesarOcrResultado> {
  const { data } = await api.post(
    `/documentos/archivos/${archivoId}/procesar-ocr`,
    payload,
  );

  return unwrapDeep<ProcesarOcrResultado>(data);
}