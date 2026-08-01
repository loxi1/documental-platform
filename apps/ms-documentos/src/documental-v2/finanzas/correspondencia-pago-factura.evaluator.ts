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
  const facturaRuc = texto(factura.proveedorRuc);
  const pagoRuc = texto(pago.proveedorRuc);

  if (facturaRuc && pagoRuc) {
    return {
      estado: facturaRuc === pagoRuc ? 'COINCIDE' : 'NO_COINCIDE',
      factura: facturaRuc,
      pago: pagoRuc,
    };
  }

  return compararTexto(
    texto(factura.proveedorNombre),
    texto(pago.proveedorNombre),
  );
}

function compararImporte(
  facturaImporte: number | null | undefined,
  pagoImporte: number | null | undefined,
): ComparacionCampo {
  const factura = numero(facturaImporte);
  const pago = numero(pagoImporte);

  if (factura === null || pago === null) {
    return { estado: 'NO_VERIFICABLE', factura, pago };
  }

  return {
    estado:
      Math.abs(factura - pago) <= IMPORTE_TOLERANCIA
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
    moneda: compararTexto(texto(factura.moneda), texto(pago.moneda)),
    importe: compararImporte(factura.importe, pago.importe),
    documentoReferenciado: compararTexto(
      texto(factura.documento),
      texto(pago.documentoReferenciado),
    ),
  };

  const valores = Object.values(comparaciones);
  const noVerificables = valores.filter(
    (item) => item.estado === 'NO_VERIFICABLE',
  ).length;
  const noCoinciden = valores.filter(
    (item) => item.estado === 'NO_COINCIDE',
  ).length;

  const proveedorIncompatible =
    comparaciones.proveedor.estado === 'NO_COINCIDE';
  const referenciaIncompatible =
    comparaciones.documentoReferenciado.estado === 'NO_COINCIDE';
  const monedaIncompatible = comparaciones.moneda.estado === 'NO_COINCIDE';

  const incompatibilidadManifiesta =
    proveedorIncompatible &&
    (referenciaIncompatible || monedaIncompatible);

  const advertencias: string[] = [];
  if (comparaciones.importe.estado === 'NO_COINCIDE') {
    advertencias.push(
      'El importe del sustento no coincide con el importe de la factura. La diferencia requiere revisión humana.',
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

  if (noVerificables > 0) {
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
