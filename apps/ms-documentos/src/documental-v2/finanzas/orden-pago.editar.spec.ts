jest.mock('@documental/database', () => ({
  sql: { begin: jest.fn() },
}));

import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';

describe('R23 editar Orden de Pago', () => {
  const tx = jest.fn();

  const auditoria = {
    registrarEdicion: jest.fn(),
  };

  const catalogoConceptos = {
    buscarPorCodigo: jest.fn(),
    listarRepresentablesParaOrdenPago: jest.fn(),
  };

  const obligacionesSnapshot = {
    crear: jest.fn(),
    existePorGrupoFacturaId: jest.fn(),
    actualizarTemprano: jest.fn(),
  };

  const regularizadoresObligacion = {
    listarConfiguradosActivosPorConcepto: jest.fn(),
    congelarParaObligacion: jest.fn(),
    listarCongeladosPorGrupoFacturaId: jest.fn(),
    permiteTipoDocumental: jest.fn(),
    reemplazarCongeladosTemprano: jest.fn(),
  };

  const configProveedores = {
    listarActivos: jest.fn(),
    estaHabilitado: jest.fn(),
  };

  const configRendicion = {
    listarActivos: jest.fn(),
    estaHabilitado: jest.fn(),
  };

  const confirmacionDocumental = {
    confirmarOcrResultadoConExpediente: jest.fn(),
  };

  const service = new OrdenPagoService(
    auditoria as any,
    catalogoConceptos as any,
    obligacionesSnapshot as any,
    regularizadoresObligacion as any,
    configProveedores as any,
    configRendicion as any,
    confirmacionDocumental as any,
  );

  const actor = {
    id: 5,
    workspaceId: 2,
    empresaCodigo: 'LAB',
    clienteDestinoId: 3,
    requestId: 'r23-request',
    correlationId: 'r23-correlation',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.mockReset();

    (sql.begin as jest.Mock).mockImplementation(fn => fn(tx));

    auditoria.registrarEdicion.mockResolvedValue(undefined);
    obligacionesSnapshot.actualizarTemprano.mockResolvedValue(true);
    regularizadoresObligacion.reemplazarCongeladosTemprano.mockResolvedValue(undefined);
    regularizadoresObligacion.listarConfiguradosActivosPorConcepto.mockResolvedValue([]);
  });

  const actualBase = {
    ordenPagoId: 11,
    documentoId: 10,
    contenedorOperativoId: 7,
    proveedorId: null,
    beneficiarioClienteDestinoId: null,
    beneficiarioUsuarioId: null,
    beneficiarioNombreLibre: null,
    grupoFacturaId: 12,
    origenObligacion: 'ORDEN_PAGO',
    facturaDocumentoId: null,
    empresaCodigo: 'LAB',
    clienteDestinoId: 3,
    fechaEmision: '2026-08-15',
    monto: '125.50',
    moneda: 'PEN',
    observacion: null,
    conceptoId: 6,
    conceptoCodigo: 'AGUA',
    requiereRegularizacionAplicada: false,
    estadoRegularizacion: 'NO_REQUIERE',
    periodoAnio: 2026,
    periodoMes: 8,
    codigoPago: null,
    tipoBeneficiarioAplicado: 'NO_APLICA',
    usoBeneficiarioAplicado: 'NO_APLICA',
  };

  function sqlTexto(parts: any): string {
    return Array.from(parts ?? []).join('?');
  }

  function prepararTx(options?: {
    actual?: Record<string, unknown> | null;
    asociacionesActivas?: Array<Record<string, unknown>>;
    monedaExiste?: boolean;
  }) {
    const actual =
      options && Object.prototype.hasOwnProperty.call(options, 'actual')
        ? options.actual
        : actualBase;

    const asociacionesActivas = options?.asociacionesActivas ?? [];
    const monedaExiste = options?.monedaExiste ?? true;

    tx.mockImplementation(async (parts: any) => {
      const q = sqlTexto(parts);

      if (
        q.includes('FROM documentos.documentos_operativos_principales p') &&
        q.includes('JOIN documentos.obligaciones_snapshot os')
      ) {
        return actual ? [actual] : [];
      }

      if (q.includes('FROM documentos.grupo_factura_documentos')) {
        return asociacionesActivas;
      }

      if (q.includes('FROM core.monedas')) {
        return monedaExiste ? [{ codigo: 'USD' }] : [];
      }

      if (
        q.includes('UPDATE documentos.documentos') ||
        q.includes('UPDATE documentos.documentos_operativos_principales')
      ) {
        return [];
      }

      throw new Error(`SQL R23 no mockeado: ${q}`);
    });
  }

  it('1. basic edit actualiza datos básicos, audita y no modifica snapshot', async () => {
    prepararTx();

    await expect(
      service.editar(
        11,
        {
          fechaEmision: '2026-09-01',
          monto: '200.25',
          moneda: 'USD',
          observacion: 'Ajuste R23',
        },
        actor,
      ),
    ).resolves.toMatchObject({
      ordenPagoId: 11,
      documentoId: 10,
      grupoFacturaId: 12,
      contenedorOperativoId: 7,
    });

    expect(obligacionesSnapshot.actualizarTemprano).not.toHaveBeenCalled();
    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).not.toHaveBeenCalled();
    expect(catalogoConceptos.buscarPorCodigo).not.toHaveBeenCalled();

    expect(auditoria.registrarEdicion).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'EDITAR_OP',
        entidadId: 11,
        empresaCodigo: 'LAB',
        antes: expect.objectContaining({
          documentoId: 10,
          grupoFacturaId: 12,
          monto: '125.50',
          moneda: 'PEN',
        }),
        despues: expect.objectContaining({
          documentoId: 10,
          grupoFacturaId: 12,
          monto: '200.25',
          moneda: 'USD',
          observacion: 'Ajuste R23',
        }),
      }),
      tx,
    );

    const queries = tx.mock.calls
      .map(([parts]) => sqlTexto(parts))
      .join('\n');

    expect(queries).toContain('FROM core.monedas');
    expect(queries).toContain('UPDATE documentos.documentos');
    expect(queries).not.toContain(
      'UPDATE documentos.documentos_operativos_principales',
    );
  });

  it('2. rechaza campo fuera del contrato antes de abrir transacción', async () => {
    await expect(
      service.editar(
        11,
        { monto: '200.00', grupoFacturaId: 999 },
        actor,
      ),
    ).rejects.toThrow('Campo no autorizado en edición OP');

    expect(sql.begin).not.toHaveBeenCalled();
    expect(tx).not.toHaveBeenCalled();
    expect(auditoria.registrarEdicion).not.toHaveBeenCalled();
  });

  it('3. tenant ajeno no resuelve la OP ni ejecuta mutaciones', async () => {
    prepararTx({ actual: null });

    await expect(
      service.editar(11, { observacion: 'No permitido' }, actor),
    ).rejects.toThrow('Orden de Pago no disponible');

    expect(auditoria.registrarEdicion).not.toHaveBeenCalled();
    expect(obligacionesSnapshot.actualizarTemprano).not.toHaveBeenCalled();

    const queries = tx.mock.calls
      .map(([parts]) => sqlTexto(parts))
      .join('\n');

    expect(queries).toContain('c.empresa_codigo =');
    expect(queries).toContain(
      'c.cliente_destino_id IS NOT DISTINCT FROM',
    );
    expect(queries).not.toContain('UPDATE documentos.documentos');
  });

  it('4. permite edición temprana sin asociaciones activas posteriores', async () => {
    prepararTx();

    await expect(
      service.editar(
        11,
        { periodoAnio: 2026, periodoMes: 9 },
        actor,
      ),
    ).resolves.toMatchObject({
      ordenPagoId: 11,
      grupoFacturaId: 12,
    });

    expect(obligacionesSnapshot.actualizarTemprano).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 12,
        conceptoId: 6,
        periodoAnio: 2026,
        periodoMes: 9,
        estadoRegularizacion: 'NO_REQUIERE',
      }),
      tx,
    );

    // Período mantiene el mecanismo calendario año/mes y no
    // reinterpreta concepto ni beneficiario.
    expect(catalogoConceptos.buscarPorCodigo).not.toHaveBeenCalled();
    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
    expect(configRendicion.listarActivos).not.toHaveBeenCalled();
    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).not.toHaveBeenCalled();
  });

  it('5. asociación activa posterior bloquea edición temprana', async () => {
    prepararTx({
      asociacionesActivas: [
        { id: 90, tipo_relacion: 'adjunto_transferencia' },
      ],
    });

    await expect(
      service.editar(
        11,
        { periodoAnio: 2026, periodoMes: 9 },
        actor,
      ),
    ).rejects.toThrow('OP_FUERA_DE_VENTANA_EDICION_TEMPRANA');

    expect(obligacionesSnapshot.actualizarTemprano).not.toHaveBeenCalled();
    expect(auditoria.registrarEdicion).not.toHaveBeenCalled();
  });

  it('6. guard consulta sólo asociaciones activas; histórico anulado no bloquea', async () => {
    /*
     * prepararTx devuelve [] porque la consulta productiva debe excluir
     * estado='anulado'. Además verificamos expresamente el predicado SQL.
     */
    prepararTx({ asociacionesActivas: [] });

    await expect(
      service.editar(
        11,
        { periodoAnio: 2026, periodoMes: 10 },
        actor,
      ),
    ).resolves.toMatchObject({ ordenPagoId: 11 });

    const associationCall = tx.mock.calls.find(([parts]) =>
      sqlTexto(parts).includes(
        'FROM documentos.grupo_factura_documentos',
      ),
    );

    expect(associationCall).toBeDefined();

    const q = sqlTexto(associationCall![0]);
    expect(q).toContain("estado = 'activo'");
    expect(q).toContain("'adjunto_guia'");
    expect(q).toContain("'adjunto_nota_ingreso'");
    expect(q).toContain("'adjunto_transferencia'");
    expect(q).toContain("'adjunto_detraccion'");
    expect(q).toContain("'regularizador_factura'");
  });

  it('7. OP REGULARIZADA bloquea toda edición temprana', async () => {
    prepararTx({
      actual: {
        ...actualBase,
        requiereRegularizacionAplicada: true,
        estadoRegularizacion: 'REGULARIZADO',
      },
    });

    await expect(
      service.editar(
        11,
        { periodoAnio: 2026, periodoMes: 9 },
        actor,
      ),
    ).rejects.toThrow(
      'OP_REGULARIZADA_NO_PERMITE_EDICION_TEMPRANA',
    );

    const queries = tx.mock.calls
      .map(([parts]) => sqlTexto(parts))
      .join('\n');

    expect(queries).not.toContain(
      'FROM documentos.grupo_factura_documentos',
    );
    expect(obligacionesSnapshot.actualizarTemprano).not.toHaveBeenCalled();
    expect(auditoria.registrarEdicion).not.toHaveBeenCalled();
  });

  it('8. cambio de concepto reconstruye snapshot coherente', async () => {
    prepararTx();

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 20,
      codigo: 'ALQUILER',
      nombre: 'Alquiler',
      clasificacion: 'SERVICIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: true,
      usoCodigoPago: 'OPCIONAL',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      modoSeleccionBeneficiario: 'NO_APLICA',
    });

    regularizadoresObligacion
      .listarConfiguradosActivosPorConcepto
      .mockResolvedValue(['FACTURA']);

    await service.editar(
      11,
      { conceptoCodigo: 'ALQUILER' },
      actor,
    );

    expect(catalogoConceptos.buscarPorCodigo)
      .toHaveBeenCalledWith('ALQUILER', tx);

    expect(obligacionesSnapshot.actualizarTemprano)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          grupoFacturaId: 12,
          conceptoId: 20,
          requiereRegularizacionAplicada: true,
          estadoRegularizacion: 'PENDIENTE',
          periodoAnio: 2026,
          periodoMes: 8,
          codigoPago: null,
          tipoBeneficiarioAplicado: 'NO_APLICA',
          usoBeneficiarioAplicado: 'NO_APLICA',
        }),
        tx,
      );
  });

  it('9. cambio de concepto limpia beneficiario anterior incompatible', async () => {
    prepararTx({
      actual: {
        ...actualBase,
        proveedorId: 77,
        tipoBeneficiarioAplicado: 'PROVEEDOR',
        usoBeneficiarioAplicado: 'REQUERIDO',
      },
    });

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 21,
      codigo: 'SIN_BENEFICIARIO',
      nombre: 'Sin beneficiario',
      clasificacion: 'OTROS',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      modoSeleccionBeneficiario: 'NO_APLICA',
    });

    await service.editar(
      11,
      { conceptoCodigo: 'SIN_BENEFICIARIO' },
      actor,
    );

    const principalUpdate = tx.mock.calls.find(([parts]) =>
      sqlTexto(parts).includes(
        'UPDATE documentos.documentos_operativos_principales',
      ),
    );

    expect(principalUpdate).toBeDefined();

    const params = principalUpdate!.slice(1);
    expect(params.slice(0, 4)).toEqual([
      null,
      null,
      null,
      null,
    ]);

    expect(obligacionesSnapshot.actualizarTemprano)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          conceptoId: 21,
          requiereRegularizacionAplicada: false,
          estadoRegularizacion: 'NO_REQUIERE',
          tipoBeneficiarioAplicado: 'NO_APLICA',
          usoBeneficiarioAplicado: 'NO_APLICA',
        }),
        tx,
      );
  });

  it('10. concepto regularizable reemplaza congelados con configuración nueva', async () => {
    prepararTx();

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 22,
      codigo: 'SERVICIO_REG',
      nombre: 'Servicio regularizable',
      clasificacion: 'SERVICIOS',
      activo: true,
      requiereRegularizacion: true,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      modoSeleccionBeneficiario: 'NO_APLICA',
    });

    regularizadoresObligacion
      .listarConfiguradosActivosPorConcepto
      .mockResolvedValue(['FACTURA', 'DETRACCION']);

    await service.editar(
      11,
      { conceptoCodigo: 'SERVICIO_REG' },
      actor,
    );

    expect(
      regularizadoresObligacion.listarConfiguradosActivosPorConcepto,
    ).toHaveBeenCalledWith(22, tx);

    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).toHaveBeenCalledWith(
      12,
      ['FACTURA', 'DETRACCION'],
      tx,
    );
  });

  it('11. concepto no regularizable elimina congelados incompatibles', async () => {
    prepararTx({
      actual: {
        ...actualBase,
        conceptoId: 30,
        conceptoCodigo: 'ANTERIOR_REG',
        requiereRegularizacionAplicada: true,
        estadoRegularizacion: 'PENDIENTE',
      },
    });

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 31,
      codigo: 'NUEVO_SIMPLE',
      nombre: 'Nuevo simple',
      clasificacion: 'OTROS',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NO_APLICA',
      usoBeneficiario: 'NO_APLICA',
      modoSeleccionBeneficiario: 'NO_APLICA',
    });

    await service.editar(
      11,
      { conceptoCodigo: 'NUEVO_SIMPLE' },
      actor,
    );

    expect(obligacionesSnapshot.actualizarTemprano)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          conceptoId: 31,
          requiereRegularizacionAplicada: false,
          estadoRegularizacion: 'NO_REQUIERE',
        }),
        tx,
      );

    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).toHaveBeenCalledWith(12, [], tx);
  });

  it('12. beneficiario explícito es selección atómica y no arrastra tipo anterior', async () => {
    prepararTx({
      actual: {
        ...actualBase,
        proveedorId: 77,
        tipoBeneficiarioAplicado: 'PROVEEDOR',
        usoBeneficiarioAplicado: 'OPCIONAL',
      },
    });

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 6,
      codigo: 'AGUA',
      nombre: 'Agua',
      clasificacion: 'SERVICIOS',
      activo: true,
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'NO_APLICA',
      tipoBeneficiario: 'NOMBRE_LIBRE',
      usoBeneficiario: 'OPCIONAL',
      modoSeleccionBeneficiario: 'AUTOCOMPLETE',
    });

    await service.editar(
      11,
      { beneficiarioNombreLibre: 'Caja chica' },
      actor,
    );

    const principalUpdate = tx.mock.calls.find(([parts]) =>
      sqlTexto(parts).includes(
        'UPDATE documentos.documentos_operativos_principales',
      ),
    );

    expect(principalUpdate).toBeDefined();

    const params = principalUpdate!.slice(1);
    expect(params.slice(0, 4)).toEqual([
      null,
      null,
      null,
      'Caja chica',
    ]);

    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).not.toHaveBeenCalled();
  });

  it('13. codigoPago valida concepto pero preserva semántica congelada', async () => {
    prepararTx({
      actual: {
        ...actualBase,
        requiereRegularizacionAplicada: true,
        estadoRegularizacion: 'PENDIENTE',
        tipoBeneficiarioAplicado: 'NO_APLICA',
        usoBeneficiarioAplicado: 'NO_APLICA',
      },
    });

    catalogoConceptos.buscarPorCodigo.mockResolvedValue({
      id: 6,
      codigo: 'AGUA',
      nombre: 'Agua',
      clasificacion: 'SERVICIOS',
      activo: true,
      // Deliberadamente distinto del snapshot histórico:
      requiereRegularizacion: false,
      requierePeriodo: false,
      usoCodigoPago: 'OPCIONAL',
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      modoSeleccionBeneficiario: 'AUTOCOMPLETE',
    });

    await service.editar(
      11,
      { codigoPago: 'REF-2026-09' },
      actor,
    );

    expect(catalogoConceptos.buscarPorCodigo)
      .toHaveBeenCalledWith('AGUA', tx);

    expect(configProveedores.listarActivos).not.toHaveBeenCalled();
    expect(configRendicion.listarActivos).not.toHaveBeenCalled();

    expect(obligacionesSnapshot.actualizarTemprano)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          conceptoId: 6,
          requiereRegularizacionAplicada: true,
          estadoRegularizacion: 'PENDIENTE',
          codigoPago: 'REF-2026-09',
          tipoBeneficiarioAplicado: 'NO_APLICA',
          usoBeneficiarioAplicado: 'NO_APLICA',
        }),
        tx,
      );

    expect(
      regularizadoresObligacion.reemplazarCongeladosTemprano,
    ).not.toHaveBeenCalled();
  });

  it('14. body no puede alterar IDs, tenant, origen ni grupo', async () => {
    const camposProhibidos = [
      ['ordenPagoId', 999],
      ['documentoId', 999],
      ['grupoFacturaId', 999],
      ['contenedorOperativoId', 999],
      ['origenObligacion', 'FACTURA'],
      ['facturaDocumentoId', 999],
      ['workspaceId', 999],
      ['empresaCodigo', 'OTRA'],
      ['clienteDestinoId', 999],
    ] as const;

    for (const [campo, valor] of camposProhibidos) {
      (sql.begin as jest.Mock).mockClear();

      await expect(
        service.editar(
          11,
          {
            observacion: 'intento',
            [campo]: valor,
          },
          actor,
        ),
      ).rejects.toThrow('Campo no autorizado en edición OP');

      expect(sql.begin).not.toHaveBeenCalled();
    }

    expect(auditoria.registrarEdicion).not.toHaveBeenCalled();
  });

});
