import type { BandejaComprasFila, BandejaComprasPage, BandejaComprasQuery } from '../services/expedientes';
export type ComprasPeriod = { anio: number; mes: number };
export type ComprasScope = { empresa: string; workspaceId: number; clienteDestinoId?: number | string | null; sub?: number; sessionContextId?: string };
export function currentComprasPeriod(now = new Date()): ComprasPeriod { return { anio: now.getFullYear(), mes: now.getMonth() + 1 }; }
function assertPeriod(period: ComprasPeriod) {
  if (!Number.isInteger(period.anio) || period.anio < 1 || period.anio > 9999 || !Number.isInteger(period.mes) || period.mes < 1 || period.mes > 12) throw new Error('COMPRAS_PERIODO_INVALIDO');
}
export async function loadComprasPeriod(period: ComprasPeriod, fetchPage: (params: BandejaComprasQuery, signal: AbortSignal) => Promise<BandejaComprasPage>, signal: AbortSignal, incluirPendientesValidacion = false): Promise<BandejaComprasFila[]> {
  assertPeriod(period);
  const rows: BandejaComprasFila[] = [], seen = new Set<string>();
  let offset = 0, total: number | undefined;
  const prefix = `${String(period.anio).padStart(4, '0')}-${String(period.mes).padStart(2, '0')}-`;
  const abort = () => { if (signal.aborted) throw new Error('COMPRAS_PERIODO_CANCELADO'); };
  do {
    abort();
    const page = await fetchPage({ anio: period.anio, mes: period.mes, limit: 100, offset, ...(incluirPendientesValidacion ? { incluirPendientesValidacion: true } : {}) }, signal);
    abort();
    if (!Number.isSafeInteger(page.total) || page.total < 0 || page.offset !== offset || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100 || !Array.isArray(page.data) || page.data.length > page.limit) throw new Error('COMPRAS_PAGINA_INVALIDA');
    if (total !== undefined && page.total !== total) throw new Error('COMPRAS_COLECCION_CAMBIO_DURANTE_LECTURA');
    total = page.total;
    for (const row of page.data) {
      const identity = `${row.expedienteId}:${row.principal.documentoId}`;
      if (seen.has(identity)) throw new Error('COMPRAS_PAGINA_DUPLICADA');
      const date = incluirPendientesValidacion ? row.principal.fechaPeriodo : row.principal.fechaEmision;
      if (incluirPendientesValidacion && (row.estado !== 'pendiente_validacion' || !['EMISION', 'CREACION'].includes(String(row.principal.fechaPeriodoFuente)) ||
          (row.principal.fechaPeriodoFuente === 'CREACION' && row.principal.fechaEmision != null) ||
          (row.principal.fechaPeriodoFuente === 'EMISION' && row.principal.fechaEmision !== date))) throw new Error('COMPRAS_PENDIENTE_FECHA_NO_ACREDITADA');
      if (!String(date ?? '').startsWith(prefix)) throw new Error('COMPRAS_FECHA_PRINCIPAL_FUERA_DE_PERIODO');
      seen.add(identity); rows.push(row);
    }
    offset += page.data.length;
    if (offset > total || (offset < total && page.data.length < page.limit)) throw new Error('COMPRAS_COLECCION_INCOMPLETA');
  } while (offset < total!);
  return rows;
}
/** Reject a workspace/session change both before and after each paginated request. */
export async function scopedComprasPage(scope: ComprasScope | null, readScope: () => ComprasScope | null,
  fetchPage: (params: BandejaComprasQuery, signal: AbortSignal) => Promise<BandejaComprasPage>, params: BandejaComprasQuery, signal: AbortSignal): Promise<BandejaComprasPage> {
  const identity = (s: ComprasScope | null) => s ? JSON.stringify([s.empresa.trim(), s.workspaceId, String(s.clienteDestinoId ?? ''), s.sub, s.sessionContextId]) : null;
  const expected = identity(scope);
  const check = () => { if (!expected || identity(readScope()) !== expected) throw new Error('COMPRAS_CONTEXTO_CAMBIO'); };
  check(); const page = await fetchPage(params, signal); check(); return page;
}
export function comprasPeriodQueryOptions(scope: ComprasScope | null, period: ComprasPeriod, fetchPage: (params: BandejaComprasQuery, signal: AbortSignal) => Promise<BandejaComprasPage>, incluirPendientesValidacion = false) {
  return { queryKey: ['compras-periodo', scope?.empresa, scope?.workspaceId, scope?.clienteDestinoId ?? null, scope?.sub, scope?.sessionContextId, period.anio, period.mes, incluirPendientesValidacion],
    queryFn: ({ signal }: { signal: AbortSignal }) => loadComprasPeriod(period, fetchPage, signal, incluirPendientesValidacion),
    enabled: Boolean(scope?.empresa.trim() && Number(scope.workspaceId) > 0), staleTime: 0, retry: false as const,
    refetchOnWindowFocus: false, refetchOnReconnect: false, placeholderData: () => undefined };
}
export function filterComprasLocal(rows: readonly BandejaComprasFila[], query: string): BandejaComprasFila[] {
  const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...rows];
  return rows.filter(row => {
    const fields = [row.principal.tipoDocumental ?? row.principal.tipo, row.principal.numero,
      `${row.principal.tipoDocumental ?? row.principal.tipo ?? ''} ${row.principal.numero ?? ''}`, row.codigoExpediente, row.descripcion,
      row.proveedor?.nombre, row.proveedor?.ruc, row.principal.proveedorNombre, row.principal.proveedor, row.principal.ruc, row.principal.proveedorRuc,
      ...row.facturas.flatMap(f => [f.serie, f.numero, `${f.serie ?? ''}-${f.numero ?? ''}`])].map(normalize);
    return terms.every(term => fields.some(field => field.includes(term)));
  });
}
