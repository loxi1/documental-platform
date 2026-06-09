export interface OcrResultado {
  id: number;
  archivo_id: number;
  documento_id: number;

  tipo_propuesto: string;

  estado: string;

  confidence: number;

  clave_documental: string;

  creado_en: string;

  nombre_archivo: string;

  storage_provider: string;

  storage_key: string;
}