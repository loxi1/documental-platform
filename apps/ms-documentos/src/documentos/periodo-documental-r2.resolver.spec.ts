import {
  resolverPeriodoDesdeRelacionesR2,
  type PeriodoR2Contexto,
  type PeriodoR2Relacion,
  type PeriodoR2Solicitud,
} from './periodo-documental-r2.resolver';

describe('resolverPeriodoDesdeRelacionesR2', () => {
  const contexto: PeriodoR2Contexto = {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 7,
    expedienteId: 26,
  };

  const solicitud: PeriodoR2Solicitud = {
    operacion: 'NUEVA_GUIA',
    grupoFacturaId: 6,
  };

  const relacion: PeriodoR2Relacion = {
    facturaDocumentoId: 97,
    fechaEmision: '2026-07-21',
    empresaCodigo: 'BBTI',
    clienteDestinoId: 7,
    expedienteId: 26,
  };

  it('resuelve la fecha de la Factura organizadora', () => {
    const resultado = resolverPeriodoDesdeRelacionesR2(
      contexto,
      solicitud,
      [relacion],
    );

    expect(resultado).toMatchObject({
      anio: '2026',
      mes: '07',
      facturaDocumentoId: 97,
    });
  });

  it('acepta relaciones repetidas de la misma Factura y fecha', () => {
    const resultado = resolverPeriodoDesdeRelacionesR2(
      contexto,
      { operacion: 'VERSION_GUIA', documentoId: 88 },
      [relacion, { ...relacion }],
    );

    expect(resultado.facturaDocumentoId).toBe(97);
  });

  it('rechaza la ausencia de Factura organizadora', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, []),
    ).toThrow('PERIODO_R2_FACTURA_NO_ENCONTRADA');
  });

  it('rechaza Facturas organizadoras diferentes', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        relacion,
        { ...relacion, facturaDocumentoId: 98 },
      ]),
    ).toThrow('PERIODO_R2_FACTURA_AMBIGUA');
  });

  it('rechaza fechas contradictorias', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        relacion,
        { ...relacion, fechaEmision: '2026-08-01' },
      ]),
    ).toThrow('PERIODO_R2_FECHAS_CONTRADICTORIAS');
  });

  it('rechaza fechas inexistentes', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        { ...relacion, fechaEmision: '2026-02-30' },
      ]),
    ).toThrow('FECHA_DOCUMENTAL_R2_INVALIDA');
  });

  it('rechaza otra empresa', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        { ...relacion, empresaCodigo: 'OTRA' },
      ]),
    ).toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });

  it('rechaza otro cliente destino', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        { ...relacion, clienteDestinoId: 9 },
      ]),
    ).toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });

  it('rechaza otro expediente', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(contexto, solicitud, [
        { ...relacion, expedienteId: 27 },
      ]),
    ).toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });

  it('rechaza contexto sin workspace válido', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(
        { ...contexto, workspaceId: 0 },
        solicitud,
        [relacion],
      ),
    ).toThrow('PERIODO_R2_CONTEXTO_INVALIDO');
  });

  it('rechaza identificadores inválidos', () => {
    expect(() =>
      resolverPeriodoDesdeRelacionesR2(
        contexto,
        { operacion: 'NUEVA_NI', grupoFacturaId: 0 },
        [relacion],
      ),
    ).toThrow('PERIODO_R2_SOLICITUD_INVALIDA');
  });
});

describe('periodo de sustentos financieros', () => {
  const resolver = require('./periodo-documental-r2.resolver').resolverPeriodoSustentoDesdeRelacionesR2;
  const contexto = { workspaceId: 1, empresaCodigo: 'BBTI', clienteDestinoId: 2, expedienteId: 118 };
  const solicitud = { grupoFacturaId: 138, documentoBaseId: 486 };
  const relacion = { ...solicitud, organizadorDocumentoId: 487, tipoOrganizador: 'FACTURA',
    fechaEmision: '2026-07-21', empresaCodigo: 'BBTI', clienteDestinoId: 2,
    expedienteId: 118, relacionActiva: true };
  it('usa Factura para OC/OS y conserva la relación de entrada', () => {
    const before = JSON.stringify(relacion);
    expect(resolver(contexto, solicitud, [relacion])).toMatchObject({ anio: '2026', mes: '07', organizadorDocumentoId: 487 });
    expect(JSON.stringify(relacion)).toBe(before);
  });
  it('usa fecha OP sin exigir ni inventar Factura', () => {
    const result = resolver(contexto, solicitud, [{ ...relacion, tipoOrganizador: 'ORDEN_PAGO', organizadorDocumentoId: 486, fechaEmision: '2026-01-31' }]);
    expect(result).toMatchObject({ mes: '01', tipoOrganizador: 'ORDEN_PAGO', organizadorDocumentoId: 486 });
    expect(result).not.toHaveProperty('facturaDocumentoId');
    expect(() => resolver(contexto, solicitud, [{ ...relacion, tipoOrganizador: 'ORDEN_PAGO', organizadorDocumentoId: 999 }])).toThrow('PERIODO_R2_RELACION_INCOMPLETA');
  });
  it.each([{ empresaCodigo: 'OTRA' }, { clienteDestinoId: 99 }, { expedienteId: 99 },
    { grupoFacturaId: 99 }, { documentoBaseId: 99 }])('rechaza identidad incompatible %j', patch => {
    expect(() => resolver(contexto, solicitud, [{ ...relacion, ...patch }])).toThrow('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
  });
  it.each([null, '2026-02-30', 'fecha'])('rechaza fecha inválida %s', fechaEmision => {
    expect(() => resolver(contexto, solicitud, [{ ...relacion, fechaEmision }])).toThrow('FECHA_DOCUMENTAL_R2_INVALIDA');
  });
  it('rechaza organizador ausente, ambiguo o fechas contradictorias', () => {
    expect(() => resolver(contexto, solicitud, [])).toThrow('PERIODO_R2_ORGANIZADOR_NO_ENCONTRADO');
    expect(() => resolver(contexto, solicitud, [relacion, { ...relacion, organizadorDocumentoId: 999 }])).toThrow('PERIODO_R2_ORGANIZADOR_AMBIGUO');
    expect(() => resolver(contexto, solicitud, [relacion, { ...relacion, fechaEmision: '2026-08-01' }])).toThrow('PERIODO_R2_FECHAS_CONTRADICTORIAS');
  });
  it('rechaza relación inactiva e identidad requerida ausente', () => {
    expect(() => resolver(contexto, solicitud, [{ ...relacion, relacionActiva: false }])).toThrow('PERIODO_R2_RELACION_INCOMPLETA');
    expect(() => resolver({ ...contexto, clienteDestinoId: null }, solicitud, [relacion])).toThrow('PERIODO_R2_CONTEXTO_INVALIDO');
    expect(() => resolver(contexto, { ...solicitud, documentoBaseId: 0 }, [relacion])).toThrow('PERIODO_R2_SOLICITUD_INVALIDA');
  });
});
