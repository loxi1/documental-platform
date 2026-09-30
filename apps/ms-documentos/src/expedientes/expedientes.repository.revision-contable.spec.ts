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

  it('proyecta concepto canónico de OP en Bandeja sin perder fallback histórico ni introducir N+1', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: 'agua',
      },
      {
        workspaceId: 13,
        clienteDestinoId: 1,
      },
    );

    expect(sqlMock).toHaveBeenCalledTimes(2);

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain(
      'LEFT JOIN documentos.obligaciones_snapshot os_op',
    );
    expect(query).toContain(
      'os_op.grupo_factura_id = g.id',
    );
    expect(query).toContain(
      'LEFT JOIN documentos.catalogo_conceptos_obligacion concepto_op',
    );
    expect(query).toContain(
      'concepto_op.id = os_op.concepto_id',
    );

    expect(query).toContain("'conceptoCodigo', concepto_op.codigo");
    expect(query).toContain("'conceptoNombre', concepto_op.nombre");

    // Compatibilidad histórica: no reinterpretar ni eliminar metadata antigua.
    expect(query).toContain(
      "'tipo', d.metadata #>> '{ordenPago,tipo}'",
    );
    expect(query).toContain(
      "'subtipo', d.metadata #>> '{ordenPago,subtipo}'",
    );

    // Búsqueda de OP nueva por semántica canónica.
    expect(query).toContain('concepto_op.codigo');
    expect(query).toContain('concepto_op.nombre');

    // Proveedor OP: autoridad exclusiva p.proveedor_id -> core.proveedores.
    expect(query).toContain('LEFT JOIN core.proveedores prov_op');
    expect(query).toContain('prov_op.id = p.proveedor_id');
    expect(query).toContain("'proveedorId', p.proveedor_id");
    expect(query).toContain("'rucEmisor', prov_op.ruc");
    expect(query).toContain("'razonSocialEmisor', prov_op.razon_social");
    expect(query).toContain('prov_op.ruc ILIKE');
    expect(query).toContain('prov_op.razon_social ILIKE');

    // No fabricar proveedor desde beneficiarios ni regularizadores.
    expect(query).not.toContain("'rucEmisor', d_op.ruc_emisor");
    expect(query).not.toContain("'razonSocialEmisor', d_op.razon_social_emisor");
    expect(query).not.toContain(
      "'razonSocialEmisor', p.beneficiario_nombre_libre",
    );

    // Referencia funcional: autoridad congelada de la obligación.
    expect(query).toContain('os_op.codigo_pago ILIKE');

    // OP-<id> es únicamente compatibilidad para OP legacy sin número persistido.
    expect(query).toContain(
      "NULLIF(BTRIM(d.numero), '') IS NULL",
    );
    expect(query).toContain(
      "AND ('OP-' || p.id) ILIKE",
    );

    // La combinación/paginación contractual de Bandeja permanece.
    expect(query).toContain('UNION ALL');
    expect(query).toContain(
      'ORDER BY fecha ASC, contexto ASC, orden ASC, documento ASC',
    );
  });


  it('scope OP conserva empresa autenticada como filtro de pertenencia', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'OTRA_EMPRESA',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    expect(sqlMock).toHaveBeenCalledTimes(2);

    const [strings, ...values] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('c.empresa_codigo =');
    expect(values).toContain('OTRA_EMPRESA');
    expect(query).not.toContain("d.metadata->>'workspaceId'");
  });

  it('scope OP conserva clienteDestino autorizado como filtro de pertenencia', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 999,
      },
    );

    expect(sqlMock).toHaveBeenCalledTimes(2);

    const [strings, ...values] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain(
      'c.cliente_destino_id IS NOT DISTINCT FROM',
    );
    expect(values).toContain(999);
    expect(query).not.toContain("d.metadata->>'workspaceId'");
  });

  it('scope contable OP usa empresa + clienteDestino y no exige igualdad con workspace de origen', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    expect(sqlMock).toHaveBeenCalledTimes(2);

    const [strings, ...values] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    // Scope contable autorizado.
    expect(query).toContain('c.empresa_codigo =');
    expect(query).toContain(
      'c.cliente_destino_id IS NOT DISTINCT FROM',
    );
    expect(values).toContain('BBTI');
    expect(values).toContain(2);

    // workspaceId de sesión NO decide pertenencia contable.
    expect(query).not.toContain("d.metadata->>'workspaceId'");
    expect(values).not.toContain('5');

    // El mes contable continúa gobernado por fechaEmision.
    expect(query).toContain('d.fecha_emision >=');
    expect(query).toContain('d.fecha_emision <');
    expect(values).toContain('2026-09-01');
    expect(values).toContain('2026-10-01');

    // No se cambia la estrategia R5B-2.
    expect(query).toContain('UNION ALL');

    // El período funcional no participa del filtro mensual.
    expect(query).not.toContain('os_op.periodo_anio =');
    expect(query).not.toContain('os_op.periodo_mes =');
  });


  it('T-COMMON-09/10 FACTURA common scope usa empresa + clienteDestino del contenedor y no workspace', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 777,
        clienteDestinoId: 2,
      },
    );

    expect(sqlMock).toHaveBeenCalledTimes(2);

    const [facturaStrings] = sqlMock.mock.calls[0];
    const facturaQuery =
      (facturaStrings as TemplateStringsArray).join('?');

    const [commonStrings, ...commonValues] =
      sqlMock.mock.calls[1];
    const commonQuery =
      (commonStrings as TemplateStringsArray).join('?');

    expect(facturaQuery).toContain(
      'co.empresa_codigo AS empresa_codigo_v2',
    );
    expect(facturaQuery).toContain(
      'co.cliente_destino_id AS cliente_destino_id_v2',
    );

    expect(commonQuery).toContain(
      'f.empresa_codigo_v2 =',
    );
    expect(commonQuery).toContain(
      'f.cliente_destino_id_v2 IS NOT DISTINCT FROM',
    );

    expect(commonValues).toContain('BBTI');
    expect(commonValues).toContain(2);

    expect(facturaQuery).not.toContain('co.workspace_id =');
    expect(commonQuery).not.toContain('f.workspace_id');
  });

  it('T-COMMON-11/12 conserva fechaEmision como mes contable y periodo funcional OP independiente', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('d.fecha_emision >=');
    expect(query).toContain('d.fecha_emision <');

    expect(query).toContain(
      "'periodo_anio', os_op.periodo_anio",
    );
    expect(query).toContain(
      "'periodo_mes', os_op.periodo_mes",
    );

    expect(query).not.toContain('os_op.periodo_anio =');
    expect(query).not.toContain('os_op.periodo_mes =');
  });

  it('T-COMMON-13 OP obtiene revisionContable desde grupo_factura.metadata', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [facturaStrings] = sqlMock.mock.calls[0];
    const facturaQuery =
      (facturaStrings as TemplateStringsArray).join('?');

    const [commonStrings] = sqlMock.mock.calls[1];
    const commonQuery =
      (commonStrings as TemplateStringsArray).join('?');

    expect(commonQuery).toContain(
      "'revision_contable', g.metadata -> 'revisionContable'",
    );

    expect(facturaQuery).toContain(
      "v2.grupo_factura_metadata -> 'revisionContable'",
    );
  });

  it('T-COMMON-14 excluye Factura sin cadena V2 sólo de common current projection', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [commonStrings] = sqlMock.mock.calls[1];
    const commonQuery =
      (commonStrings as TemplateStringsArray).join('?');

    expect(commonQuery).toContain(
      'f.grupo_factura_id IS NOT NULL',
    );
    expect(commonQuery).toContain(
      'f.documento_operativo_principal_id IS NOT NULL',
    );

    sqlMock.mockClear();

    await new ExpedientesRepository().getRevisionContable({
      empresa: 'BBTI',
      anio: 2026,
      mes: 9,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);

    const [legacyStrings] = sqlMock.mock.calls[0];
    const legacyQuery =
      (legacyStrings as TemplateStringsArray).join('?');

    expect(legacyQuery).toContain('LEFT JOIN LATERAL');
    expect(legacyQuery).not.toContain(
      'f.grupo_factura_id IS NOT NULL',
    );
  });

  it('T-COMMON-07/08 OP agrupa relaciones por grupo y una sola versión de archivo por documento', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain(
      "'documentos_relacionados', COALESCE(docs_op.documentos, '[]'::jsonb)",
    );

    expect(query).toContain(
      'gfd_op.grupo_factura_id = g.id',
    );
    expect(query).toContain(
      "gfd_op.estado = 'activo'",
    );
    expect(query).toContain(
      "'tipoRelacion', gfd_op.tipo_relacion",
    );

    expect(query).toContain(
      'da_op_current.es_version_actual DESC NULLS LAST',
    );
    expect(query).toContain(
      'da_op_current.version DESC NULLS LAST',
    );
    expect(query).toContain(
      'da_op_current.id DESC',
    );
  });

  it('T-COMMON-15/16/18 combina antes de ordenar/paginar y preserva UNION ALL', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    const unionAt = query.indexOf('UNION ALL');
    const combinedAt = query.indexOf(
      'SELECT item FROM bandeja',
    );
    const orderAt = query.indexOf(
      'ORDER BY fecha ASC, contexto ASC, orden ASC, documento ASC',
    );
    const limitAt = query.indexOf('LIMIT', orderAt);

    expect(unionAt).toBeGreaterThan(-1);
    expect(combinedAt).toBeGreaterThan(unionAt);
    expect(orderAt).toBeGreaterThan(combinedAt);
    expect(limitAt).toBeGreaterThan(orderAt);
  });

  it('T-COMMON-17 ejecuta common adapter y conserva el objeto legacy observable', async () => {
    const facturaLegacy = {
      origen: 'OC_OS',
      factura_id: 501,
      documento_id: 501,
      grupo_factura_id: 81,
      documento_operativo_principal_id: 41,
      documento_principal_tipo: 'OC',
      documento_principal_numero: '008138',
      empresa_codigo_v2: 'BBTI',
      cliente_destino_id_v2: 2,
      fecha_emision: '2026-09-05',
      moneda: 'USD',
      monto_total: '100.00',
      codigo_centro_costo: 'CC-01',
      razon_social_emisor: 'Proveedor SAC',
      ruc_emisor: '20123456789',
      documentos: [],
      revision_contable: {
        estado: 'PENDIENTE',
      },
    };

    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          item: facturaLegacy,
        },
      ]);

    const result =
      await new ExpedientesRepository().getRevisionContable(
        {
          empresa: 'BBTI',
          anio: 2026,
          mes: 9,
        },
        {
          workspaceId: 5,
          clienteDestinoId: 2,
        },
      );

    expect(sqlMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(facturaLegacy);
  });


  it('K10O23 transporta emisor fiscal del único regularizador activo sin sustituir proveedor OP', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain("'proveedorId', p.proveedor_id");
    expect(query).toContain("'rucEmisor', prov_op.ruc");
    expect(query).toContain("'razonSocialEmisor', prov_op.razon_social");

    expect(query).toContain(
      "'regularizadorEmisorNombre', reg_emisor_op.razon_social_emisor",
    );
    expect(query).toContain(
      "'regularizadorEmisorRuc', reg_emisor_op.ruc_emisor",
    );
    expect(query).toContain(
      "'regularizadorTipoRelacion', reg_emisor_op.tipo_relacion",
    );
    expect(query).toContain(
      "'regularizadorDocumentoId', reg_emisor_op.documento_id",
    );

    expect(query).toContain("gfd_reg.tipo_relacion IN (");
    expect(query).toContain("'regularizador_factura'");
    expect(query).toContain("'regularizador_recibo_honorario'");
    expect(query).toContain("gfd_reg.estado = 'activo'");
  });

  it('K10O23 resuelve beneficiario OP exclusivamente según modo congelado de obligación', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    expect(query).toContain(
      "'beneficiarioTipo', os_op.tipo_beneficiario_aplicado",
    );
    expect(query).toContain(
      "WHEN 'PROVEEDOR' THEN prov_op.razon_social",
    );
    expect(query).toContain(
      "WHEN 'CLIENTE_DESTINO' THEN COALESCE(benef_cd.nombre_oficial, benef_cd.abreviatura)",
    );
    expect(query).toContain(
      "WHEN 'USUARIO' THEN NULLIF(BTRIM(CONCAT_WS(' ', benef_usr.nombres, benef_usr.apellidos)), '')",
    );
    expect(query).toContain(
      "WHEN 'NOMBRE_LIBRE' THEN NULLIF(BTRIM(p.beneficiario_nombre_libre), '')",
    );

    expect(query).toContain(
      'benef_cd.id = p.beneficiario_cliente_destino_id',
    );
    expect(query).toContain(
      'benef_usr.id = p.beneficiario_usuario_id',
    );
  });

  it('K10O23 lateral del emisor no multiplica filas y sólo expone identidad con cardinalidad uno', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        anio: 2026,
        mes: 9,
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    expect(query).toContain('COUNT(*)::int AS cantidad');
    expect(query).toContain(
      'CASE WHEN COUNT(*) = 1 THEN MAX(d_reg.id) END AS documento_id',
    );
    expect(query).toContain(
      'CASE WHEN COUNT(*) = 1 THEN MAX(gfd_reg.tipo_relacion) END AS tipo_relacion',
    );
    expect(query).toContain(
      "'regularizadorActivoCantidad', COALESCE(reg_emisor_op.cantidad, 0)",
    );

    expect(query).not.toContain('LIMIT 2 ) reg_emisor_op');
  });

  it('K10O23 falla cerrado si una OP presenta más de un regularizador elegible activo', async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          item: {
            origen: 'ORDEN_PAGO',
            ordenPagoId: 999,
            regularizadorActivoCantidad: 2,
          },
        },
      ]);

    await expect(
      new ExpedientesRepository().getRevisionContable(
        {
          empresa: 'BBTI',
          anio: 2026,
          mes: 9,
        },
        {
          workspaceId: 5,
          clienteDestinoId: 2,
        },
      ),
    ).rejects.toThrow('MULTIPLE_ACTIVE_REGULARIZERS');
  });

  it('K10O23 conserva búsqueda SQL OP por proveedor propio sin mezclar beneficiario', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: 'RIMAC',
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray).join('?');

    expect(query).toContain('prov_op.ruc ILIKE');
    expect(query).toContain('prov_op.razon_social ILIKE');

    expect(query).not.toContain('p.beneficiario_nombre_libre ILIKE');
    expect(query).not.toContain('benef_cd.nombre_oficial ILIKE');
    expect(query).not.toContain('benef_cd.abreviatura ILIKE');
    expect(query).not.toContain('benef_usr.nombres ILIKE');
    expect(query).not.toContain('benef_usr.apellidos ILIKE');
  });


  it('K10O24 preserva búsquedas OP existentes de proveedor y concepto', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: 'RIMAC',
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    // T01 / T02 — K10O22 frozen provider search.
    expect(query).toContain('prov_op.ruc ILIKE');
    expect(query).toContain('prov_op.razon_social ILIKE');

    // T03 / T04 — canonical concept search remains global/backend.
    expect(query).toContain('concepto_op.codigo');
    expect(query).toContain('concepto_op.nombre');
    expect(query).toContain(
      "concepto_op.codigo, concepto_op.nombre ) ILIKE",
    );
  });

  it('K10O24 busca beneficiario OP exclusivamente según modalidad congelada', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: 'Acme 1600',
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    // T05 — NOMBRE_LIBRE.
    expect(query).toContain(
      "WHEN 'NOMBRE_LIBRE' THEN NULLIF(BTRIM(p.beneficiario_nombre_libre), '')",
    );

    // T06 — PROVEEDOR.
    expect(query).toContain(
      "WHEN 'PROVEEDOR' THEN concat_ws(' ', prov_op.razon_social, prov_op.ruc)",
    );

    // Remaining legitimate frozen modes.
    expect(query).toContain("WHEN 'CLIENTE_DESTINO' THEN");
    expect(query).toContain('benef_cd.nombre_oficial');
    expect(query).toContain('benef_cd.abreviatura');
    expect(query).toContain('benef_cd.ruc');

    expect(query).toContain("WHEN 'USUARIO' THEN");
    expect(query).toContain('benef_usr.nombres');
    expect(query).toContain('benef_usr.apellidos');

    // T07 — no indiscriminate cross-mode predicates.
    expect(query).toContain(
      'CASE os_op.tipo_beneficiario_aplicado',
    );
    expect(query).not.toContain('p.beneficiario_nombre_libre ILIKE');
    expect(query).not.toContain('benef_cd.nombre_oficial ILIKE');
    expect(query).not.toContain('benef_cd.abreviatura ILIKE');
    expect(query).not.toContain('benef_usr.nombres ILIKE');
    expect(query).not.toContain('benef_usr.apellidos ILIKE');
  });

  it('K10O24 busca emisor sólo del único regularizador elegible activo', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: 'CAYETANO',
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[1];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    // T08 / T09 / T10 / T11 — same persisted fiscal identity
    // supports RH and Factura because both are eligible relations.
    expect(query).toContain(
      'COALESCE(reg_emisor_op.cantidad, 0) = 1',
    );
    expect(query).toContain(
      'reg_emisor_op.razon_social_emisor ILIKE',
    );
    expect(query).toContain(
      'reg_emisor_op.ruc_emisor ILIKE',
    );

    expect(query).toContain(
      "gfd_reg.tipo_relacion IN ( 'regularizador_factura', 'regularizador_recibo_honorario' )",
    );

    // T12 — unrelated documents cannot become regularizer emitter.
    expect(query).not.toContain(
      "gfd_reg.tipo_relacion = 'adjunto_transferencia'",
    );
    expect(query).not.toContain(
      "gfd_reg.tipo_relacion = 'principal'",
    );

    // T13 — inactive regularizer cannot feed the lateral identity.
    expect(query).toContain("gfd_reg.estado = 'activo'");

    // T14 — aggregate lateral returns one row and never joins one row
    // per regularizer into the obligation result.
    expect(query).toContain('COUNT(*)::int AS cantidad');
    expect(query).toContain(
      'CASE WHEN COUNT(*) = 1 THEN MAX(d_reg.id) END AS documento_id',
    );
  });

  it('K10O24 preserva búsqueda OC/OS y sustentos de pago sin reinterpretarlos', async () => {
    await new ExpedientesRepository().getRevisionContable(
      {
        empresa: 'BBTI',
        q: '008138',
      },
      {
        workspaceId: 5,
        clienteDestinoId: 2,
      },
    );

    const [strings] = sqlMock.mock.calls[0];
    const query = (strings as TemplateStringsArray)
      .join('?')
      .replace(/\s+/g, ' ')
      .trim();

    // T15 — OC/OS regression.
    expect(query).toContain('fp.numero ILIKE');
    expect(query).toContain('fp.serie ILIKE');
    expect(query).toContain('fp.razon_social_emisor ILIKE');
    expect(query).toContain('fp.ruc_emisor ILIKE');
    expect(query).toContain('v2.documento_principal_numero ILIKE');
    expect(query).toContain('d_busqueda.numero ILIKE');
    expect(query).toContain('d_busqueda.razon_social_emisor ILIKE');
    expect(query).toContain(
      "gfd_pago_busqueda.tipo_relacion = 'adjunto_transferencia'",
    );
  });

});
