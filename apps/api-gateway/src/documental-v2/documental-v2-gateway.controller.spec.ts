jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('axios', () => {
  const request = {
    get: jest.fn(),
    post: jest.fn(),
    isAxiosError: jest.fn((error: any) => Boolean(error?.isAxiosError)),
  };
  return {
    __esModule: true,
    default: request,
    ...request,
  };

  it('expone trazabilidad canónica V2 por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const respuesta = {
      version: 1,
      contenedorOperativoId: 2,
      items: [
        {
          id: 'auditoria:348',
          fecha: '2026-07-14T21:23:43.735Z',
          categoria: 'AUDITORIA',
          tipo: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
          descripcion: 'Documento asociado al Grupo de Factura desde operación V2.',
          actor: { usuarioId: 1, email: 'admin@documental.local' },
          entidad: { tipo: 'grupo_factura_documento', id: '5' },
          resultado: 'CREADO',
          origen: 'api-gateway',
          requestId: 'req-6',
          correlationId: 'req-6',
        },
      ],
      cobertura: { auditoria: true, documentoEventos: false, parcial: true },
      advertencias: ['TRAZABILIDAD_PARCIAL', 'SIN_EVENTOS_DOCUMENTALES'],
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const result = await controller.consultarTrazabilidadPorContenedor(
      'Bearer token-valido',
      'req-6',
      '2',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/trazabilidad/contenedores/2',
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-6',
          'x-correlation-id': 'req-6',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });

  it('propaga errores upstream de trazabilidad V2 como HttpException controlada', async () => {
    const { controller } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    (axios.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: {
            code: 'CONTENEDOR_OPERATIVO_NO_ENCONTRADO',
            message: 'Contenedor Operativo no encontrado',
          },
        },
      },
    });

    await expect(
      controller.consultarTrazabilidadPorContenedor('Bearer token-valido', 'req-7', '999'),
    ).rejects.toMatchObject({ status: 404 });
  });

});

import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { of } from 'rxjs';

import { DocumentalV2GatewayController } from './documental-v2-gateway.controller';

