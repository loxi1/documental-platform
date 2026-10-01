import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Catálogo mínimo OP-01A. No es un mantenimiento de maestros.
export type OrdenPagoInput = {
  tempId?: number;
  contenedorOperativoId: number;
  fechaEmision: string;
  monto: string;
  moneda: string;
  conceptoCodigo: string;
  observacion: string | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
  codigoPago: string | null;
  proveedorId: number | null;
  beneficiarioClienteDestinoId: number | null;
  beneficiarioUsuarioId: number | null;
  beneficiarioNombreLibre: string | null;
};
export type OrdenPagoActor = {
  id: number; workspaceId: number; empresaCodigo: string; clienteDestinoId: number | null;
  requestId?: string | null; correlationId?: string | null; email?: string | null;
  sessionContextId?: string | null; sistemaCodigo?: string | null; perfilCodigo?: string | null;
};

export type EditarOrdenPagoInput = {
  fechaEmision?: string;
  monto?: string;
  moneda?: string;
  observacion?: string | null;
  periodoAnio?: number | null;
  periodoMes?: number | null;
  codigoPago?: string | null;
  conceptoCodigo?: string;
  proveedorId?: number | null;
  beneficiarioClienteDestinoId?: number | null;
  beneficiarioUsuarioId?: number | null;
  beneficiarioNombreLibre?: string | null;
};

export function validarActorOp(actor: OrdenPagoActor) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0 ||
      !Number.isSafeInteger(actor.workspaceId) || actor.workspaceId <= 0 || !actor.empresaCodigo ||
      (actor.clienteDestinoId != null && (!Number.isSafeInteger(actor.clienteDestinoId) || actor.clienteDestinoId <= 0))) {
    throw new ForbiddenException('Contexto autenticado de Finanzas requerido');
  }
}

export function validarActorOpLecturaScoped(actor: OrdenPagoActor) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0 ||
      !actor.empresaCodigo ||
      (actor.clienteDestinoId != null &&
        (!Number.isSafeInteger(actor.clienteDestinoId) || actor.clienteDestinoId <= 0))) {
    throw new ForbiddenException('Contexto autenticado requerido para consultar la Orden de Pago');
  }
}

export function validarEdicionOrdenPago(body: unknown): EditarOrdenPagoInput {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Edición OP inválida');

  const b = body as Record<string, unknown>;
  const allowed = [
    'fechaEmision', 'monto', 'moneda', 'observacion',
    'periodoAnio', 'periodoMes', 'codigoPago', 'conceptoCodigo',
    'proveedorId', 'beneficiarioClienteDestinoId',
    'beneficiarioUsuarioId', 'beneficiarioNombreLibre',
  ];

  const keys = Object.keys(b);
  if (!keys.length) fail('Edición OP sin cambios');
  if (keys.some(k => !allowed.includes(k))) fail('Campo no autorizado en edición OP');

  const out: EditarOrdenPagoInput = {};

  if ('fechaEmision' in b) {
    const fecha = String(b.fechaEmision ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) ||
        new Date(fecha).toISOString().slice(0, 10) !== fecha || fecha < '1900-01-01') {
      fail('Fecha de emisión inválida');
    }
    out.fechaEmision = fecha;
  }

  if ('monto' in b) {
    const monto = String(b.monto ?? '').trim();
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) {
      fail('Monto positivo con máximo dos decimales requerido');
    }
    const [entero, decimal = ''] = monto.split('.');
    out.monto = `${BigInt(entero)}.${decimal.padEnd(2, '0')}`;
  }

  if ('moneda' in b) {
    const moneda = String(b.moneda ?? '').trim().toUpperCase();
    if (!['PEN', 'USD'].includes(moneda)) fail('Moneda no habilitada');
    out.moneda = moneda;
  }

  if ('observacion' in b) {
    if (b.observacion != null && typeof b.observacion !== 'string') {
      fail('Observación inválida');
    }
    const observacion = String(b.observacion ?? '').trim() || null;
    if (observacion && observacion.length > 2000) fail('Observación demasiado extensa');
    out.observacion = observacion;
  }

  if ('periodoAnio' in b) {
    const anio = b.periodoAnio == null ? null : Number(b.periodoAnio);
    if (anio != null &&
        (!Number.isSafeInteger(anio) || anio < 1900 || anio > 9999)) {
      fail('Año de período inválido');
    }
    out.periodoAnio = anio;
  }

  if ('periodoMes' in b) {
    const mes = b.periodoMes == null ? null : Number(b.periodoMes);
    if (mes != null &&
        (!Number.isSafeInteger(mes) || mes < 1 || mes > 12)) {
      fail('Mes de período inválido');
    }
    out.periodoMes = mes;
  }

  if ('codigoPago' in b) {
    const codigoPago =
      b.codigoPago == null ? null : String(b.codigoPago).trim() || null;

    if (codigoPago && codigoPago.length > 250) {
      fail('Referencia funcional demasiado extensa');
    }

    out.codigoPago = codigoPago;
  }

  if ('conceptoCodigo' in b) {
    const conceptoCodigo = String(b.conceptoCodigo ?? '').trim();
    if (!conceptoCodigo) fail('Concepto OP requerido');
    out.conceptoCodigo = conceptoCodigo;
  }

  const enteroPositivoNullable = (campo: string) => {
    if (!(campo in b)) return;

    const valor = b[campo];

    if (valor == null) {
      (out as Record<string, unknown>)[campo] = null;
      return;
    }

    if (!Number.isSafeInteger(valor) || Number(valor) <= 0) {
      fail(`${campo} debe ser un entero positivo`);
    }

    (out as Record<string, unknown>)[campo] = Number(valor);
  };

  enteroPositivoNullable('proveedorId');
  enteroPositivoNullable('beneficiarioClienteDestinoId');
  enteroPositivoNullable('beneficiarioUsuarioId');

  if ('beneficiarioNombreLibre' in b) {
    if (b.beneficiarioNombreLibre != null &&
        typeof b.beneficiarioNombreLibre !== 'string') {
      fail('beneficiarioNombreLibre inválido');
    }

    const nombre =
      String(b.beneficiarioNombreLibre ?? '').trim() || null;

    if (nombre && nombre.length > 250) {
      fail('beneficiarioNombreLibre demasiado extenso');
    }

    out.beneficiarioNombreLibre = nombre;
  }

  return out;
}

