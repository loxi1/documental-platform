import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Catálogo mínimo OP-01A. No es un mantenimiento de maestros.
export const TIPOS_OP = {
  SERVICIOS_GENERALES: ['ENERGIA_ELECTRICA', 'AGUA', 'INTERNET', 'TELEFONIA', 'ARBITRIOS', 'OTROS'],
  SEGUROS: [],
} as const;

export type OrdenPagoInput = {
  tempId?: number;
  contenedorOperativoId: number; fechaEmision: string; monto: string;
  moneda: string; tipo: string; subtipo: string | null; observacion: string | null;
};
export type OrdenPagoActor = {
  id: number; workspaceId: number; empresaCodigo: string; clienteDestinoId: number | null;
  requestId?: string | null; correlationId?: string | null; email?: string | null;
  sessionContextId?: string | null; sistemaCodigo?: string | null; perfilCodigo?: string | null;
};

export function validarActorOp(actor: OrdenPagoActor) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0 ||
      !Number.isSafeInteger(actor.workspaceId) || actor.workspaceId <= 0 || !actor.empresaCodigo ||
      (actor.clienteDestinoId != null && (!Number.isSafeInteger(actor.clienteDestinoId) || actor.clienteDestinoId <= 0))) {
    throw new ForbiddenException('Contexto autenticado de Finanzas requerido');
  }
}

export function validarOrdenPago(body: unknown, key: string): OrdenPagoInput {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) fail('Idempotency-Key UUID requerido');
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Solicitud OP inválida');
  const b = body as Record<string, unknown>;
  const allowed = ['contenedorOperativoId', 'fechaEmision', 'monto', 'moneda', 'tipo', 'subtipo', 'observacion', 'tempId'];
  if (Object.keys(b).some(k => !allowed.includes(k))) fail('Campo no autorizado en OP');
  if (b.tempId != null && (!Number.isSafeInteger(b.tempId) || Number(b.tempId) <= 0)) fail('tempId debe ser un entero positivo');
  if (!Number.isSafeInteger(b.contenedorOperativoId) || Number(b.contenedorOperativoId) <= 0) fail('Contexto requerido');
  const fecha = String(b.fechaEmision ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) ||
      new Date(fecha).toISOString().slice(0, 10) !== fecha || fecha < '1900-01-01') fail('Fecha de emisión inválida');
  const monto = String(b.monto ?? '').trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) fail('Monto positivo con máximo dos decimales requerido');
  const [entero, decimal = ''] = monto.split('.');
  const tipo = String(b.tipo ?? '');
  if (!Object.hasOwn(TIPOS_OP, tipo)) fail('Tipo OP no habilitado');
  const subtipos: readonly string[] = TIPOS_OP[tipo as keyof typeof TIPOS_OP];
  const subtipo = b.subtipo == null || b.subtipo === '' ? null : String(b.subtipo);
  if (subtipos.length ? !subtipo || !subtipos.includes(subtipo) : subtipo !== null) fail('Subtipo incompatible');
  const moneda = String(b.moneda ?? '').trim().toUpperCase();
  if (!['PEN', 'USD'].includes(moneda)) fail('Moneda no habilitada');
  if (b.observacion != null && typeof b.observacion !== 'string') fail('Observación inválida');
  const observacion = String(b.observacion ?? '').trim() || null;
  if (observacion && observacion.length > 2000) fail('Observación demasiado extensa');
  return { ...(b.tempId == null ? {} : { tempId: Number(b.tempId) }), contenedorOperativoId: Number(b.contenedorOperativoId), fechaEmision: fecha,
    monto: `${BigInt(entero)}.${decimal.padEnd(2, '0')}`, moneda, tipo, subtipo, observacion };
}
