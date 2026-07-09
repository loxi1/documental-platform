jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { DocumentalV2Controller } from './documental-v2.controller';

describe('DocumentalV2Controller', () => {
  const contenedores = {
    crear: jest.fn(),
    listar: jest.fn(),
    buscarPorClave: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  };

  const documentosOperativos = {
    crear: jest.fn(),
    listarPorContenedor: jest.fn(),
    buscarPorDocumentoId: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  };

  const gruposFactura = {
    crear: jest.fn(),
    listarPorDocumentoOperativoPrincipal: jest.fn(),
    buscarPorFacturaDocumentoId: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  };

  const grupoFacturaDocumentos = {
    crear: jest.fn(),
    listarPorGrupoFactura: jest.fn(),
    buscarActivoPorDocumentoId: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  };

  let controller: DocumentalV2Controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentalV2Controller(
      contenedores as any,
      documentosOperativos as any,
      gruposFactura as any,
      grupoFacturaDocumentos as any,
    );
  });

  it('crea un contenedor operativo usando el service V2', async () => {
    const esperado = { id: 1, codigo: '050201' };
    contenedores.crear.mockResolvedValue(esperado);

    await expect(
      controller.crearContenedor({
        empresaCodigo: 'BBTI',
        tipoContexto: 'centro_costo_op',
        codigo: '050201',
      }),
    ).resolves.toBe(esperado);

    expect(contenedores.crear).toHaveBeenCalledWith({
      empresaCodigo: 'BBTI',
      tipoContexto: 'centro_costo_op',
      codigo: '050201',
    });
  });

  it('lista contenedores normalizando query numérica', () => {
    contenedores.listar.mockReturnValue({ items: [], total: 0, limit: 10, offset: 0 });

    controller.listarContenedores('BBTI', '2', 'centro_costo_op', 'activo', '050201', '10', '0');

    expect(contenedores.listar).toHaveBeenCalledWith({
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'centro_costo_op',
      estado: 'activo',
      q: '050201',
      limit: 10,
      offset: 0,
    });
  });

  it('crea un documento operativo principal usando el service V2', async () => {
    const esperado = { id: 10, documentoId: 99 };
    documentosOperativos.crear.mockResolvedValue(esperado);

    await expect(
      controller.crearDocumentoOperativoPrincipal({
        contenedorOperativoId: 1,
        documentoId: 99,
        tipoPrincipal: 'OC',
      }),
    ).resolves.toBe(esperado);

    expect(documentosOperativos.crear).toHaveBeenCalledWith({
      contenedorOperativoId: 1,
      documentoId: 99,
      tipoPrincipal: 'OC',
    });
  });

  it('crea un grupo de factura usando el service V2', async () => {
    const esperado = { id: 20, facturaDocumentoId: 200 };
    gruposFactura.crear.mockResolvedValue(esperado);

    await expect(
      controller.crearGrupoFactura({
        documentoOperativoPrincipalId: 10,
        facturaDocumentoId: 200,
      }),
    ).resolves.toBe(esperado);

    expect(gruposFactura.crear).toHaveBeenCalledWith({
      documentoOperativoPrincipalId: 10,
      facturaDocumentoId: 200,
    });
  });

  it('vincula un documento a un grupo de factura usando el service V2', async () => {
    const esperado = { id: 30, documentoId: 300 };
    grupoFacturaDocumentos.crear.mockResolvedValue(esperado);

    await expect(
      controller.crearGrupoFacturaDocumento({
        grupoFacturaId: 20,
        documentoId: 300,
        tipoRelacion: 'guia',
      }),
    ).resolves.toBe(esperado);

    expect(grupoFacturaDocumentos.crear).toHaveBeenCalledWith({
      grupoFacturaId: 20,
      documentoId: 300,
      tipoRelacion: 'guia',
    });
  });
});
