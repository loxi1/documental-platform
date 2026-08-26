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

  it('permite consulta general por empresa sin periodo contable', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 5,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);

    const [strings, ...values] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain("d.tipo_documental = 'FACTURA'");
    expect(query).toContain("d.estado = 'confirmado'");
    expect(query).toContain('d.fecha_emision >=');
    expect(query).toContain('d.fecha_emision <');

    expect(values).toContain('BBTI');
    expect(values).toContain(null);
  });

  it('incorpora búsqueda documental neutra por factura, proveedor, principal o sustentos', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      q: '96691608',
    });

    const [strings, ...values] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('fp.numero ILIKE');
    expect(query).toContain('fp.razon_social_emisor ILIKE');
    expect(query).toContain('fp.ruc_emisor ILIKE');
    expect(query).toContain('v2.documento_principal_numero ILIKE');
    expect(query).toContain('FROM documentos.grupo_factura_documentos gfd_busqueda');
    expect(query).toContain("gfd_busqueda.estado = 'activo'");
    expect(query).toContain('d_busqueda.numero ILIKE');

    expect(values).toContain('%96691608%');
  });

  it('expone identidad suficiente para preview y revisión por grupo', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 5,
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('factura_archivo.archivo_id AS factura_archivo_id');
    expect(query).toContain('co.centro_costo_codigo AS codigo_centro_costo');
    expect(query).toContain('gf.estado AS grupo_factura_estado');
    expect(query).toContain('gf.metadata AS grupo_factura_metadata');
    expect(query).toContain("v2.grupo_factura_metadata -> 'revisionContable'");
    expect(query).toContain("'archivoId', da2.id");
    expect(query).toContain('gfd.grupo_factura_id = v2.grupo_factura_id');
  });


  it('expone filaFactura como contrato neutro aditivo de bandeja', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 7,
      q: '009606',
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('AS "filaFactura"');
    expect(query).toContain("'grupoFacturaId'");
    expect(query).toContain("'factura'");
    expect(query).toContain("'principal'");
    expect(query).toContain("'centroCosto'");
    expect(query).toContain("'guia'");
    expect(query).toContain("'notaIngreso'");
    expect(query).toContain("'transferencia'");
    expect(query).toContain("'detraccion'");
    expect(query).toContain("'periodo'");
    expect(query).toContain("'revisionContable'");
    // no referencia alias inexistente v2.revision_contable
    expect(query).toContain(
      "v2.grupo_factura_metadata -> 'revisionContable'",
    );
    expect(query).not.toContain(
      "'revisionContable', v2.revision_contable",
    );
  });

  it('aplica fail-closed ante multiplicidad documental y no escoge un documento arbitrario', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 7,
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();

    expect(normalizedQuery).toContain(
      "COUNT(*) FILTER ( WHERE gfd.tipo_relacion = 'adjunto_guia' ) = 1",
    );
    expect(normalizedQuery).toContain(
      "COUNT(*) FILTER ( WHERE gfd.tipo_relacion = 'adjunto_nota_ingreso' ) = 1",
    );
    expect(normalizedQuery).toContain(
      "COUNT(*) FILTER ( WHERE gfd.tipo_relacion = 'adjunto_transferencia' ) = 1",
    );
    expect(normalizedQuery).toContain(
      "COUNT(*) FILTER ( WHERE gfd.tipo_relacion = 'adjunto_detraccion' ) = 1",
    );

    /*
     * LIMIT 1 sigue siendo válido únicamente para resolver versión actual
     * del ARCHIVO. La canonicidad del DOCUMENTO se decide por COUNT = 1.
     */
    expect(normalizedQuery).toContain("ELSE NULL END AS guia");
    expect(normalizedQuery).toContain("ELSE NULL END AS nota_ingreso");
    expect(normalizedQuery).toContain("ELSE NULL END AS transferencia");
    expect(normalizedQuery).toContain("ELSE NULL END AS detraccion");
  });

  it('obtiene datos de pago desde metadata persistida sin convertir estado del grupo en revisión contable', async () => {
    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      q: '96691608',
    });

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain("d2.metadata ->> 'banco'");
    expect(query).toContain("d2.metadata ->> 'numeroOperacion'");
    expect(query).toContain("d2.metadata ->> 'fechaPago'");
    expect(query).toContain("d2.metadata ->> 'montoTotal'");
    expect(query).toContain(
      "'revisionContable', v2.grupo_factura_metadata -> 'revisionContable'",
    );
    expect(query).not.toContain(
      "'revisionContable', v2.grupo_factura_estado",
    );
  });

});
