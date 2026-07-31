jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { sql } from '@documental/database';
import { ExpedientesRepository } from './expedientes.repository';

const sqlMock = sql as unknown as jest.Mock;

describe('ExpedientesRepository revisión contable por factura V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sqlMock.mockResolvedValue([]);
  });

  it('filtra el periodo exclusivamente por fecha_emision de la FACTURA', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 4,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    const [strings, ...values] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain("d.tipo_documental = 'FACTURA'");
    expect(query).toContain("d.estado = 'confirmado'");
    expect(query).toContain('d.fecha_emision >=');
    expect(query).toContain('d.fecha_emision <');
    expect(query).not.toContain('d.creado_en >=');
    expect(query).not.toContain('periodo_anio =');
    expect(query).not.toContain('periodo_mes =');
    expect(values).toContain('2026-04-01');
    expect(values).toContain('2026-05-01');
    expect(values).toContain('BBTI');
  });

  it('resuelve grupo, principal V2 y documento principal desde la cadena persistida', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 4,
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('FROM documentos.grupos_factura gf');
    expect(query).toContain('gf.factura_documento_id = fp.factura_id');
    expect(query).toContain('JOIN documentos.documentos_operativos_principales dop');
    expect(query).toContain('JOIN documentos.contenedores_operativos co');
    expect(query).toContain("co.tipo_contexto = 'expediente_v1'");
    expect(query).toContain('co.expediente_v1_id = e.id');
    expect(query).toContain('JOIN documentos.documentos dp');
    expect(query).toContain('dp.id = dop.documento_id');
  });

  it('limita los sustentos al grupo persistido de la factura', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 4,
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('FROM documentos.grupo_factura_documentos gfd');
    expect(query).toContain('gfd.grupo_factura_id = v2.grupo_factura_id');
    expect(query).toContain("gfd.estado = 'activo'");
    expect(query).not.toContain('WHERE ed2.expediente_id = e.id');
  });

  it('mantiene factura sin grupo V2 mediante LEFT JOIN y documentos vacíos', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 4,
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('LEFT JOIN LATERAL');
    expect(query).toContain("COALESCE(docs.documentos, '[]'::jsonb)");
    expect(query).toContain('v2.grupo_factura_id');
    expect(query).toContain('v2.documento_operativo_principal_id');
  });

  it.each([
    [3, '2026-03-01', '2026-04-01'],
    [4, '2026-04-01', '2026-05-01'],
    [5, '2026-05-01', '2026-06-01'],
  ])('calcula correctamente el rango para mes %i', async (mes, inicio, fin) => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes,
    });

    const [, ...values] = sqlMock.mock.calls[0];
    expect(values).toContain(inicio);
    expect(values).toContain(fin);
  });
});