describe('DocumentalV2GatewayController', () => {
  const workspace = {
    contenedorOperativo: {
      vista: {
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
    },
    resumen: {
      documentosOperativosPrincipales: 1,
      gruposFactura: 1,
      adjuntosNoClasificados: 0,
      advertencias: 0,
    },
  };

  const buildController = (payload: Record<string, unknown> = {}) => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'MS_DOCUMENTOS_URL' ? 'http://ms-documentos:3002/api/v1' : undefined,
      ),
    } as unknown as ConfigService;

    const nats = {
      send: jest.fn(() =>
        of({
          valid: true,
          payload: {
            empresa: 'BBTI',
            clienteDestinoId: 2,
            ...payload,
          },
        }),
      ),
    };

    return {
      controller: new DocumentalV2GatewayController(config, nats as any),
      nats,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: workspace,
      },
    });
  });

  it('expone el workspace documental V2 desde expediente V1 por proxy controlado', async () => {
    const { controller, nats } = buildController();

    const result = await controller.construirWorkspaceDesdeExpedienteV1(
      'Bearer token-valido',
      'req-1',
      '41',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/workspace/expedientes-v1/41',
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-request-id': 'req-1',
          'x-correlation-id': 'req-1',
        },
      },
    );
    expect(result).toEqual(workspace);
  });

  it('rechaza requests sin token bearer', async () => {
    const { controller } = buildController();

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1(undefined, 'req-1', '41'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza workspace de otra empresa', async () => {
    const { controller } = buildController({ empresa: 'CIMA' });

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1('Bearer token-valido', 'req-1', '41'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza workspace de otro cliente destino', async () => {
    const { controller } = buildController({ clienteDestinoId: 99 });

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1('Bearer token-valido', 'req-1', '41'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('expone facturas candidatas por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const candidatos = [
      {
        documentoId: 910002,
        tipoDocumental: 'FACTURA',
        numeroDocumento: 'F001-00009001',
      },
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: candidatos,
      },
    });

    const result = await controller.listarFacturasCandidatas(
      'Bearer token-valido',
      'req-2',
      {
        documentoOperativoPrincipalId: '3',
        texto: 'F001',
        pagina: '1',
        limite: '20',
      },
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/facturas-candidatas',
      {
        params: {
          documentoOperativoPrincipalId: '3',
          texto: 'F001',
          pagina: '1',
          limite: '20',
        },
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-2',
          'x-correlation-id': 'req-2',
        },
      },
    );
    expect(result).toEqual(candidatos);
  });

  it('expone asociación de Grupo Factura V2 por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const respuesta = {
      grupoFactura: {
        id: 4,
        documentoOperativoPrincipalId: 3,
        facturaDocumentoId: 910002,
        estado: 'pendiente_revision',
      },
      idempotente: false,
      workspaceDebeRefrescar: true,
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const body = {
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 910002,
    };

    const result = await controller.asociarGrupoFactura(
      'Bearer token-valido',
      'req-3',
      body,
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/grupos-factura/asociar',
      body,
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-3',
          'x-correlation-id': 'req-3',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });



  it('expone documentos candidatos de Grupo Factura por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const candidatos = [
      {
        documentoId: 910007,
        tipoDocumental: 'GUIA_REMISION',
        tipoDocumentalLabel: 'Guía de remisión',
        tipoRelacion: 'adjunto_guia',
      },
    ];

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: candidatos,
      },
    });

    const result = await controller.listarDocumentosCandidatosGrupo(
      'Bearer token-valido',
      'req-4',
      {
        grupoFacturaId: '2',
        tipoDocumental: 'GUIA_REMISION',
        texto: 'T001',
        pagina: '1',
        limite: '20',
      },
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/documentos-candidatos-grupo',
      {
        params: {
          grupoFacturaId: '2',
          tipoDocumental: 'GUIA_REMISION',
          texto: 'T001',
          pagina: '1',
          limite: '20',
        },
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-4',
          'x-correlation-id': 'req-4',
        },
      },
    );
    expect(result).toEqual(candidatos);
  });

  it('expone asociación de documento a Grupo Factura por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const respuesta = {
      documentoGrupoFactura: {
        id: 1,
        grupoFacturaId: 2,
        documentoId: 910007,
        tipoRelacion: 'adjunto_guia',
        estado: 'activo',
      },
      idempotente: false,
      workspaceDebeRefrescar: true,
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const body = {
      grupoFacturaId: 2,
      documentoId: 910007,
      tipoRelacion: 'adjunto_guia',
    };

    const result = await controller.asociarDocumentoGrupoFactura(
      'Bearer token-valido',
      'req-5',
      body,
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/grupos-factura/documentos/asociar',
      body,
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-5',
          'x-correlation-id': 'req-5',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });


  it('expone trazabilidad canónica V2 por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const respuesta = {
      version: 1,
      contenedorOperativoId: 2,
      items: [
        {
          id: 'auditoria:348',
          fecha: '2026-07-14T21:23:43.735Z',
          categoria: 'AUDITORIA',
          tipo: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
          descripcion: 'Documento asociado al Grupo de Factura desde operación V2.',
          actor: { usuarioId: 1, email: 'admin@documental.local' },
          entidad: { tipo: 'grupo_factura_documento', id: '5' },
          resultado: 'CREADO',
          origen: 'api-gateway',
          requestId: 'req-6',
          correlationId: 'req-6',
        },
      ],
      cobertura: { auditoria: true, documentoEventos: false, parcial: true },
      advertencias: ['TRAZABILIDAD_PARCIAL', 'SIN_EVENTOS_DOCUMENTALES'],
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const result = await controller.consultarTrazabilidadPorContenedor(
      'Bearer token-valido',
      'req-6',
      '2',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/trazabilidad/contenedores/2',
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-6',
          'x-correlation-id': 'req-6',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });

  it('propaga errores upstream de trazabilidad V2 como HttpException controlada', async () => {
    const { controller } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    (axios.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: {
            code: 'CONTENEDOR_OPERATIVO_NO_ENCONTRADO',
            message: 'Contenedor Operativo no encontrado',
          },
        },
      },
    });

    await expect(
      controller.consultarTrazabilidadPorContenedor('Bearer token-valido', 'req-7', '999'),
    ).rejects.toMatchObject({ status: 404 });
  });

});