export function validarOrdenPago(body: unknown, key: string): OrdenPagoInput {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) fail('Idempotency-Key UUID requerido');
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Solicitud OP inválida');
  const b = body as Record<string, unknown>;
  const allowed = [
    'contenedorOperativoId',
    'fechaEmision',
    'monto',
    'moneda',
    'conceptoCodigo',
    'observacion',
    'tempId',
    'periodoAnio',
    'periodoMes',
    'codigoPago',
    'proveedorId',
    'beneficiarioClienteDestinoId',
    'beneficiarioUsuarioId',
    'beneficiarioNombreLibre',
  ];
  if (Object.keys(b).some(k => !allowed.includes(k))) fail('Campo no autorizado en OP');
  if (b.tempId != null && (!Number.isSafeInteger(b.tempId) || Number(b.tempId) <= 0)) fail('tempId debe ser un entero positivo');
  if (!Number.isSafeInteger(b.contenedorOperativoId) || Number(b.contenedorOperativoId) <= 0) fail('Contexto requerido');
  const fecha = String(b.fechaEmision ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) ||
      new Date(fecha).toISOString().slice(0, 10) !== fecha || fecha < '1900-01-01') fail('Fecha de emisión inválida');
  const monto = String(b.monto ?? '').trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) fail('Monto positivo con máximo dos decimales requerido');
  const [entero, decimal = ''] = monto.split('.');
  const conceptoCodigo = String(b.conceptoCodigo ?? '').trim();
  if (!conceptoCodigo) fail('Concepto OP requerido');
  const moneda = String(b.moneda ?? '').trim().toUpperCase();
  if (!['PEN', 'USD'].includes(moneda)) fail('Moneda no habilitada');
  if (b.observacion != null && typeof b.observacion !== 'string') fail('Observación inválida');
  const observacion = String(b.observacion ?? '').trim() || null;
  if (observacion && observacion.length > 2000) fail('Observación demasiado extensa');

  const periodoAnio = b.periodoAnio == null
    ? null
    : Number(b.periodoAnio);
  const periodoMes = b.periodoMes == null
    ? null
    : Number(b.periodoMes);

  if ((periodoAnio == null) !== (periodoMes == null)) {
    fail('Período incompleto');
  }
  if (periodoAnio != null &&
      (!Number.isSafeInteger(periodoAnio) ||
       periodoAnio < 1900 ||
       periodoAnio > 9999)) {
    fail('Año de período inválido');
  }
  if (periodoMes != null &&
      (!Number.isSafeInteger(periodoMes) ||
       periodoMes < 1 ||
       periodoMes > 12)) {
    fail('Mes de período inválido');
  }

  const codigoPago = b.codigoPago == null
    ? null
    : String(b.codigoPago).trim() || null;
  if (codigoPago && codigoPago.length > 250) {
    fail('Referencia funcional demasiado extensa');
  }

  const enteroPositivoOpcional = (valor: unknown, campo: string): number | null => {
    if (valor == null) return null;
    if (!Number.isSafeInteger(valor) || Number(valor) <= 0) {
      fail(`${campo} debe ser un entero positivo`);
    }
    return Number(valor);
  };

  const proveedorId = enteroPositivoOpcional(b.proveedorId, 'proveedorId');
  const beneficiarioClienteDestinoId = enteroPositivoOpcional(
    b.beneficiarioClienteDestinoId,
    'beneficiarioClienteDestinoId',
  );
  const beneficiarioUsuarioId = enteroPositivoOpcional(
    b.beneficiarioUsuarioId,
    'beneficiarioUsuarioId',
  );

  if (b.beneficiarioNombreLibre != null &&
      typeof b.beneficiarioNombreLibre !== 'string') {
    fail('beneficiarioNombreLibre inválido');
  }
  const beneficiarioNombreLibre =
    String(b.beneficiarioNombreLibre ?? '').trim() || null;
  if (beneficiarioNombreLibre && beneficiarioNombreLibre.length > 250) {
    fail('beneficiarioNombreLibre demasiado extenso');
  }

  const beneficiariosInformados = [
    proveedorId,
    beneficiarioClienteDestinoId,
    beneficiarioUsuarioId,
    beneficiarioNombreLibre,
  ].filter(valor => valor != null).length;

  if (beneficiariosInformados > 1) {
    fail('Solo puede informarse un beneficiario por Orden de Pago');
  }

  return {
    ...(b.tempId == null ? {} : { tempId: Number(b.tempId) }),
    contenedorOperativoId: Number(b.contenedorOperativoId),
    fechaEmision: fecha,
    monto: `${BigInt(entero)}.${decimal.padEnd(2, '0')}`,
    moneda,
    conceptoCodigo,
    observacion,
    periodoAnio,
    periodoMes,
    codigoPago,
    proveedorId,
    beneficiarioClienteDestinoId,
    beneficiarioUsuarioId,
    beneficiarioNombreLibre,
  };
}
