import { resolverFechaDocumentalR2 } from './periodo-documental-r2.fecha';

describe('resolverFechaDocumentalR2', () => {
  it('resuelve julio de 2026', () => {
    const resultado = resolverFechaDocumentalR2('2026-07-21');

    expect(resultado.anio).toBe('2026');
    expect(resultado.mes).toBe('07');
    expect(resultado.fecha.toISOString()).toBe('2026-07-21T00:00:00.000Z');
  });

  it('acepta un día bisiesto válido', () => {
    expect(
      resolverFechaDocumentalR2('2024-02-29').fecha.toISOString(),
    ).toBe('2024-02-29T00:00:00.000Z');
  });

  it.each([
    null,
    undefined,
    '',
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    '2026-00-01',
    '2026-07-00',
    '2026-7-21',
    '2026-07-21T00:00:00Z',
  ])('rechaza fecha inválida: %s', (valor) => {
    expect(() => resolverFechaDocumentalR2(valor)).toThrow(
      'FECHA_DOCUMENTAL_R2_INVALIDA',
    );
  });
});
