
jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

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
    );

  const principalActivo = {
    id: 3,
    contenedorOperativoId: 2,
    documentoId: 100,
    estado: 'activo',
    esPrincipalActivo: true,
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

  it('permite crear Grupo de Factura cuando la Factura está confirmada', async () => {
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
});
