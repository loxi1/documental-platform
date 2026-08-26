import {
  evaluarCorrespondenciaPagoFactura,
} from './correspondencia-pago-factura.evaluator';

describe('Finanzas MVP - multipago / RUC / moneda', () => {
  const factura = {
    documentoId: 20,
    proveedorRuc: '20538549071',
    proveedorNombre: 'OMEGA POWER S.A.C.',
    moneda: 'PEN',
    importe: 444.95,
    documento: 'F002-00000255',
  };

  it('acepta un pago parcial menor al importe disponible', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 89,
      proveedorRuc: '20538549071',
      proveedorNombre: 'OMEGA POWER SAC',
      moneda: 'SOLES',
      importe: 400,
      documentoReferenciado: null,
    });

    expect(r.comparaciones.proveedor.estado).toBe('COINCIDE');
    expect(r.comparaciones.moneda.estado).toBe('COINCIDE');
    expect(r.comparaciones.importe.estado).toBe('COINCIDE');
    expect(r.permiteAsociacionOrdinaria).toBe(true);
    expect(r.requiereDecisionHumana).toBe(false);
  });

  it('normaliza S/ y PEN', () => {
    const r = evaluarCorrespondenciaPagoFactura(
      { ...factura, moneda: 'S/' },
      {
        documentoId: 90,
        proveedorRuc: '20538549071',
        proveedorNombre: null,
        moneda: 'PEN',
        importe: 44.95,
        documentoReferenciado: null,
      },
    );
    expect(r.comparaciones.moneda.estado).toBe('COINCIDE');
  });

  it('no usa razón social como fallback si falta RUC y permite pago ordinario si moneda e importe son válidos', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 90,
      proveedorRuc: null,
      proveedorNombre: 'OMEGA POWER S.A.C.',
      moneda: 'PEN',
      importe: 44.95,
      documentoReferenciado: null,
    });
    expect(r.comparaciones.proveedor.estado).toBe('NO_VERIFICABLE');
    expect(r.comparaciones.moneda.estado).toBe('COINCIDE');
    expect(r.comparaciones.importe.estado).toBe('COINCIDE');
    expect(r.requiereDecisionHumana).toBe(false);
    expect(r.permiteAsociacionOrdinaria).toBe(true);
  });

  it('mantiene revisión humana si la moneda no es verificable', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 91,
      proveedorRuc: null,
      proveedorNombre: null,
      moneda: null,
      importe: 44.95,
      documentoReferenciado: null,
    });
    expect(r.comparaciones.moneda.estado).toBe('NO_VERIFICABLE');
    expect(r.requiereDecisionHumana).toBe(true);
    expect(r.permiteAsociacionOrdinaria).toBe(false);
  });

  it('mantiene revisión humana si el importe no es verificable', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 92,
      proveedorRuc: null,
      proveedorNombre: null,
      moneda: 'SOLES',
      importe: null,
      documentoReferenciado: null,
    });
    expect(r.comparaciones.moneda.estado).toBe('COINCIDE');
    expect(r.comparaciones.importe.estado).toBe('NO_VERIFICABLE');
    expect(r.requiereDecisionHumana).toBe(true);
    expect(r.permiteAsociacionOrdinaria).toBe(false);
  });

  it('bloquea sobrepago', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 90,
      proveedorRuc: '20538549071',
      proveedorNombre: 'OMEGA POWER S.A.C.',
      moneda: 'PEN',
      importe: 500,
      documentoReferenciado: null,
    });
    expect(r.comparaciones.importe.estado).toBe('NO_COINCIDE');
    expect(r.permiteAsociacionOrdinaria).toBe(false);
    expect(r.requiereDecisionHumana).toBe(true);
  });

  it('documento referenciado no bloquea el pago', () => {
    const r = evaluarCorrespondenciaPagoFactura(factura, {
      documentoId: 90,
      proveedorRuc: '20538549071',
      proveedorNombre: 'OMEGA POWER S.A.C.',
      moneda: 'PEN',
      importe: 100,
      documentoReferenciado: 'OTRO-NUMERO',
    });
    expect(r.comparaciones.documentoReferenciado.estado).toBe('NO_COINCIDE');
    expect(r.permiteAsociacionOrdinaria).toBe(true);
    expect(r.requiereDecisionHumana).toBe(false);
  });
});
