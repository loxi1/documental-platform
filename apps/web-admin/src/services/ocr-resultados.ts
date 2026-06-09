import { api } from "./api";
import { OcrResultado } from "@/types/ocr";

export async function getOcrResultados() {
  const { data } = await api.get<{
    success: boolean;
    data: OcrResultado[];
  }>("/documentos/ocr-resultados");

  return data.data;
}