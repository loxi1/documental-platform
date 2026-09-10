import { buildClaveDocumental } from './identidad-documental';

describe('buildClaveDocumental - pagos', () => {
  it('incluye banco en la clave de transferencia cuando está disponible', () => {
    expect(
      buildClaveDocumental('BBTI', 'TRANSFERENCIA', {
        banco: 'BCP',
        numeroOperacion: '92568365',
      }),
    ).toBe('BBTI|TRANSFERENCIA|BCP|92568365');
  });

  it('mantiene compatibilidad si un pago histórico no tiene banco', () => {
    expect(
      buildClaveDocumental('BBTI', 'PAGO_TRANSFERENCIA', {
        numeroOperacion: 'FIX16-TR-001',
      }),
    ).toBe('BBTI|PAGO_TRANSFERENCIA|FIX16-TR-001');
  });

  it('no modifica la identidad de factura', () => {
    expect(
      buildClaveDocumental('BBTI', 'FACTURA', {
        ruc: '20208921020',
        serie: 'F001',
        numero: '14318',
      }),
    ).toBe('BBTI|FACTURA|20208921020|F001|14318');
  });
});
