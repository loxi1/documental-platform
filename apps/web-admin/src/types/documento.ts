export type Documento = {
  id: number;

  expediente_id?: number | null;
  expedienteId?: number | null;

  anio?: number | null;
  mes?: number | null;

  periodo_anio?: number | null;
  periodo_mes?: number | null;

  cliente_abreviatura?: string;
  clienteAbreviatura?: string;

  tipo_documental?: string;
  tipoDocumental?: string;

  ruc_emisor?: string | null;
  rucEmisor?: string | null;

  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;

  serie?: string | null;
  numero?: string | null;

  clave_documental?: string | null;
  claveDocumental?: string | null;

  estado?: string | null;

  fecha_emision?: string | null;
  fechaEmision?: string | null;

  moneda?: string | null;

  monto_total?: number | null;
  montoTotal?: number | null;

  metadata?: Record<string, unknown>;
};