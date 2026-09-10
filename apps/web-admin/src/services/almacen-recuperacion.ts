import { api } from './api';
export type ContextoRecuperacionAlmacen = { expedienteId: number; grupoFacturaId: number; documentoBaseId: number; facturaDocumentoId: number };
export type PendienteAlmacen = { documentoId: number; archivoId: number; ocrResultadoId: number | null;
  tipoDocumental: 'GUIA_REMISION' | 'NOTA_INGRESO' | 'FACTURA'; estadoOcr: string | null; filename: string; fechaCarga: string | null;
  clasificacion: 'PENDIENTE_OCR' | 'IDENTIFICADO'; accionSugerida: 'VALIDAR_OCR' | 'VALIDAR_MANUAL' | 'AGREGAR_VERSION'; documentoIdDestino: number | null };
export type RecuperacionAlmacen = { data: PendienteAlmacen[]; contexto: ContextoRecuperacionAlmacen; conflictos: unknown[] };
function unwrap(value: any) {
  for (let i = 0; i < 2 && value?.success === true; i++) value = value.data;
  return value;
}
export async function getRecuperacionAlmacen(contexto: ContextoRecuperacionAlmacen): Promise<RecuperacionAlmacen> {
  const { data } = await api.get('/documentos/recuperacion-almacen', { params: contexto });
  const result = unwrap(data);
  if (!Array.isArray(result?.data) || !Array.isArray(result?.conflictos) ||
    Object.entries(contexto).some(([key, value]) => result.contexto?.[key] !== value)) throw new Error('Respuesta de recuperación Almacén inválida');
  return result;
}
export async function confirmarRecuperacionAlmacen(fila: PendienteAlmacen, contexto: ContextoRecuperacionAlmacen, metadata: Record<string, unknown>) {
  const { data } = await api.post(`/documentos/recuperacion-almacen/${fila.documentoId}/archivos/${fila.archivoId}/confirmar`,
    { contexto, metadata, ocrResultadoId: fila.ocrResultadoId });
  return unwrap(data);
}
