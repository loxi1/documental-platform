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

export type OrdenPagoDetalle = {
  ordenPagoId: number; documentoId: number; grupoFacturaId: number; contenedorOperativoId: number;
  numero: string; fechaEmision: string; monto: string; moneda: string; tipo: string | null;
  subtipo: string | null; observacion: string | null; estado: string;
  contexto: { codigo: string; nombre: string | null; centroCostoCodigo: string | null };
  archivoInicial: null | { archivoId: number; nombreArchivo: string; mime: string | null;
    tamanoBytes: number | null; hashSha256: string | null; storageKey: string | null };
};

export async function getOrdenPago(ordenPagoId: number) {
  return unwrap<OrdenPagoDetalle>(
    (await api.get(`/documental-v2/finanzas/ordenes-pago/${encodeURIComponent(ordenPagoId)}`)).data,
  );
}

export type SustentoFinancieroGrupo = {
  vinculoId: number | null;
  documentoId: number;
  archivoId: number | null;
  banco: string | null;
  fecha: string | null;
  monto: string | null;
  moneda: string | null;
  numeroReferencia: string | null;
  observacion: string | null;
  estado: 'activo' | 'observado' | 'anulado';
  motivo: string | null;
};

export type ResumenFinancieroGrupo = {
  grupoFacturaId: number;
  origenObligacion: 'FACTURA' | 'ORDEN_PAGO';
  obligacion: {
    tipo: 'FACTURA' | 'ORDEN_PAGO';
    documentoId: number;
    referencia: string | null;
    monto: string;
    moneda: string;
  };
  pago: {
    pagado: string;
    saldo: string;
    estado: 'COMPLETO' | 'PENDIENTE DE PAGO' | 'SIN PAGOS';
  };
  sustentosActivos: SustentoFinancieroGrupo[];
  sustentosObservados: SustentoFinancieroGrupo[];
  sustentosAnulados: SustentoFinancieroGrupo[];
};

export async function getResumenFinancieroGrupo(grupoFacturaId: number) {
  return unwrap<ResumenFinancieroGrupo>(
    (await api.get(`/documental-v2/finanzas/grupos-factura/${encodeURIComponent(grupoFacturaId)}/resumen`)).data,
  );
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

/* K10 accredited PRE-K10 closure contracts */

export type ProveedorOrdenPago = {
  id: number;
  ruc: string;
  razonSocial: string;
};

export type EditarOrdenPagoPayload = {
  fechaEmision?: string;
  monto?: number;
  moneda?: string;
  observacion?: string | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
  codigoPago?: string | null;
  conceptoCodigo?: string | null;
  proveedorId?: number | null;
  beneficiarioClienteDestinoId?: number | null;
  beneficiarioUsuarioId?: number | null;
  beneficiarioNombreLibre?: string | null;
};

export type EditarOrdenPagoResultado = {
  ordenPagoId: number;
  documentoId: number;
  grupoFacturaId: number;
  contenedorOperativoId: number;
  camposModificados: string[];
};

export type BeneficiariosOrdenPago = {
  tipoBeneficiario: 'NO_APLICA' | 'PROVEEDOR' | 'CLIENTE_DESTINO' | 'USUARIO' | 'NOMBRE_LIBRE';
  usoBeneficiario: 'NO_APLICA' | 'OPCIONAL' | 'REQUERIDO';
  items: { id: number; nombre: string; detalle: string | null }[];
};

export type OrdenPagoFacturaMaterializada = {
  documentoId: number;
  archivoId: number;
  [key: string]: unknown;
};

export async function buscarProveedoresOrdenPago(
  search: string,
  limit = 20,
): Promise<ProveedorOrdenPago[]> {
  const termino = search.trim();
  if (!termino) return [];

  const response = await api.get('/documentos/proveedores', {
    params: { search: termino, limit, offset: 0 },
  });

  const payload = response.data?.data ?? response.data;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return rows
    .map((row: any) => {
      const rawId = row?.id;
      const id =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string' && /^\\d+$/.test(rawId.trim())
            ? Number(rawId)
            : NaN;

      return {
        id,
        ruc: String(row?.ruc ?? '').trim(),
        razonSocial: String(row?.razonSocial ?? row?.razon_social ?? '').trim(),
      };
    })
    .filter(
      (row: ProveedorOrdenPago) =>
        Number.isSafeInteger(row.id) &&
        row.id > 0 &&
        !!row.ruc &&
        !!row.razonSocial,
    );
}

export async function editarOrdenPago(
  ordenPagoId: number,
  payload: EditarOrdenPagoPayload,
): Promise<EditarOrdenPagoResultado> {
  const { data } = await api.patch(
    `/documental-v2/finanzas/ordenes-pago/${ordenPagoId}`,
    payload,
  );
  return data?.data ?? data;
}

export async function getBeneficiariosOrdenPago(
  contenedorOperativoId: number,
  conceptoCodigo: string,
) {
  return unwrap<BeneficiariosOrdenPago>(
    (
      await api.get('/documental-v2/finanzas/ordenes-pago/beneficiarios', {
        params: { contenedorOperativoId, conceptoCodigo },
      })
    ).data,
  );
}

export async function materializarFacturaTemporalOrdenPago(
  tempId: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<OrdenPagoFacturaMaterializada> {
  const { data } = await api.post(
    `/documentos/tmp/${encodeURIComponent(tempId)}/materializar-factura-op`,
    payload,
    idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : undefined,
  );
  return data?.data ?? data;
}
