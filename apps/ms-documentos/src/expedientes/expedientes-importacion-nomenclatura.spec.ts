import {
  resolverNomenclaturaImportacion,
} from './expedientes-importacion-nomenclatura';

describe('Nomenclatura de importacion CSV', () => {
  const input = {
    empresaCodigo: 'BBTI',
    solicitudId: 'a1000000-0000-4000-8000-000000000001',
    fecha: new Date('2026-11-26T16:22:42.381Z'),
  };

  it('genera una ruta simple con fecha y hora', () => {
    const result = resolverNomenclaturaImportacion(input);

    expect(result.periodoFecha).toBe('2026-11-26');

    expect(result.nombre).toBe(
      'CENTROS_COSTO_20261126_162242381.csv',
    );

    expect(result.storageKey).toBe(
      'documentos/2026/11/BBTI/CENTROS_COSTO/' +
      'CENTROS_COSTO_20261126_162242381.csv',
    );
  });

  it('respeta la empresa autenticada', () => {
    const result = resolverNomenclaturaImportacion({
      ...input,
      empresaCodigo: 'BBTEC',
    });

    expect(result.storageKey).toContain('/BBTEC/');
  });

  it('respeta el periodo UTC institucional', () => {
    const result = resolverNomenclaturaImportacion({
      ...input,
      fecha: new Date('2026-11-30T23:30:00-05:00'),
    });

    expect(result.periodoFecha).toBe('2026-12-01');
    expect(result.storageKey).toContain('/2026/12/');
  });

  it('diferencia archivos por milisegundos', () => {
    const first = resolverNomenclaturaImportacion(input);

    const second = resolverNomenclaturaImportacion({
      ...input,
      fecha: new Date('2026-11-26T16:22:42.382Z'),
    });

    expect(first.storageKey).not.toBe(second.storageKey);
  });

  it('no incorpora el UUID al nombre fisico', () => {
    const result = resolverNomenclaturaImportacion(input);

    expect(result.nombre).not.toContain(input.solicitudId);
  });

  it.each([
    '',
    '../BBTI',
    'BBTI/OTRA',
    'BBTI\\OTRA',
    'bbti',
  ])('rechaza empresa invalida: %s', (empresaCodigo) => {
    expect(() => resolverNomenclaturaImportacion({
      ...input,
      empresaCodigo,
    })).toThrow(
      'IMPORTACION_EMPRESA_NOMENCLATURA_INVALIDA',
    );
  });

  it('rechaza fecha invalida', () => {
    expect(() => resolverNomenclaturaImportacion({
      ...input,
      fecha: new Date('invalid'),
    })).toThrow('IMPORTACION_FECHA_INVALIDA');
  });

  it('rechaza solicitud invalida', () => {
    expect(() => resolverNomenclaturaImportacion({
      ...input,
      solicitudId: 'invalid',
    })).toThrow('IMPORTACION_SOLICITUD_ID_INVALIDA');
  });
});
