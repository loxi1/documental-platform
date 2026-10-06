
jest.mock('@documental/database', () => ({
  sql: { begin: jest.fn() },
}));

import { sql } from '@documental/database';
import { AsociarGrupoFacturaV2UseCase } from './asociar-grupo-factura-v2.usecase';

describe('AsociarGrupoFacturaV2UseCase', () => {
  const contenedores = {
    buscarPorId: jest.fn(),
  };

  const principales = {
    buscarPorId: jest.fn(),
  };

  const gruposFactura = {
    buscarPorFacturaDocumentoId: jest.fn(),
    buscarVigentePorFacturaDocumentoId: jest.fn(),
    listarHistoricosPorFacturaDocumentoId: jest.fn().mockResolvedValue([]),
    crear: jest.fn(),
    actualizar: jest.fn(),
  };

  const documentos = {
    buscarPorId: jest.fn(),
    listarFacturasCandidatas: jest.fn(),
  };

  const tx = {} as any;

  const obligacionesSnapshot = {
    crear: jest.fn(),
    existePorGrupoFacturaId: jest.fn(),
  };

  const auditoria = {
    registrarCreacion: jest.fn(),
  };

  const crearUseCase = () =>
    new AsociarGrupoFacturaV2UseCase(
      contenedores as any,
      principales as any,
      gruposFactura as any,
      documentos as any,
      auditoria as any,
      obligacionesSnapshot as any,
    );

  const principalActivo = {
    id: 3,
    contenedorOperativoId: 2,
    documentoId: 100,
    estado: 'activo',
    esPrincipalActivo: true,
    rucProveedor: '20123456789',
  };

  const contenedorActivo = {
    id: 2,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 10,
    estado: 'activo',
  };

  const facturaBase = {
    id: 200,
    tipoDocumental: 'FACTURA',
    clienteAbreviatura: 'BBTI',
    serie: 'F001',
    numero: '123',
    razonSocialEmisor: 'Proveedor',
    rucEmisor: '20123456789',
    fechaEmision: '2026-07-24',
    montoTotal: 100,
    moneda: 'PEN',
    nombreArchivo: 'factura.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sql.begin as jest.Mock).mockImplementation(async (callback: any) => callback(tx));
    obligacionesSnapshot.crear.mockResolvedValue(undefined);
    obligacionesSnapshot.existePorGrupoFacturaId.mockResolvedValue(true);

    principales.buscarPorId.mockResolvedValue(principalActivo);
    contenedores.buscarPorId.mockResolvedValue(contenedorActivo);
    gruposFactura.buscarVigentePorFacturaDocumentoId.mockResolvedValue(null);
    gruposFactura.crear.mockResolvedValue({
      id: 20,
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      estado: 'pendiente_revision',
      metadata: {},
    });
    gruposFactura.actualizar.mockResolvedValue({
      id: 20,
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      estado: 'pendiente_revision',
      metadata: {},
    });
    auditoria.registrarCreacion.mockResolvedValue(undefined);
  });

  const ejecutar = () =>
    crearUseCase().execute({
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      usuario: {
        id: 7,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 10,
      },
    });

  it.each(['OC', 'OS'])('permite crear Grupo de Factura para %s con Factura confirmada', async (tipoPrincipal) => {
    principales.buscarPorId.mockResolvedValue({ ...principalActivo, tipoPrincipal });
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'confirmado',
    });

    const result = await ejecutar();

    expect(result.idempotente).toBe(false);
    expect(result.workspaceDebeRefrescar).toBe(true);
    expect(gruposFactura.crear).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarCreacion).toHaveBeenCalledTimes(1);
  });

  it('rechaza Factura pendiente_ocr con FACTURA_NO_CONFIRMADA', async () => {
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'pendiente_ocr',
    });

    await expect(ejecutar()).rejects.toMatchObject({
      response: {
        code: 'FACTURA_NO_CONFIRMADA',
      },
    });

    expect(gruposFactura.crear).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });

  it('rechaza Factura observada con FACTURA_NO_CONFIRMADA', async () => {
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'observada',
    });

    await expect(ejecutar()).rejects.toMatchObject({
      response: {
        code: 'FACTURA_NO_CONFIRMADA',
      },
    });

    expect(gruposFactura.crear).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });

  it('rechaza Factura anulada con FACTURA_ANULADA', async () => {
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'anulado',
    });

    await expect(ejecutar()).rejects.toMatchObject({
      response: {
        code: 'FACTURA_ANULADA',
      },
    });

    expect(gruposFactura.crear).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });

  it('abre transacción propia cuando execute no recibe executor', async () => {
    principales.buscarPorId.mockResolvedValue({
      ...principalActivo,
      tipoPrincipal: 'OC',
    });
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'confirmado',
    });

    await ejecutar();

    expect(sql.begin).toHaveBeenCalledTimes(1);
    expect(gruposFactura.crear).toHaveBeenCalledWith(
      expect.any(Object),
      tx,
    );
  });

  it('reutiliza executor externo sin abrir transacción anidada', async () => {
    const executorExterno = {} as any;

    principales.buscarPorId.mockResolvedValue({
      ...principalActivo,
      tipoPrincipal: 'OC',
    });
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'confirmado',
    });

    await crearUseCase().execute(
      {
        documentoOperativoPrincipalId: 3,
        facturaDocumentoId: 200,
        usuario: {
          id: 7,
          empresaCodigo: 'BBTI',
          clienteDestinoId: 10,
        },
      },
      executorExterno,
    );

    expect(sql.begin).not.toHaveBeenCalled();
    expect(gruposFactura.crear).toHaveBeenCalledWith(
      expect.any(Object),
      executorExterno,
    );
    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      expect.any(Object),
      executorExterno,
    );
  });

  it('crea snapshot FACTURA exacto sin concepto, periodo ni codigo de pago', async () => {
    principales.buscarPorId.mockResolvedValue({
      ...principalActivo,
      tipoPrincipal: 'OS',
    });
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'confirmado',
    });

    await ejecutar();

    expect(obligacionesSnapshot.crear).toHaveBeenCalledTimes(1);
    expect(obligacionesSnapshot.crear).toHaveBeenCalledWith(
      {
        grupoFacturaId: 20,
        conceptoId: null,
        requiereRegularizacionAplicada: true,
        estadoRegularizacion: 'REGULARIZADO',
        periodoAnio: null,
        periodoMes: null,
        codigoPago: null,
      },
      tx,
    );
  });

  it('propaga fallo de snapshot antes de metadata y auditoría', async () => {
    principales.buscarPorId.mockResolvedValue({
      ...principalActivo,
      tipoPrincipal: 'OC',
    });
    documentos.buscarPorId.mockResolvedValue({
      ...facturaBase,
      estado: 'confirmado',
    });
    obligacionesSnapshot.crear.mockRejectedValueOnce(
      new Error('SNAPSHOT_FAIL'),
    );

    await expect(ejecutar()).rejects.toThrow('SNAPSHOT_FAIL');

    expect(gruposFactura.actualizar).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });

  it('grupo vigente con snapshot existente es idempotente y no crea otro snapshot', async () => {
    gruposFactura.buscarVigentePorFacturaDocumentoId.mockResolvedValue({
      id: 20,
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      estado: 'pendiente_revision',
    });
    obligacionesSnapshot.existePorGrupoFacturaId.mockResolvedValue(true);

    const result = await ejecutar();

    expect(result.idempotente).toBe(true);
    expect(obligacionesSnapshot.existePorGrupoFacturaId).toHaveBeenCalledWith(
      20,
      tx,
    );
    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(gruposFactura.crear).not.toHaveBeenCalled();
  });

  it('grupo vigente sin snapshot falla como inconsistencia técnica y no repara', async () => {
    gruposFactura.buscarVigentePorFacturaDocumentoId.mockResolvedValue({
      id: 20,
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      estado: 'pendiente_revision',
    });
    obligacionesSnapshot.existePorGrupoFacturaId.mockResolvedValue(false);

    await expect(ejecutar()).rejects.toMatchObject({
      response: {
        code: 'OBLIGACION_SNAPSHOT_AUSENTE',
      },
    });

    expect(obligacionesSnapshot.crear).not.toHaveBeenCalled();
    expect(gruposFactura.crear).not.toHaveBeenCalled();
    expect(gruposFactura.actualizar).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });
});
