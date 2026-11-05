import { sql } from '@documental/database';
import { PeriodoDocumentalR2Repository } from './periodo-documental-r2.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('PeriodoDocumentalR2Repository', () => {
  const repository = new PeriodoDocumentalR2Repository();

  const contexto = {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 7,
    expedienteId: 26,
  };

  const relacion = {
    facturaDocumentoId: 97,
    fechaEmision: '2026-07-21',
    empresaCodigo: 'BBTI',
    clienteDestinoId: 7,
    expedienteId: 26,
    integridadValida: true,
  };

  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
    sqlMock.mockResolvedValue([relacion]);
  });

  it.each([
    ['NUEVA_GUIA', { grupoFacturaId: 6 }],
    ['NUEVA_NI', { grupoFacturaId: 6 }],
    ['VERSION_FACTURA', { documentoId: 97 }],
    ['VERSION_GUIA', { documentoId: 88 }],
  ])('resuelve el periodo para %s', async (operacion, ids) => {
    const resultado = await repository.resolver(
      contexto,
      { operacion, ...ids } as Parameters<typeof repository.resolver>[1],
    );

    expect(resultado).toMatchObject({
      anio: '2026',
      mes: '07',
      facturaDocumentoId: 97,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza workspace inválido antes de consultar SQL', async () => {
    await expect(
      repository.resolver(
        { ...contexto, workspaceId: 0 },
        { operacion: 'NUEVA_GUIA', grupoFacturaId: 6 },
      ),
    ).rejects.toThrow('PERIODO_R2_CONTEXTO_INVALIDO');

    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rechaza expediente nulo antes de consultar SQL', async () => {
    await expect(
      repository.resolver(
        { ...contexto, expedienteId: null } as unknown as typeof contexto,
        { operacion: 'NUEVA_GUIA', grupoFacturaId: 6 },
      ),
    ).rejects.toThrow('PERIODO_R2_CONTEXTO_INVALIDO');

    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rechaza relaciones de otra empresa', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, empresaCodigo: 'OTRA' },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'NUEVA_GUIA', grupoFacturaId: 6 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });

  it('rechaza Facturas organizadoras ambiguas', async () => {
    sqlMock.mockResolvedValueOnce([
      relacion,
      { ...relacion, facturaDocumentoId: 98 },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_FACTURA_AMBIGUA');
  });

  it('rechaza fechas contradictorias', async () => {
    sqlMock.mockResolvedValueOnce([
      relacion,
      { ...relacion, fechaEmision: '2026-08-01' },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_FECHAS_CONTRADICTORIAS');
  });

  it('rechaza grupoFacturaId inválido antes de SQL', async () => {
    await expect(
      repository.resolver(
        contexto,
        { operacion: 'NUEVA_GUIA', grupoFacturaId: 0 },
      ),
    ).rejects.toThrow('PERIODO_R2_SOLICITUD_INVALIDA');

    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('rechaza documentoId inválido antes de SQL', async () => {
    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: -1 },
      ),
    ).rejects.toThrow('PERIODO_R2_SOLICITUD_INVALIDA');

    expect(sqlMock).not.toHaveBeenCalled();
  });

  it('conserva asociaciones activas incompletas para rechazarlas', async () => {
    await repository.resolver(
      contexto,
      { operacion: 'VERSION_GUIA', documentoId: 88 },
    );

    const llamada = sqlMock.mock.calls[0];
    const fragmentos = llamada[0] as TemplateStringsArray;
    const consulta = fragmentos.join('?');

    expect(consulta).toMatch(
      /FROM documentos\.grupo_factura_documentos v/,
    );

    expect(consulta).toMatch(
      /LEFT JOIN documentos\.grupos_factura g/,
    );

    expect(consulta).toMatch(
      /LEFT JOIN documentos\.documentos f/,
    );

    expect(consulta).not.toMatch(/\bLIMIT\s+1\b/i);
  });

  it('rechaza una asociación activa incompleta', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: false },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza una asociación incompleta aunque exista otra válida', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: true },
      {
        ...relacion,
        facturaDocumentoId: 105,
        integridadValida: false,
      },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza grupo incompleto para NUEVA_GUIA', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: false },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'NUEVA_GUIA', grupoFacturaId: 7 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza grupo incompleto para NUEVA_NI', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: false },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'NUEVA_NI', grupoFacturaId: 7 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza asociación incompleta para VERSION_FACTURA', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: false },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_FACTURA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza VERSION_FACTURA si una asociación es inválida', async () => {
    sqlMock.mockResolvedValueOnce([
      { ...relacion, integridadValida: true },
      { ...relacion, integridadValida: false },
    ]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_FACTURA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });

  it('rechaza la ausencia de relaciones', async () => {
    sqlMock.mockResolvedValueOnce([]);

    await expect(
      repository.resolver(
        contexto,
        { operacion: 'VERSION_GUIA', documentoId: 88 },
      ),
    ).rejects.toThrow('PERIODO_R2_FACTURA_NO_ENCONTRADA');
  });
});

describe('PeriodoDocumentalR2Repository sustentos', () => {
  const repository = new PeriodoDocumentalR2Repository();
  const contexto = { workspaceId: 1, empresaCodigo: 'BBTI', clienteDestinoId: 2, expedienteId: 118 };
  const solicitud = { grupoFacturaId: 138, documentoBaseId: 486 };
  const row = { ...solicitud, organizadorDocumentoId: '487', tipoOrganizador: 'FACTURA',
    fechaEmision: '2026-07-21', empresaCodigo: 'BBTI', clienteDestinoId: '2',
    expedienteId: '118', integridadValida: true };
  const mock = sql as unknown as jest.Mock;
  beforeEach(() => mock.mockReset());
  it.each(['FACTURA', 'ORDEN_PAGO'])('resuelve organizador persistido %s', async tipoOrganizador => {
    mock.mockResolvedValue([{ ...row, tipoOrganizador, organizadorDocumentoId: tipoOrganizador === 'FACTURA' ? '487' : '486', fechaEmision: tipoOrganizador === 'FACTURA' ? '2026-07-21' : '2026-01-31' }]);
    const result = await repository.resolverSustento(contexto, solicitud);
    expect(result.mes).toBe(tipoOrganizador === 'FACTURA' ? '07' : '01');
    const query = mock.mock.calls[0][0].join('?');
    expect(query).toContain("g.origen_obligacion = 'FACTURA'");
    expect(query).toContain("g.origen_obligacion = 'ORDEN_PAGO'");
    expect(query).toContain("p.tipo_principal IN ('OC','OS')");
    expect(query).toContain("p.estado = 'activo'");
    expect(query).toContain("c.estado = 'activo'");
    expect(query).not.toMatch(/LIMIT 1|UPDATE|INSERT|DELETE/);
  });
  it('rechaza integridad falsa, relación ausente y ambigüedad', async () => {
    mock.mockResolvedValueOnce([{ ...row, integridadValida: false }]);
    await expect(repository.resolverSustento(contexto, solicitud)).rejects.toThrow('PERIODO_R2_RELACION_INCOMPLETA');
    mock.mockResolvedValueOnce([]);
    await expect(repository.resolverSustento(contexto, solicitud)).rejects.toThrow('PERIODO_R2_ORGANIZADOR_NO_ENCONTRADO');
    mock.mockResolvedValueOnce([row, { ...row, organizadorDocumentoId: '999' }]);
    await expect(repository.resolverSustento(contexto, solicitud)).rejects.toThrow('PERIODO_R2_ORGANIZADOR_AMBIGUO');
  });
  it.each([{ documentoBaseId: 99 }, { empresaCodigo: 'OTRA' }, { clienteDestinoId: '99' }, { expedienteId: '99' }])('rechaza identidad %j', async patch => {
    mock.mockResolvedValue([{ ...row, ...patch }]);
    await expect(repository.resolverSustento(contexto, solicitud)).rejects.toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });
  it('rechaza IDs incompletos antes de SQL', async () => {
    await expect(repository.resolverSustento({ ...contexto, clienteDestinoId: null }, solicitud)).rejects.toThrow();
    await expect(repository.resolverSustento(contexto, { ...solicitud, documentoBaseId: 0 })).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
