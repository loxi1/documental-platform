import { api } from "./api";
import {
  CrearExpedienteDesdeOcrPayload,
  OcrResultado,
  SugerenciaExpediente,
  VincularExpedientePayload,
} from "@/types/ocr";

function unwrap<T>(response: { data: { success?: boolean; data?: T } | T }): T {
  const payload = response.data;

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export type OcrResultadosParams = {
  estado?: string;
  grupoFacturaId?: number;
};

export async function getOcrResultados(params: OcrResultadosParams = {}) {
  const response = await api.get<{
    success: boolean;
    data: OcrResultado[];
  }>("/documentos/ocr-resultados", {
    params,
  });

  return unwrap<OcrResultado[]>(response);
}

export async function getOcrResultado(id: number) {
  const response = await api.get<{
    success: boolean;
    data: OcrResultado;
  }>(`/documentos/ocr-resultados/${id}`);

  return unwrap<OcrResultado>(response);
}

export async function sugerirExpedienteOcr(id: number) {
  const response = await api.post<{
    success: boolean;
    data: SugerenciaExpediente;
  }>(`/documentos/ocr-resultados/${id}/sugerir-expediente`);

  return unwrap<SugerenciaExpediente>(response);
}

export async function crearExpedienteDesdeOcr(
  id: number,
  payload: CrearExpedienteDesdeOcrPayload,
) {
  const response = await api.post(
    `/documentos/ocr-resultados/${id}/crear-expediente`,
    payload,
  );

  return unwrap<unknown>(response);
}

export async function vincularOcrAExpediente(
  id: number,
  payload: VincularExpedientePayload,
) {
  const response = await api.post(
    `/documentos/ocr-resultados/${id}/vincular-expediente`,
    payload,
  );

  return unwrap<unknown>(response);
}
