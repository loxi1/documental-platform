jest.mock('@documental/database', () => {
  const sql = jest.fn();
  (sql as any).begin = jest.fn();
  return { sql };
});
import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';
import { validarOrdenPago } from './orden-pago.dto';

const key = '571997eb-0175-4eb1-a287-11a8df3de272';
const body = { contenedorOperativoId: 7, fechaEmision: '2026-08-15', monto: '125.50',
  moneda: 'PEN', conceptoCodigo: 'AGUA', observacion: null,
  periodoAnio: 2026, periodoMes: 8 };
const actor = { id: 5, workspaceId: 2, empresaCodigo: 'LAB', clienteDestinoId: 3,
  requestId: key, correlationId: key };

describe('OP-01A creación atómica', () => {
  const tx = jest.fn();
  const audit = { registrarCreacion: jest.fn() };
  const catalogoConceptos = {
    buscarPorCodigo: jest.fn(),
    listarRepresentablesParaOrdenPago: jest.fn(),
  };
  const obligacionesSnapshot = { crear: jest.fn(), existePorGrupoFacturaId: jest.fn() };
  const regularizadoresObligacion = {
    listarConfiguradosActivosPorConcepto: jest.fn(),
    congelarParaObligacion: jest.fn(),
    listarCongeladosPorGrupoFacturaId: jest.fn(),
    permiteTipoDocumental: jest.fn(),
  };
  const configProveedores = {
    listarActivos: jest.fn(),
    estaHabilitado: jest.fn(),
  };
  const configRendicion = {
    listarActivos: jest.fn(),
    estaHabilitado: jest.fn(),
  };
  const service = new OrdenPagoService(
    audit as any,
    catalogoConceptos as any,
    obligacionesSnapshot as any,
    regularizadoresObligacion as any,
    configProveedores as any,
    configRendicion as any,
    { confirmarOcrResultadoConExpediente: jest.fn() } as any,
  );
  beforeEach(() => {
    tx.mockReset();
    audit.registrarCreacion.mockReset();
    catalogoConceptos.buscarPorCodigo.mockReset();
    catalogoConceptos.listarRepresentablesParaOrdenPago.mockReset();
    obligacionesSnapshot.crear.mockReset();
    obligacionesSnapshot.existePorGrupoFacturaId.mockReset();
    regularizadoresObligacion.listarConfiguradosActivosPorConcepto.mockReset();
    regularizadoresObligacion.congelarParaObligacion.mockReset();
    regularizadoresObligacion.listarCongeladosPorGrupoFacturaId.mockReset();
    regularizadoresObligacion.permiteTipoDocumental.mockReset();
    configProveedores.listarActivos.mockReset();
    configProveedores.estaHabilitado.mockReset();
    configRendicion.listarActivos.mockReset();
    configRendicion.estaHabilitado.mockReset();

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 6,
      codigo: 'AGUA',
      nombre: 'Agua',
      clasificacion: 'SERVICIOS',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
    });

    obligacionesSnapshot.crear.mockResolvedValue(undefined);
    regularizadoresObligacion.listarConfiguradosActivosPorConcepto.mockResolvedValue([]);
    regularizadoresObligacion.congelarParaObligacion.mockResolvedValue(undefined);
    (sql.begin as jest.Mock).mockClear();
    (sql.begin as jest.Mock).mockImplementation(fn => fn(tx));
  });
  function created() {
    const timestamp = new Date('2026-09-14T18:30:00Z');
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]).mockResolvedValueOnce([{ id: 10, creado_en: timestamp }])
      .mockResolvedValueOnce([{ id: 11 }])
      .mockResolvedValueOnce([{ numero: '0000000011' }])
      .mockResolvedValueOnce([{ id: 12 }]);
    return timestamp;
  }
  it('crea sin archivo/formal/OCR y audita actor, IDs y fecha real separada', async () => {
    const timestamp = created();

    expect(await service.crear(body, key, actor)).toEqual({
      documentoId: 10,
      ordenPagoId: 11,
      grupoFacturaId: 12,
      contenedorOperativoId: 7,
      idempotente: false,
    });

    expect(sql.begin).toHaveBeenCalled();
    expect(catalogoConceptos.buscarPorCodigo).toHaveBeenCalledWith('AGUA', tx);
    expect(obligacionesSnapshot.crear).toHaveBeenCalledTimes(1);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith({
      grupoFacturaId: 12,
      conceptoId: 6,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: null,
      tipoBeneficiarioAplicado: 'NO_APLICA',
      usoBeneficiarioAplicado: 'NO_APLICA',
    }, tx);

    const documentoInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes('INSERT INTO documentos.documentos')
    );
    expect(documentoInsert).toBeDefined();

    const numeroUpdate = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes('UPDATE documentos.documentos') &&
      String(call[0]?.[0] ?? '').includes('SET numero=')
    );
    expect(numeroUpdate).toBeDefined();
    expect(numeroUpdate!.slice(1)).toEqual(
      expect.arrayContaining(['0000000011', 10]),
    );

    const numeroUpdateQuery = String(numeroUpdate![0]?.join('?') ?? '');
    expect(numeroUpdateQuery).toContain("tipo_documental='ORDEN_PAGO'");
    expect(numeroUpdateQuery).toContain('numero IS NULL');
    expect(numeroUpdateQuery).toContain('RETURNING numero');

    const documentoParams = documentoInsert!.slice(1);
    const metadataParam = documentoParams.find(param =>
      typeof param === 'string' &&
      param.includes('"ordenPago"') &&
      param.includes('"FINANZAS_OP_01A"')
    );

    expect(metadataParam).toBeDefined();

    const metadata = JSON.parse(metadataParam as string);
    expect(metadata.ordenPago).toEqual({ observacion: null });
    expect(metadata.ordenPago).not.toHaveProperty('tipo');
    expect(metadata.ordenPago).not.toHaveProperty('subtipo');
    expect(metadata.ordenPago).not.toHaveProperty('conceptoCodigo');

    const queries = tx.mock.calls.map(([parts]) => parts.join('?')).join('\n');
    expect(queries).toContain("NULL, 'ORDEN_PAGO'");
    expect(queries).not.toMatch(/ocr_resultados|documentos_archivos|documentos_factura|nats/);

    expect(audit.registrarCreacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario: expect.objectContaining(actor),
        despues: expect.objectContaining({
          documentoId: 10,
          ordenPagoId: 11,
          grupoFacturaId: 12,
          creadoEn: timestamp,
          fechaEmision: '2026-08-15',
          workspaceId: 2,
        }),
      }),
      tx,
    );
  });
  it.each([
    [1, '0000000001'],
    [42, '0000000042'],
    [153, '0000000153'],
  ])(
    'T-NUM creación ordenPagoId=%i persiste número documental %s sobre el mismo documento',
    async (ordenPagoId, numeroEsperado) => {
      const timestamp = new Date('2026-09-14T18:30:00Z');
      const documentoId = 10;
      const grupoFacturaId = 12;

      tx.mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 7 }])
        .mockResolvedValueOnce([{ codigo: 'PEN' }])
        .mockResolvedValueOnce([{ id: documentoId, creado_en: timestamp }])
        .mockResolvedValueOnce([{ id: ordenPagoId }])
        .mockResolvedValueOnce([{ numero: numeroEsperado }])
        .mockResolvedValueOnce([{ id: grupoFacturaId }]);

      const resultado = await service.crear(body, key, actor);

      expect(resultado).toMatchObject({
        documentoId,
        ordenPagoId,
        grupoFacturaId,
        idempotente: false,
      });

      const updatesNumero = tx.mock.calls.filter(call =>
        String(call[0]?.[0] ?? '').includes('UPDATE documentos.documentos') &&
        String(call[0]?.[0] ?? '').includes('SET numero=')
      );

      expect(updatesNumero).toHaveLength(1);

      const numeroUpdate = updatesNumero[0];
      const params = numeroUpdate.slice(1);
      const query = String(numeroUpdate[0]?.join('?') ?? '');

      expect(params).toEqual(
        expect.arrayContaining([numeroEsperado, documentoId]),
      );
      expect(numeroEsperado).toMatch(/^\d{10}$/);
      expect(numeroEsperado).not.toContain('OP-');

      expect(query).toContain("tipo_documental='ORDEN_PAGO'");
      expect(query).toContain('numero IS NULL');
      expect(query).toContain('RETURNING numero');
    },
  );

  it('T-NUM detalle usa documentos.numero como autoridad visible', async () => {
    const detalleTx = sql as unknown as jest.Mock;

    detalleTx.mockResolvedValueOnce([{
      ordenPagoId: 153,
      documentoId: 10,
      grupoFacturaId: 12,
      contenedorOperativoId: 7,
      expedienteId: null,
      empresaCodigo: actor.empresaCodigo,
      numeroDocumental: '0000000153',
      fechaEmision: '2026-08-15',
      monto: '100.00',
      moneda: 'PEN',
      estado: 'activo',
      tipo: null,
      subtipo: null,
      tieneSnapshot: true,
      conceptoCodigo: 'AGUA',
      conceptoNombre: 'Agua',
      requiereRegularizacion: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: null,
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      proveedorId: null,
      beneficiarioClienteDestinoId: null,
      beneficiarioUsuarioId: null,
      beneficiarioNombreLibre: null,
      observacion: null,
      contexto: {},
      archivoInicial: null,
    }]);

    regularizadoresObligacion.listarCongeladosPorGrupoFacturaId
      .mockResolvedValueOnce([]);

    const detalle = await service.obtenerDetalle(153, actor);

    expect(detalle.numero).toBe('0000000153');
  });

  it('T-NUM detalle usa OP-id sólo como fallback legado cuando documentos.numero es NULL', async () => {
    const detalleTx = sql as unknown as jest.Mock;

    detalleTx.mockResolvedValueOnce([{
      ordenPagoId: 153,
      documentoId: 10,
      grupoFacturaId: 12,
      contenedorOperativoId: 7,
      expedienteId: null,
      empresaCodigo: actor.empresaCodigo,
      numeroDocumental: null,
      fechaEmision: '2026-08-15',
      monto: '100.00',
      moneda: 'PEN',
      estado: 'activo',
      tipo: null,
      subtipo: null,
      tieneSnapshot: true,
      conceptoCodigo: 'AGUA',
      conceptoNombre: 'Agua',
      requiereRegularizacion: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: null,
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      proveedorId: null,
      beneficiarioClienteDestinoId: null,
      beneficiarioUsuarioId: null,
      beneficiarioNombreLibre: null,
      observacion: null,
      contexto: {},
      archivoInicial: null,
    }]);

    regularizadoresObligacion.listarCongeladosPorGrupoFacturaId
      .mockResolvedValueOnce([]);

    const detalle = await service.obtenerDetalle(153, actor);

    expect(detalle.numero).toBe('OP-153');
  });

  it('replay conserva IDs y no repite inserciones ni auditoría', async () => {
    created(); await service.crear(body, key, actor);
    const hash = tx.mock.calls[5].at(-1);
    tx.mockReset();
    audit.registrarCreacion.mockClear();
    catalogoConceptos.buscarPorCodigo.mockClear();
    obligacionesSnapshot.crear.mockClear();
    regularizadoresObligacion.listarConfiguradosActivosPorConcepto.mockClear();
    regularizadoresObligacion.congelarParaObligacion.mockClear();
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ordenPagoId: 11, documentoId: 10,
      contenedorOperativoId: 7, grupoFacturaId: 12, op_payload_hash: hash, estado: 'activo' }]);
    expect(await service.crear(body, key, actor)).toMatchObject({ idempotente: true, ordenPagoId: 11, grupoFacturaId: 12 });
    expect(tx).toHaveBeenCalledTimes(2);
    expect(catalogoConceptos.buscarPorCodigo).not.toHaveBeenCalled();
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(
      regularizadoresObligacion.listarConfiguradosActivosPorConcepto,
    ).not.toHaveBeenCalled();
    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();

    const replayQueries = tx.mock.calls
      .map(call =>
        Array.isArray(call[0])
          ? call[0].map((fragmento: unknown) => String(fragmento)).join(' ')
          : String(call[0] ?? '')
      )
      .join('\n');

    expect(replayQueries).not.toContain('UPDATE documentos.documentos');
    expect(replayQueries).not.toContain('SET numero=');
  });
  it('crea concepto representable que requiere regularización como PENDIENTE', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 20,
      codigo: 'RECIBO_HONORARIOS',
      nombre: 'Recibo por Honorarios',
      clasificacion: 'HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['RECIBO_HONORARIO']);

    await service.crear(
      {
        ...body,
        conceptoCodigo: 'RECIBO_HONORARIOS',
        beneficiarioNombreLibre: 'MARIA PEREZ QUISPE',
      },
      key,
      actor,
    );

    expect(catalogoConceptos.buscarPorCodigo)
      .toHaveBeenCalledWith('RECIBO_HONORARIOS', tx);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith({
      grupoFacturaId: 12,
      conceptoId: 20,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'PENDIENTE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: null,
      tipoBeneficiarioAplicado: 'NOMBRE_LIBRE',
      usoBeneficiarioAplicado: 'REQUERIDO',
    }, tx);
  });

  it('NO_REQUIERE no congela regularizadores aunque exista configuración accidental', async () => {
    created();

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['FACTURA']);

    await service.crear(body, key, actor);

    expect(
      regularizadoresObligacion.listarConfiguradosActivosPorConcepto,
    ).toHaveBeenCalledWith(6, tx);

    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).not.toHaveBeenCalled();

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 12,
        conceptoId: 6,
        requiereRegularizacionAplicada: false,
        estadoRegularizacion: 'NO_REQUIERE',
      }),
      tx,
    );
  });

  it('requiere regularización con N=0 aborta antes del primer INSERT', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 20,
      codigo: 'RECIBO_HONORARIOS',
      nombre: 'Recibo por Honorarios',
      clasificacion: 'HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce([]);

    await expect(
      service.crear(
        {
          ...body,
          conceptoCodigo: 'RECIBO_HONORARIOS',
          beneficiarioNombreLibre: 'MARIA PEREZ QUISPE',
        },
        key,
        actor,
      ),
    ).rejects.toThrow(
      'CONCEPTO_OBLIGACION_SIN_REGULARIZADOR_CONFIGURADO',
    );

    expect(
      regularizadoresObligacion.listarConfiguradosActivosPorConcepto,
    ).toHaveBeenCalledWith(20, tx);

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();

    const queries = tx.mock.calls
      .map(([parts]) => Array.isArray(parts) ? parts.join('?') : String(parts))
      .join('\n');

    expect(queries).not.toContain('INSERT INTO documentos.documentos');
    expect(queries).not.toContain(
      'INSERT INTO documentos.documentos_operativos_principales',
    );
    expect(queries).not.toContain(
      'INSERT INTO documentos.grupos_factura',
    );
  });

  it('requiere regularización con N=1 congela exactamente el tipo permitido en el mismo tx', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 20,
      codigo: 'RECIBO_HONORARIOS',
      nombre: 'Recibo por Honorarios',
      clasificacion: 'HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['RECIBO_HONORARIO']);

    await service.crear(
      {
        ...body,
        conceptoCodigo: 'RECIBO_HONORARIOS',
        beneficiarioNombreLibre: 'MARIA PEREZ QUISPE',
      },
      key,
      actor,
    );

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 12,
        conceptoId: 20,
        requiereRegularizacionAplicada: true,
        estadoRegularizacion: 'PENDIENTE',
      }),
      tx,
    );

    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).toHaveBeenCalledTimes(1);

    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).toHaveBeenCalledWith(
      12,
      ['RECIBO_HONORARIO'],
      tx,
    );
  });

  it('requiere regularización con N>1 congela exactamente todos los tipos antes de auditar', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 40,
      codigo: 'SEGUROS',
      nombre: 'Seguros',
      clasificacion: 'SEGUROS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'OPCIONAL',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'OPCIONAL',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['FACTURA', 'RECIBO_HONORARIO']);

    regularizadoresObligacion.congelarParaObligacion
      .mockImplementationOnce(async () => {
        expect(audit.registrarCreacion).not.toHaveBeenCalled();
      });

    await service.crear(
      {
        ...body,
        conceptoCodigo: 'SEGUROS',
      },
      key,
      actor,
    );

    expect(
      regularizadoresObligacion.congelarParaObligacion,
    ).toHaveBeenCalledWith(
      12,
      ['FACTURA', 'RECIBO_HONORARIO'],
      tx,
    );

    expect(audit.registrarCreacion).toHaveBeenCalledTimes(1);

    expect(
      regularizadoresObligacion.congelarParaObligacion.mock.invocationCallOrder[0],
    ).toBeLessThan(
      audit.registrarCreacion.mock.invocationCallOrder[0],
    );
  });

  it('rechaza concepto canónico ausente antes de insertar', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce(undefined);

    await expect(service.crear(body, key, actor))
      .rejects.toThrow('CONCEPTO_OBLIGACION_NO_RESUELTO');

    expect(catalogoConceptos.buscarPorCodigo).toHaveBeenCalledWith('AGUA', tx);
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
    expect(tx).toHaveBeenCalledTimes(4);
  });

  it('rechaza concepto canónico inactivo antes de insertar', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 6,
      codigo: 'AGUA',
      nombre: 'Agua',
      clasificacion: 'SERVICIOS',
      activo: false,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
    });

    await expect(service.crear(body, key, actor))
      .rejects.toThrow('CONCEPTO_OBLIGACION_INACTIVO');

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
    expect(tx).toHaveBeenCalledTimes(4);
  });
  it('acepta período opcional independiente de fechaEmision y no usa requierePeriodo histórico como bloqueo', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 30,
      codigo: 'PLAME',
      nombre: 'PLAME',
      clasificacion: 'PLANILLA',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: true,
      usoCodigoPago: 'OPCIONAL',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
    });

    await service.crear({
      ...body,
      conceptoCodigo: 'PLAME',
      fechaEmision: '2026-01-10',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: 'PLAME-2026-08',
    }, key, actor);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith({
      grupoFacturaId: 12,
      conceptoId: 30,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: 'PLAME-2026-08',
      tipoBeneficiarioAplicado: 'NO_APLICA',
      usoBeneficiarioAplicado: 'NO_APLICA',
    }, tx);
  });

  it('crea OP sin período y congela NULL/NULL sin derivarlo de fechaEmision', async () => {
    created();

    const { periodoAnio, periodoMes, ...sinPeriodo } = body;

    await service.crear({
      ...sinPeriodo,
      fechaEmision: '2026-04-27',
    }, key, actor);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith({
      grupoFacturaId: 12,
      conceptoId: 6,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: null,
      periodoMes: null,
      codigoPago: null,
      tipoBeneficiarioAplicado: 'NO_APLICA',
      usoBeneficiarioAplicado: 'NO_APLICA',
    }, tx);
  });

  it('exige referencia funcional cuando el catálogo la marca REQUERIDO', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7, cliente_destino_id: 3 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 31,
      codigo: 'SEGUROS',
      nombre: 'Seguros',
      clasificacion: 'SEGUROS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'REQUERIDO',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'CONFIGURADO',
    });

    await expect(
      service.crear({ ...body, conceptoCodigo: 'SEGUROS' }, key, actor),
    ).rejects.toThrow('REFERENCIA_FUNCIONAL_REQUERIDA');

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('bloquea proveedor requerido cuando hay 0 configurados', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 40,
      codigo: 'AFP',
      nombre: 'AFP',
      clasificacion: 'SISTEMA_PENSIONARIO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'CONFIGURADO',
    });

    configProveedores.listarActivos.mockResolvedValueOnce([]);

    await expect(
      service.crear({ ...body, conceptoCodigo: 'AFP' }, key, actor),
    ).rejects.toThrow('CONCEPTO_SIN_PROVEEDOR_CONFIGURADO');

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('autoselecciona el único proveedor configurado cuando el beneficiario es requerido', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 41,
      codigo: 'ONP',
      nombre: 'ONP',
      clasificacion: 'SISTEMA_PENSIONARIO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'CONFIGURADO',
    });

    configProveedores.listarActivos.mockResolvedValueOnce([
      {
        proveedorId: 2757,
        ruc: '20254165035',
        razonSocial: 'OFICINA DE NORMALIZACION PREVISIONAL',
      },
    ]);

    await service.crear(
      { ...body, conceptoCodigo: 'ONP' },
      key,
      actor,
    );

    expect(configProveedores.listarActivos)
      .toHaveBeenCalledWith(41, 7, tx);

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain(2757);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptoId: 41,
        tipoBeneficiarioAplicado: 'PROVEEDOR',
        usoBeneficiarioAplicado: 'REQUERIDO',
      }),
      tx,
    );
  });

  it('exige selección cuando existen N proveedores configurados para beneficiario requerido', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 42,
      codigo: 'AFP',
      nombre: 'AFP',
      clasificacion: 'SISTEMA_PENSIONARIO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'CONFIGURADO',
    });

    configProveedores.listarActivos.mockResolvedValueOnce([
      { proveedorId: 2758, ruc: '20157036794', razonSocial: 'AFP INTEGRA' },
      { proveedorId: 2759, ruc: '20510398158', razonSocial: 'PRIMA AFP S.A.' },
    ]);

    await expect(
      service.crear({ ...body, conceptoCodigo: 'AFP' }, key, actor),
    ).rejects.toThrow('BENEFICIARIO_PROVEEDOR_SELECCION_REQUERIDA');

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('acepta proveedor explícito habilitado entre N configurados', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 43,
      codigo: 'AFP',
      nombre: 'AFP',
      clasificacion: 'SISTEMA_PENSIONARIO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'CONFIGURADO',
    });

    configProveedores.listarActivos.mockResolvedValueOnce([
      { proveedorId: 2758, ruc: '20157036794', razonSocial: 'AFP INTEGRA' },
      { proveedorId: 2759, ruc: '20510398158', razonSocial: 'PRIMA AFP S.A.' },
    ]);

    await service.crear({
      ...body,
      conceptoCodigo: 'AFP',
      proveedorId: 2759,
    }, key, actor);

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain(2759);
  });

  it('rechaza como beneficiario CLIENTE_DESTINO al mismo contexto actual', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7, cliente_destino_id: 3 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 50,
      codigo: 'TRANSFERENCIA_A_CONSORCIO',
      nombre: 'Transferencia a consorcio',
      clasificacion: 'PRESTAMO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'CLIENTE_DESTINO',
      usoBeneficiario: 'REQUERIDO',
    });

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'TRANSFERENCIA_A_CONSORCIO',
        beneficiarioClienteDestinoId: 3,
      }, key, actor),
    ).rejects.toThrow(
      'BENEFICIARIO_CLIENTE_DESTINO_ES_CONTEXTO_ACTUAL'
    );

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('rechaza CLIENTE_DESTINO que no resuelve como activo', async () => {
    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7, cliente_destino_id: 3 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }])
      .mockResolvedValueOnce([]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 51,
      codigo: 'TRANSFERENCIA_A_CONSORCIO',
      nombre: 'Transferencia a consorcio',
      clasificacion: 'PRESTAMO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'CLIENTE_DESTINO',
      usoBeneficiario: 'REQUERIDO',
    });

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'TRANSFERENCIA_A_CONSORCIO',
        beneficiarioClienteDestinoId: 4,
      }, key, actor),
    ).rejects.toThrow(
      'BENEFICIARIO_CLIENTE_DESTINO_NO_HABILITADO'
    );

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();

    const consulta = tx.mock.calls
      .map(call =>
        Array.isArray(call[0])
          ? call[0].map((fragmento: unknown) => String(fragmento)).join(' ')
          : String(call[0] ?? '')
      )
      .find(sql => sql.includes('FROM core.clientes_destino'));

    expect(consulta).toContain('estado = true');
  });

  it('acepta CLIENTE_DESTINO activo distinto del contexto actual', async () => {
    const timestamp = new Date('2026-09-14T18:30:00Z');

    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7, cliente_destino_id: 3 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }])
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([{ id: 10, creado_en: timestamp }])
      .mockResolvedValueOnce([{ id: 11 }])
      .mockResolvedValueOnce([{ numero: '0000000011' }])
      .mockResolvedValueOnce([{ id: 12 }]);

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 52,
      codigo: 'TRANSFERENCIA_A_CONSORCIO',
      nombre: 'Transferencia a consorcio',
      clasificacion: 'PRESTAMO',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'CLIENTE_DESTINO',
      usoBeneficiario: 'REQUERIDO',
    });

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'TRANSFERENCIA_A_CONSORCIO',
        beneficiarioClienteDestinoId: 4,
      }, key, actor),
    ).resolves.toMatchObject({
      documentoId: 10,
      ordenPagoId: 11,
      grupoFacturaId: 12,
      idempotente: false,
    });

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain(4);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 12,
        conceptoId: 52,
        periodoAnio: 2026,
        periodoMes: 8,
        tipoBeneficiarioAplicado: 'CLIENTE_DESTINO',
        usoBeneficiarioAplicado: 'REQUERIDO',
      }),
      tx,
    );
  });

  it('bloquea RENDICION cuando hay 0 usuarios configurados', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 60,
      codigo: 'RENDICION',
      nombre: 'Rendición',
      clasificacion: 'RENDICION',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'USUARIO',
      usoBeneficiario: 'REQUERIDO',
    });

    configRendicion.listarActivos.mockResolvedValueOnce([]);

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'RENDICION',
      }, key, actor),
    ).rejects.toThrow('RENDICION_SIN_USUARIO_CONFIGURADO');

    expect(configRendicion.listarActivos)
      .toHaveBeenCalledWith(7, tx);
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('autoselecciona el único usuario configurado para RENDICION', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 61,
      codigo: 'RENDICION',
      nombre: 'Rendición',
      clasificacion: 'RENDICION',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'USUARIO',
      usoBeneficiario: 'REQUERIDO',
    });

    configRendicion.listarActivos.mockResolvedValueOnce([
      { usuarioId: 5 },
    ]);

    await service.crear({
      ...body,
      conceptoCodigo: 'RENDICION',
    }, key, actor);

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain(5);

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptoId: 61,
        tipoBeneficiarioAplicado: 'USUARIO',
        usoBeneficiarioAplicado: 'REQUERIDO',
      }),
      tx,
    );
  });

  it('exige selección cuando RENDICION tiene N usuarios configurados', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 62,
      codigo: 'RENDICION',
      nombre: 'Rendición',
      clasificacion: 'RENDICION',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'USUARIO',
      usoBeneficiario: 'REQUERIDO',
    });

    configRendicion.listarActivos.mockResolvedValueOnce([
      { usuarioId: 4 },
      { usuarioId: 5 },
    ]);

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'RENDICION',
      }, key, actor),
    ).rejects.toThrow(
      'BENEFICIARIO_USUARIO_SELECCION_REQUERIDA'
    );

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('acepta usuario explícito habilitado entre N para RENDICION', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 63,
      codigo: 'RENDICION',
      nombre: 'Rendición',
      clasificacion: 'RENDICION',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'USUARIO',
      usoBeneficiario: 'REQUERIDO',
    });

    configRendicion.listarActivos.mockResolvedValueOnce([
      { usuarioId: 4 },
      { usuarioId: 5 },
    ]);

    await service.crear({
      ...body,
      conceptoCodigo: 'RENDICION',
      beneficiarioUsuarioId: 5,
    }, key, actor);

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain(5);
  });

  it('rechaza usuario explícito no habilitado para RENDICION', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 64,
      codigo: 'RENDICION',
      nombre: 'Rendición',
      clasificacion: 'RENDICION',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'USUARIO',
      usoBeneficiario: 'REQUERIDO',
    });

    configRendicion.listarActivos.mockResolvedValueOnce([
      { usuarioId: 4 },
      { usuarioId: 5 },
    ]);

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'RENDICION',
        beneficiarioUsuarioId: 99,
      }, key, actor),
    ).rejects.toThrow('BENEFICIARIO_USUARIO_NO_HABILITADO');

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('persiste NOMBRE_LIBRE para RECIBO_HONORARIOS sin maestro de persona', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 65,
      codigo: 'RECIBO_HONORARIOS',
      nombre: 'Recibo por honorarios',
      clasificacion: 'HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['RECIBO_HONORARIO']);

    await service.crear({
      ...body,
      conceptoCodigo: 'RECIBO_HONORARIOS',
      beneficiarioNombreLibre: 'JUAN PEREZ LOPEZ',
    }, key, actor);

    const dopInsert = tx.mock.calls.find(call =>
      String(call[0]?.[0] ?? '').includes(
        'INSERT INTO documentos.documentos_operativos_principales'
      )
    );

    expect(dopInsert).toBeDefined();
    expect(dopInsert!.slice(1)).toContain('JUAN PEREZ LOPEZ');

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
    expect(configRendicion.listarActivos).not.toHaveBeenCalled();

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptoId: 65,
        tipoBeneficiarioAplicado: 'NOMBRE_LIBRE',
        usoBeneficiarioAplicado: 'REQUERIDO',
      }),
      tx,
    );
  });

  it('rechaza RECIBO_HONORARIOS sin NOMBRE_LIBRE cuando es requerido', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 66,
      codigo: 'RECIBO_HONORARIOS',
      nombre: 'Recibo por honorarios',
      clasificacion: 'HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
    });

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'RECIBO_HONORARIOS',
      }, key, actor),
    ).rejects.toThrow('BENEFICIARIO_NOMBRE_LIBRE_REQUERIDO');

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
  });

  it('propaga fallo de snapshot antes de auditoría usando el mismo tx', async () => {
    created();
    obligacionesSnapshot.crear.mockRejectedValueOnce(new Error('snapshot failure'));

    await expect(service.crear(body, key, actor))
      .rejects.toThrow('snapshot failure');

    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith({
      grupoFacturaId: 12,
      conceptoId: 6,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
      periodoAnio: 2026,
      periodoMes: 8,
      codigoPago: null,
      tipoBeneficiarioAplicado: 'NO_APLICA',
      usoBeneficiarioAplicado: 'NO_APLICA',
    }, tx);

    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });

  it('reutiliza executor externo sin abrir sql.begin anidado', async () => {
    created();

    const resultado = await service.crear(body, key, actor, tx as any);

    expect(resultado).toEqual({
      documentoId: 10,
      ordenPagoId: 11,
      grupoFacturaId: 12,
      contenedorOperativoId: 7,
      idempotente: false,
    });
    expect(sql.begin).not.toHaveBeenCalled();
    expect(catalogoConceptos.buscarPorCodigo).toHaveBeenCalledWith('AGUA', tx);
    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.objectContaining({ grupoFacturaId: 12, conceptoId: 6 }),
      tx,
    );
    expect(audit.registrarCreacion).toHaveBeenCalledWith(
      expect.any(Object),
      tx,
    );
  });
  it('misma clave con concepto distinto produce conflicto', async () => {
    created();
    await service.crear(body, key, actor);

    const hashOriginal = tx.mock.calls[5].at(-1);

    tx.mockReset();
    audit.registrarCreacion.mockClear();
    catalogoConceptos.buscarPorCodigo.mockClear();
    obligacionesSnapshot.crear.mockClear();

    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        ordenPagoId: 11,
        documentoId: 10,
        contenedorOperativoId: 7,
        grupoFacturaId: 12,
        op_payload_hash: hashOriginal,
        estado: 'activo',
      }]);

    await expect(
      service.crear(
        { ...body, conceptoCodigo: 'INTERNET' },
        key,
        actor,
      ),
    ).rejects.toThrow('OP_IDEMPOTENCY_CONFLICT');

    expect(catalogoConceptos.buscarPorCodigo).not.toHaveBeenCalled();
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });

  it('normaliza whitespace de conceptoCodigo para replay idempotente', async () => {
    created();
    await service.crear(
      { ...body, conceptoCodigo: ' AGUA ' },
      key,
      actor,
    );

    const hashNormalizado = tx.mock.calls[5].at(-1);

    tx.mockReset();
    audit.registrarCreacion.mockClear();
    catalogoConceptos.buscarPorCodigo.mockClear();
    obligacionesSnapshot.crear.mockClear();

    tx.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        ordenPagoId: 11,
        documentoId: 10,
        contenedorOperativoId: 7,
        grupoFacturaId: 12,
        op_payload_hash: hashNormalizado,
        estado: 'activo',
      }]);

    const resultado = await service.crear(
      { ...body, conceptoCodigo: 'AGUA' },
      key,
      actor,
    );

    expect(resultado).toMatchObject({
      idempotente: true,
      ordenPagoId: 11,
      documentoId: 10,
      grupoFacturaId: 12,
    });

    expect(catalogoConceptos.buscarPorCodigo).not.toHaveBeenCalled();
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });
  it('propaga fallo de congelamiento antes de auditoría usando el mismo tx', async () => {
    created();

    catalogoConceptos.buscarPorCodigo.mockResolvedValueOnce({
      id: 9001,
      codigo: 'RECIBO_HONORARIOS',
      activo: true,
      requiereRegularizacion: true,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'NO_APLICA',
    });

    regularizadoresObligacion.listarConfiguradosActivosPorConcepto
      .mockResolvedValueOnce(['RECIBO_HONORARIO']);

    regularizadoresObligacion.congelarParaObligacion
      .mockRejectedValueOnce(new Error('regularizer freeze failure'));

    await expect(
      service.crear({
        ...body,
        conceptoCodigo: 'RECIBO_HONORARIOS',
        beneficiarioNombreLibre: 'MARIA PEREZ QUISPE',
      }, key, actor),
    ).rejects.toThrow('regularizer freeze failure');

    expect(regularizadoresObligacion.congelarParaObligacion)
      .toHaveBeenCalledTimes(1);

    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });

  it('propaga fallo de auditoría al límite transaccional', async () => {
    created(); audit.registrarCreacion.mockRejectedValueOnce(new Error('audit failure'));
    await expect(service.crear(body, key, actor)).rejects.toThrow('audit failure');
  });
  it('rechaza contexto ajeno antes de insertar', async () => {
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.crear(body, key, actor)).rejects.toThrow('Contexto OP');
    expect(tx).toHaveBeenCalledTimes(3);
  });
  it.each([
    { ...body, actor: 9 },
    { ...body, archivo: 'x' },
    { ...body, monto: '0' },
    { ...body, fechaEmision: '2026-02-30' },
    { ...body, tipo: 'FACTURA' },
    { ...body, subtipo: 'AGUA' },
    { ...body, conceptoCodigo: '' },
    { ...body, conceptoCodigo: '   ' },
  ])('rechaza input inválido %#', input => {
    expect(() => validarOrdenPago(input, key)).toThrow();
  });
  it('acepta OP sin período', () => {
    const { periodoAnio, periodoMes, ...sinPeriodo } = body;
    const resultado = validarOrdenPago(sinPeriodo, key);

    expect(resultado.periodoAnio).toBeNull();
    expect(resultado.periodoMes).toBeNull();
  });

  it('mantiene período informado independiente de fechaEmision', () => {
    const resultado = validarOrdenPago({
      ...body,
      fechaEmision: '2026-01-10',
      periodoAnio: 2026,
      periodoMes: 8,
    }, key);

    expect(resultado.fechaEmision).toBe('2026-01-10');
    expect(resultado.periodoAnio).toBe(2026);
    expect(resultado.periodoMes).toBe(8);
  });

  it.each([
    { periodoAnio: 2026, periodoMes: undefined },
    { periodoAnio: undefined, periodoMes: 8 },
    { periodoAnio: 1899, periodoMes: 8 },
    { periodoAnio: 10000, periodoMes: 8 },
    { periodoAnio: 2026, periodoMes: 0 },
    { periodoAnio: 2026, periodoMes: 13 },
  ])('rechaza período parcial o inválido %#', cambio => {
    const input = {
      ...body,
      ...cambio,
    };
    expect(() => validarOrdenPago(input, key)).toThrow();
  });

  it('normaliza espacios de conceptoCodigo en el DTO', () => {
    expect(validarOrdenPago(
      { ...body, conceptoCodigo: ' AGUA ' },
      key,
    ).conceptoCodigo).toBe('AGUA');
  });

  describe('confirmarPago - adaptador OP a capacidad común', () => {
    const confirmarOcrResultadoConExpediente = jest.fn();

    const crearServiceConfirmacion = () =>
      new OrdenPagoService(
        { registrarCreacion: jest.fn() } as any,
        {
          buscarPorCodigo: jest.fn(),
          listarRepresentablesParaOrdenPago: jest.fn(),
        } as any,
        {
          crear: jest.fn(),
          existePorGrupoFacturaId: jest.fn(),
        } as any,
        {
          listarConfiguradosActivosPorConcepto: jest.fn(),
          congelarParaObligacion: jest.fn(),
          listarCongeladosPorGrupoFacturaId: jest.fn(),
          permiteTipoDocumental: jest.fn(),
        } as any,
        { listarActivos: jest.fn(), estaHabilitado: jest.fn() } as any,
        { listarActivos: jest.fn(), estaHabilitado: jest.fn() } as any,
        { confirmarOcrResultadoConExpediente } as any,
      );

    beforeEach(() => {
      confirmarOcrResultadoConExpediente.mockReset();
    });

    it('resuelve contexto canónico por ordenPagoId + actor y delega a la capacidad común', async () => {
      const serviceConfirmacion = crearServiceConfirmacion();

      jest.spyOn(serviceConfirmacion, 'obtenerDetalle').mockResolvedValue({
        ordenPagoId: 153,
        documentoId: 443,
        grupoFacturaId: 116,
        expedienteId: 118,
      } as any);

      confirmarOcrResultadoConExpediente.mockResolvedValue({
        documentoId: 900,
        archivoId: 901,
      });

      const input = {
        ocrResultadoId: 94,
        metadata: { banco: 'BCP' },
        observacion: 'Pago OP',
        decisionCorrespondencia: {
          accion: 'ACEPTAR' as const,
          motivo: 'Validado',
        },
      };

      const resultado = await serviceConfirmacion.confirmarPago(
        153,
        input,
        actor,
      );

      expect(serviceConfirmacion.obtenerDetalle).toHaveBeenCalledWith(
        153,
        actor,
      );

      expect(confirmarOcrResultadoConExpediente).toHaveBeenCalledTimes(1);
      expect(confirmarOcrResultadoConExpediente).toHaveBeenCalledWith(
        94,
        {
          expedienteId: 118,
          documentoBaseId: 443,
          grupoFacturaId: 116,
          origenObligacion: 'ORDEN_PAGO',
          metadata: { banco: 'BCP' },
          observacion: 'Pago OP',
          decisionCorrespondencia: {
            accion: 'ACEPTAR',
            motivo: 'Validado',
          },
        },
        {
          usuarioId: actor.id,
          requestId: actor.requestId,
          correlationId: actor.correlationId,
        },
      );

      expect(resultado).toEqual({
        documentoId: 900,
        archivoId: 901,
      });
    });

    it('si la OP no resuelve para el actor no alcanza la capacidad común', async () => {
      const serviceConfirmacion = crearServiceConfirmacion();

      jest.spyOn(serviceConfirmacion, 'obtenerDetalle').mockRejectedValue(
        new Error('OP_NO_DISPONIBLE_EN_CONTEXTO'),
      );

      await expect(
        serviceConfirmacion.confirmarPago(
          999999,
          { ocrResultadoId: 94 },
          actor,
        ),
      ).rejects.toThrow('OP_NO_DISPONIBLE_EN_CONTEXTO');

      expect(serviceConfirmacion.obtenerDetalle).toHaveBeenCalledWith(
        999999,
        actor,
      );
      expect(confirmarOcrResultadoConExpediente).not.toHaveBeenCalled();
    });
  });


  it('AUTOCOMPLETE acepta proveedor existente en core.proveedores sin configuración por concepto', async () => {
    const serviceAny = service as any;

    const tx = Object.assign(
      async () => [{ id: 849 }],
      {
        unsafe: jest.fn(),
      },
    );

    const resultado = await serviceAny.resolverBeneficiarioConcepto(
      {
        id: 9001,
        tipoBeneficiario: 'PROVEEDOR',
        usoBeneficiario: 'REQUERIDO',
        modoSeleccionBeneficiario: 'AUTOCOMPLETE',
      },
      {
        contenedorOperativoId: 1,
        proveedorId: 849,
        beneficiarioClienteDestinoId: null,
        beneficiarioUsuarioId: null,
        beneficiarioNombreLibre: null,
      },
      2,
      tx,
    );

    expect(resultado).toEqual({
      proveedorId: 849,
      beneficiarioClienteDestinoId: null,
      beneficiarioUsuarioId: null,
      beneficiarioNombreLibre: null,
    });

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
  });

  it('AUTOCOMPLETE rechaza proveedorId inexistente en core.proveedores', async () => {
    const serviceAny = service as any;

    const tx = Object.assign(
      async () => [],
      {
        unsafe: jest.fn(),
      },
    );

    await expect(
      serviceAny.resolverBeneficiarioConcepto(
        {
          id: 9001,
          tipoBeneficiario: 'PROVEEDOR',
          usoBeneficiario: 'REQUERIDO',
          modoSeleccionBeneficiario: 'AUTOCOMPLETE',
        },
        {
          contenedorOperativoId: 1,
          proveedorId: 999999999,
          beneficiarioClienteDestinoId: null,
          beneficiarioUsuarioId: null,
          beneficiarioNombreLibre: null,
        },
        2,
        tx,
      ),
    ).rejects.toThrow('PROVEEDOR_NO_EXISTE_EN_CATALOGO');

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
  });

  it('AUTOCOMPLETE requerido exige selección explícita', async () => {
    const serviceAny = service as any;

    const tx = Object.assign(
      async () => {
        throw new Error('SQL_NO_DEBE_EJECUTARSE');
      },
      {
        unsafe: jest.fn(),
      },
    );

    await expect(
      serviceAny.resolverBeneficiarioConcepto(
        {
          id: 9001,
          tipoBeneficiario: 'PROVEEDOR',
          usoBeneficiario: 'REQUERIDO',
          modoSeleccionBeneficiario: 'AUTOCOMPLETE',
        },
        {
          contenedorOperativoId: 1,
          proveedorId: null,
          beneficiarioClienteDestinoId: null,
          beneficiarioUsuarioId: null,
          beneficiarioNombreLibre: null,
        },
        2,
        tx,
      ),
    ).rejects.toThrow('BENEFICIARIO_PROVEEDOR_SELECCION_REQUERIDA');

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
  });

  it('AUTOCOMPLETE opcional permite omitir proveedor sin consultar configuración', async () => {
    const serviceAny = service as any;

    const tx = Object.assign(
      async () => {
        throw new Error('SQL_NO_DEBE_EJECUTARSE');
      },
      {
        unsafe: jest.fn(),
      },
    );

    const resultado = await serviceAny.resolverBeneficiarioConcepto(
      {
        id: 9001,
        tipoBeneficiario: 'PROVEEDOR',
        usoBeneficiario: 'OPCIONAL',
        modoSeleccionBeneficiario: 'AUTOCOMPLETE',
      },
      {
        contenedorOperativoId: 1,
        proveedorId: null,
        beneficiarioClienteDestinoId: null,
        beneficiarioUsuarioId: null,
        beneficiarioNombreLibre: null,
      },
      2,
      tx,
    );

    expect(resultado).toEqual({
      proveedorId: null,
      beneficiarioClienteDestinoId: null,
      beneficiarioUsuarioId: null,
      beneficiarioNombreLibre: null,
    });

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
  });

});
