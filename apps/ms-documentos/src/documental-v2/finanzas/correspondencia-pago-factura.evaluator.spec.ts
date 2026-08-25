import {
  aplicarDecisionCorrespondencia,
  construirAuditoriaDecision,
  evaluarCorrespondenciaPagoFactura,
} from './correspondencia-pago-factura.evaluator';

const factura = {
  documentoId: 26,
  proveedorRuc: '20370146994',
  proveedorNombre: 'CORPORACION ACEROS AREQUIPA S.A.',
  moneda: 'USD',
  importe: 9704.23,
  documento: 'FE65-0842108',
};

describe('FINANZAS-CORRESPONDENCIA-PAGO-FACTURA-02', () => {
  it('1. correspondencia completa permite asociación ordinaria sin inferir factura pagada', () => {
    const evaluacion = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 30,
      proveedorRuc: '20370146994',
      proveedorNombre: 'CORPORACION ACEROS AREQUIPA S.A.',
      moneda: 'USD',
      importe: 9704.23,
      documentoReferenciado: 'FE65-0842108',
    });

    expect(evaluacion.estado).toBe('PENDIENTE');
    expect(evaluacion.requiereDecisionHumana).toBe(false);
    expect(evaluacion.permiteAsociacionOrdinaria).toBe(true);
    expect(Object.values(evaluacion.comparaciones).every(
      (item) => item.estado === 'COINCIDE',
    )).toBe(true);
  });

  it('2. pago parcial menor al disponible permite asociación ordinaria', () => {
    const evaluacion = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 31,
      proveedorRuc: '20370146994',
      proveedorNombre: 'CORPORACION ACEROS AREQUIPA S.A.',
      moneda: 'USD',
      importe: 4000,
      documentoReferenciado: 'FE65-0842108',
    });

    expect(evaluacion.estado).toBe('PENDIENTE');
    expect(evaluacion.comparaciones.proveedor.estado).toBe('COINCIDE');
    expect(evaluacion.comparaciones.moneda.estado).toBe('COINCIDE');
    expect(evaluacion.comparaciones.importe.estado).toBe('COINCIDE');
    expect(evaluacion.requiereDecisionHumana).toBe(false);
    expect(evaluacion.permiteAsociacionOrdinaria).toBe(true);
  });

  it('3. datos no verificables producen NO_VERIFICABLE', () => {
    const evaluacion = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 32,
      proveedorRuc: null,
      proveedorNombre: null,
      moneda: null,
      importe: null,
      documentoReferenciado: null,
    });

    expect(evaluacion.estado).toBe('NO_VERIFICABLE');
    expect(evaluacion.requiereDecisionHumana).toBe(true);
    expect(evaluacion.permiteAsociacionOrdinaria).toBe(false);
  });

  it('4. incompatibilidad manifiesta bloquea asociación ordinaria', () => {
    const evaluacion = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 29,
      proveedorRuc: '20600000001',
      proveedorNombre: 'CIMEDISA IMPORT SAC',
      moneda: 'USD',
      importe: 2334.8,
      documentoReferenciado: '202693',
    });

    expect(evaluacion.estado).toBe('INCOMPATIBLE');
    expect(evaluacion.comparaciones.proveedor.estado).toBe('NO_COINCIDE');
    expect(evaluacion.comparaciones.moneda.estado).toBe('COINCIDE');
    expect(evaluacion.comparaciones.importe.estado).toBe('COINCIDE');
    expect(
      evaluacion.comparaciones.documentoReferenciado.estado,
    ).toBe('NO_COINCIDE');
    expect(evaluacion.permiteAsociacionOrdinaria).toBe(false);

    expect(() =>
      aplicarDecisionCorrespondencia(evaluacion, {
        accion: 'ACEPTAR',
        motivo: 'Intento de aceptación ordinaria.',
        usuarioId: 7,
      }),
    ).toThrow('no puede aceptarse');
  });

  it('5. excepción autorizada exige permiso, motivo y genera auditoría mínima', () => {
    const evaluacion = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 29,
      proveedorRuc: '20600000001',
      proveedorNombre: 'CIMEDISA IMPORT SAC',
      moneda: 'USD',
      importe: 2334.8,
      documentoReferenciado: '202693',
    });

    expect(() =>
      aplicarDecisionCorrespondencia(evaluacion, {
        accion: 'AUTORIZAR_EXCEPCION',
        motivo: 'Prueba controlada autorizada.',
        usuarioId: 1,
        usuarioAutorizadoExcepcion: false,
      }),
    ).toThrow('permiso específico');

    const resultante = aplicarDecisionCorrespondencia(evaluacion, {
      accion: 'AUTORIZAR_EXCEPCION',
      motivo: 'Prueba controlada autorizada por administrador.',
      usuarioId: 1,
      usuarioAutorizadoExcepcion: true,
      fecha: '2026-07-31T20:05:00.000Z',
    });

    expect(resultante.estado).toBe('EXCEPCION_AUTORIZADA');
    expect(resultante.permiteAsociacionOrdinaria).toBe(true);

    expect(construirAuditoriaDecision(evaluacion, resultante)).toEqual(
      expect.objectContaining({
        facturaDocumentoId: 26,
        pagoDocumentoId: 29,
        estadoAnterior: 'INCOMPATIBLE',
        estadoResultante: 'EXCEPCION_AUTORIZADA',
        accion: 'AUTORIZAR_EXCEPCION',
        motivo: 'Prueba controlada autorizada por administrador.',
        usuarioId: 1,
      }),
    );
  });
});
