import { api } from './api';
import type { RevisionContableItem } from '@/types/revision-contable';

export type OrdenPagoPayload = { tempId?: number; contenedorOperativoId: number; fechaEmision: string; monto: string;
  moneda: string; tipo: string; subtipo: string | null; observacion: string | null };
export type OpcionesOrdenPago = {
  contextos: { id: number | string; codigo: string; nombre: string | null; centroCostoCodigo: string | null }[];
  monedas: { codigo: string; nombre: string }[];
  tipos: Record<string, string[]>;
};
export type ContextoOrdenPago = {
  contenedorOperativoId: number;
  expedienteId: number | null;
  codigo: string;
  descripcion: string | null;
};
function unwrap<T>(value: unknown): T {
  let current = value;
  while (current && typeof current === 'object' && 'data' in current) current = (current as { data: unknown }).data;
  return current as T;
}
export async function getFinanzasBandeja(params: Record<string, unknown>) {
  return unwrap<{ items: RevisionContableItem[] }>((await api.get('/documental-v2/finanzas/bandeja', { params })).data);
}
export async function getOpcionesOrdenPago() {
  return unwrap<OpcionesOrdenPago>((await api.get('/documental-v2/finanzas/ordenes-pago/opciones')).data);
}
export async function buscarContextosOrdenPago(q: string, limit = 10) {
  const result = unwrap<{ items: ContextoOrdenPago[] }>(
    (
      await api.get(
        '/documental-v2/finanzas/ordenes-pago/contextos',
        {
          params: {
            q,
            limit,
          },
        },
      )
    ).data,
  );

  return result.items ?? [];
}
export async function crearOrdenPago(payload: OrdenPagoPayload, key: string) {
  return unwrap<{ ordenPagoId: number; documentoId: number; grupoFacturaId: number; idempotente: boolean }>(
    (await api.post('/documental-v2/finanzas/ordenes-pago', payload, { headers: { 'Idempotency-Key': key } })).data);
}

export type ArchivoInicialOrdenPagoTemp = { tempId: number; estado: 'STAGED'; nombreOriginal: string };

export async function subirArchivoInicialOrdenPago(file: File, key: string) {
  const form = new FormData();
  form.append('archivo', file);
  const result = unwrap<ArchivoInicialOrdenPagoTemp>(
    (await api.post('/documentos/tmp', form, { headers: { 'Idempotency-Key': key } })).data,
  );
  if (!Number.isSafeInteger(result?.tempId) || result.tempId <= 0 || result.estado !== 'STAGED') {
    throw new Error('El archivo no quedó preparado. Vuelva a seleccionarlo.');
  }
  return { tempId: result.tempId, estado: result.estado, nombreOriginal: result.nombreOriginal };
}
