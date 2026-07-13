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

  const workspaceDocumentalV2 = {
    construirDesdeExpedienteV1: jest.fn(),
  };

  const asociarDocumentoPrincipalV2UseCase = {
    execute: jest.fn(),
  };

  const asociarGrupoFacturaV2UseCase = {
    execute: jest.fn(),
    listarFacturasCandidatas: jest.fn(),
  };

  const asociarDocumentoGrupoFacturaV2UseCase = {
    execute: jest.fn(),
    listarDocumentosCandidatos: jest.fn(),
  };

  const documentoExistenteReadonlyRepository = {
    listarCandidatosPrincipal: jest.fn(),
  };

  let controller: DocumentalV2Controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentalV2Controller(
      contenedores as any,
      documentosOperativos as any,
      gruposFactura as any,
      grupoFacturaDocumentos as any,
      workspaceDocumentalV2 as any,
      asociarDocumentoPrincipalV2UseCase as any,
      asociarGrupoFacturaV2UseCase as any,
      asociarDocumentoGrupoFacturaV2UseCase as any,
      documentoExistenteReadonlyRepository as any,
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

  it('lista facturas candidatas para Grupo de Factura V2 usando el usecase operativo', async () => {
    const esperado = [{ documentoId: 910002, facturaLabel: 'Factura F001-00009001' }];
    asociarGrupoFacturaV2UseCase.listarFacturasCandidatas.mockResolvedValue(esperado);

    await expect(
      controller.listarFacturasCandidatas(
        '3',
        'F001',
        '1',
        '20',
        '1',
        'admin@documental.local',
        '1',
        'BBTI',
        '2',
        'req-1',
        'corr-1',
      ),
    ).resolves.toBe(esperado);

    expect(asociarGrupoFacturaV2UseCase.listarFacturasCandidatas).toHaveBeenCalledWith({
      documentoOperativoPrincipalId: 3,
      texto: 'F001',
      pagina: 1,
      limite: 20,
      usuario: {
        id: 1,
        email: 'admin@documental.local',
        workspaceId: 1,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-1',
        correlationId: 'corr-1',
        origen: 'api-gateway',
      },
    });
  });

  it('asocia una factura creando Grupo de Factura V2 usando el usecase operativo', async () => {
    const esperado = {
      grupoFactura: { id: 4, documentoOperativoPrincipalId: 3, facturaDocumentoId: 910002 },
      idempotente: false,
      workspaceDebeRefrescar: true,
    };
    asociarGrupoFacturaV2UseCase.execute.mockResolvedValue(esperado);

    await expect(
      controller.asociarGrupoFactura(
        { documentoOperativoPrincipalId: 3, facturaDocumentoId: 910002 },
        '1',
        'admin@documental.local',
        '1',
        'BBTI',
        '2',
        'req-1',
        'corr-1',
      ),
    ).resolves.toBe(esperado);

    expect(asociarGrupoFacturaV2UseCase.execute).toHaveBeenCalledWith({
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 910002,
      usuario: {
        id: 1,
        email: 'admin@documental.local',
        workspaceId: 1,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-1',
        correlationId: 'corr-1',
        origen: 'api-gateway',
      },
    });
  });

  it('lista documentos candidatos para Grupo de Factura V2 usando el usecase operativo', async () => {
    const esperado = [{ documentoId: 910007, tipoDocumental: 'GUIA_REMISION' }];
    asociarDocumentoGrupoFacturaV2UseCase.listarDocumentosCandidatos.mockResolvedValue(esperado);

    await expect(
      controller.listarDocumentosCandidatosGrupo(
        '2',
        'GUIA_REMISION',
        'T001',
        '1',
        '20',
        '1',
        'admin@documental.local',
        '1',
        'BBTI',
        '2',
        'req-2',
        'corr-2',
      ),
    ).resolves.toBe(esperado);

    expect(asociarDocumentoGrupoFacturaV2UseCase.listarDocumentosCandidatos).toHaveBeenCalledWith({
      grupoFacturaId: 2,
      tipoDocumental: 'GUIA_REMISION',
      texto: 'T001',
      pagina: 1,
      limite: 20,
      usuario: {
        id: 1,
        email: 'admin@documental.local',
        workspaceId: 1,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-2',
        correlationId: 'corr-2',
        origen: 'api-gateway',
      },
    });
  });

  it('asocia un documento a Grupo de Factura V2 usando el usecase operativo', async () => {
    const esperado = {
      documentoGrupoFactura: { id: 1, grupoFacturaId: 2, documentoId: 910007 },
      idempotente: false,
      workspaceDebeRefrescar: true,
    };
    asociarDocumentoGrupoFacturaV2UseCase.execute.mockResolvedValue(esperado);

    await expect(
      controller.asociarDocumentoGrupoFactura(
        { grupoFacturaId: 2, documentoId: 910007, tipoRelacion: 'adjunto_guia' },
        '1',
        'admin@documental.local',
        '1',
        'BBTI',
        '2',
        'req-2',
        'corr-2',
      ),
    ).resolves.toBe(esperado);

    expect(asociarDocumentoGrupoFacturaV2UseCase.execute).toHaveBeenCalledWith({
      grupoFacturaId: 2,
      documentoId: 910007,
      tipoRelacion: 'adjunto_guia',
      usuario: {
        id: 1,
        email: 'admin@documental.local',
        workspaceId: 1,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-2',
        correlationId: 'corr-2',
        origen: 'api-gateway',
      },
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


  it('construye vista interna workspace V2 desde expediente V1', async () => {
    const esperado = {
      origen: {
        modeloEntrada: 'V1',
        expedienteId: 41,
        modo: 'lectura',
      },
      resumen: {
        documentosOperativosPrincipales: 1,
        gruposFactura: 1,
      },
    };
    workspaceDocumentalV2.construirDesdeExpedienteV1.mockResolvedValue(esperado);

    await expect(controller.construirWorkspaceDesdeExpedienteV1(41)).resolves.toBe(esperado);

    expect(workspaceDocumentalV2.construirDesdeExpedienteV1).toHaveBeenCalledWith(41);
  });
});
