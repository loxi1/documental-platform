import {
  AccionDecisionCorrespondencia,
  AuditoriaDecisionCorrespondencia,
  ComparacionCampo,
  DatosFacturaCorrespondencia,
  DatosPagoCorrespondencia,
  DecisionCorrespondenciaInput,
  DecisionCorrespondenciaResult,
  EvaluacionCorrespondenciaPagoFactura,
  ValorComparable,
} from './correspondencia-pago-factura.types';

const IMPORTE_TOLERANCIA = 0.01;

function texto(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

function textoComparable(value: unknown): string | null {
  const normalized = texto(value);
  return normalized
    ? normalized
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
    : null;
}

function normalizarRucFinanzas(value: unknown): string | null {
  const normalized = String(value ?? '').replace(/\D/g, '');
  return normalized.length === 11 ? normalized : null;
}

function normalizarMonedaFinanzas(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, '');

  if (['PEN', 'S/', 'S/.', 'SOLES', 'SOL'].includes(normalized)) return 'PEN';
  if (['USD', 'US$', '$', 'DOLARES', 'DOLAR'].includes(normalized)) return 'USD';

  return normalized;
}

function numero(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function compararTexto(
  factura: ValorComparable,
  pago: ValorComparable,
): ComparacionCampo {
  const facturaComparable = textoComparable(factura);
  const pagoComparable = textoComparable(pago);

  if (!facturaComparable || !pagoComparable) {
    return { estado: 'NO_VERIFICABLE', factura, pago };
  }

  return {
    estado:
      facturaComparable === pagoComparable ? 'COINCIDE' : 'NO_COINCIDE',
    factura,
    pago,
  };
}

function compararProveedor(
  factura: DatosFacturaCorrespondencia,
  pago: DatosPagoCorrespondencia,
): ComparacionCampo {
  const facturaRuc = normalizarRucFinanzas(factura.proveedorRuc);
  const pagoRuc = normalizarRucFinanzas(pago.proveedorRuc);

  if (!facturaRuc || !pagoRuc) {
    return {
      estado: 'NO_VERIFICABLE',
      factura: facturaRuc,
      pago: pagoRuc,
    };
  }

  return {
    estado: facturaRuc === pagoRuc ? 'COINCIDE' : 'NO_COINCIDE',
    factura: facturaRuc,
    pago: pagoRuc,
  };
}

function compararImporte(
  facturaImporte: number | null | undefined,
  pagoImporte: number | null | undefined,
): ComparacionCampo {
  const factura = numero(facturaImporte);
  const pago = numero(pagoImporte);

  if (factura === null || pago === null || factura <= 0 || pago <= 0) {
    return { estado: 'NO_VERIFICABLE', factura, pago };
  }

  return {
    estado:
      pago <= factura + IMPORTE_TOLERANCIA
        ? 'COINCIDE'
        : 'NO_COINCIDE',
    factura,
    pago,
  };
}

export function evaluarCorrespondenciaPagoFactura(
  factura: DatosFacturaCorrespondencia,
  pago?: DatosPagoCorrespondencia | null,
): EvaluacionCorrespondenciaPagoFactura {
  if (!pago) {
    const noVerificable: ComparacionCampo = {
      estado: 'NO_VERIFICABLE',
      factura: null,
      pago: null,
    };

    return {
      estado: 'SIN_SUSTENTO',
      facturaDocumentoId: factura.documentoId,
      pagoDocumentoId: null,
      comparaciones: {
        proveedor: noVerificable,
        moneda: noVerificable,
        importe: noVerificable,
        documentoReferenciado: noVerificable,
      },
      requiereDecisionHumana: false,
      permiteAsociacionOrdinaria: false,
      advertencias: ['No existe sustento de pago para evaluar.'],
    };
  }

  const comparaciones = {
    proveedor: compararProveedor(factura, pago),
    moneda: compararTexto(normalizarMonedaFinanzas(factura.moneda), normalizarMonedaFinanzas(pago.moneda)),
    importe: compararImporte(factura.importe, pago.importe),
    documentoReferenciado: compararTexto(
      texto(factura.documento),
      texto(pago.documentoReferenciado),
    ),
  };

  const valores = [
    comparaciones.proveedor,
    comparaciones.moneda,
    comparaciones.importe,
  ];
  const noVerificables = valores.filter(
    (item) => item.estado === 'NO_VERIFICABLE',
  ).length;
  const noCoinciden = valores.filter(
    (item) => item.estado === 'NO_COINCIDE',
  ).length;

  const proveedorIncompatible =
    comparaciones.proveedor.estado === 'NO_COINCIDE';
  const monedaIncompatible = comparaciones.moneda.estado === 'NO_COINCIDE';
  const importeIncompatible = comparaciones.importe.estado === 'NO_COINCIDE';

  const incompatibilidadManifiesta =
    proveedorIncompatible || monedaIncompatible || importeIncompatible;

  const advertencias: string[] = [];
  if (comparaciones.importe.estado === 'NO_COINCIDE') {
    advertencias.push(
      'El importe del pago excede el saldo disponible de la factura. Requiere revisión humana.',
    );
  }
  if (incompatibilidadManifiesta) {
    advertencias.push(
      'La incompatibilidad manifiesta bloquea la asociación ordinaria.',
    );
  }

  if (incompatibilidadManifiesta) {
    return {
      estado: 'INCOMPATIBLE',
      facturaDocumentoId: factura.documentoId,
      pagoDocumentoId: pago.documentoId,
      comparaciones,
      requiereDecisionHumana: true,
      permiteAsociacionOrdinaria: false,
      advertencias,
    };
  }

  const monedaNoVerificable =
    comparaciones.moneda.estado === 'NO_VERIFICABLE';
  const importeNoVerificable =
    comparaciones.importe.estado === 'NO_VERIFICABLE';
  const proveedorNoVerificable =
    comparaciones.proveedor.estado === 'NO_VERIFICABLE';

  // La ausencia de RUC en el sustento no demuestra una incompatibilidad.
  // Si moneda e importe son verificables y no existe NO_COINCIDE material,
  // el pago sigue siendo asociable por la vía ordinaria.
  if (monedaNoVerificable || importeNoVerificable) {
    return {
      estado: 'NO_VERIFICABLE',
      facturaDocumentoId: factura.documentoId,
      pagoDocumentoId: pago.documentoId,
      comparaciones,
      requiereDecisionHumana: true,
      permiteAsociacionOrdinaria: false,
      advertencias,
    };
  }

  if (proveedorNoVerificable) {
    return {
      estado: 'NO_VERIFICABLE',
      facturaDocumentoId: factura.documentoId,
      pagoDocumentoId: pago.documentoId,
      comparaciones,
      requiereDecisionHumana: false,
      permiteAsociacionOrdinaria: true,
      advertencias,
    };
  }

  if (noCoinciden > 0) {
    return {
      estado: 'PENDIENTE',
      facturaDocumentoId: factura.documentoId,
      pagoDocumentoId: pago.documentoId,
      comparaciones,
      requiereDecisionHumana: true,
      permiteAsociacionOrdinaria: false,
      advertencias,
    };
  }

  return {
    estado: 'PENDIENTE',
    facturaDocumentoId: factura.documentoId,
    pagoDocumentoId: pago.documentoId,
    comparaciones,
    requiereDecisionHumana: false,
    permiteAsociacionOrdinaria: true,
    advertencias,
  };
}

function motivoNormalizado(value: string | null | undefined): string | null {
  const motivo = texto(value);
  return motivo && motivo.length >= 5 ? motivo : null;
}

function assertDecision(
  evaluacion: EvaluacionCorrespondenciaPagoFactura,
  input: DecisionCorrespondenciaInput,
): void {
  if (!Number.isInteger(input.usuarioId) || input.usuarioId <= 0) {
    throw new Error('usuarioId debe ser un entero positivo');
  }

  const motivo = motivoNormalizado(input.motivo);

  if (input.accion === 'OBSERVAR' && !motivo) {
    throw new Error('OBSERVAR requiere motivo');
  }

  if (input.accion === 'AUTORIZAR_EXCEPCION') {
    if (!input.usuarioAutorizadoExcepcion) {
      throw new Error('AUTORIZAR_EXCEPCION requiere permiso específico');
    }
    if (!motivo) {
      throw new Error('AUTORIZAR_EXCEPCION requiere motivo');
    }
  }

  if (
    input.accion === 'ACEPTAR' &&
    evaluacion.requiereDecisionHumana &&
    !motivo
  ) {
    throw new Error('ACEPTAR una correspondencia parcial requiere motivo');
  }

  if (
    input.accion === 'ACEPTAR' &&
    evaluacion.estado === 'INCOMPATIBLE'
  ) {
    throw new Error(
      'Una incompatibilidad manifiesta no puede aceptarse por asociación ordinaria',
    );
  }
}

export function aplicarDecisionCorrespondencia(
  evaluacion: EvaluacionCorrespondenciaPagoFactura,
  input: DecisionCorrespondenciaInput,
): DecisionCorrespondenciaResult {
  assertDecision(evaluacion, input);

  const fecha = input.fecha ?? new Date().toISOString();
  const motivo = motivoNormalizado(input.motivo);

  const estado =
    input.accion === 'OBSERVAR'
      ? 'OBSERVADA'
      : input.accion === 'AUTORIZAR_EXCEPCION'
        ? 'EXCEPCION_AUTORIZADA'
        : evaluacion.estado;

  return {
    ...evaluacion,
    estado,
    requiereDecisionHumana: false,
    permiteAsociacionOrdinaria:
      input.accion === 'ACEPTAR' ||
      input.accion === 'AUTORIZAR_EXCEPCION',
    decision: {
      accion: input.accion,
      motivo,
      usuarioId: input.usuarioId,
      fecha,
    },
  };
}

export function construirAuditoriaDecision(
  anterior: EvaluacionCorrespondenciaPagoFactura,
  resultante: DecisionCorrespondenciaResult,
): AuditoriaDecisionCorrespondencia {
  return {
    facturaDocumentoId: anterior.facturaDocumentoId,
    pagoDocumentoId: anterior.pagoDocumentoId,
    estadoAnterior: anterior.estado,
    estadoResultante: resultante.estado,
    accion: resultante.decision.accion,
    motivo: resultante.decision.motivo,
    usuarioId: resultante.decision.usuarioId,
    fecha: resultante.decision.fecha,
    comparaciones: anterior.comparaciones,
  };
}
