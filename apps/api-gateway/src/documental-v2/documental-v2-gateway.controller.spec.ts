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

  it('materializa contexto operativo desde expediente V1 por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      permisos: {
        actions: ['documentos.vincular_expediente'],
      },
    });

    const respuesta = {
      expedienteId: 16,
      contenedorOperativo: {
        id: 10,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        tipoContexto: 'expediente_v1',
        codigo: '0501',
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

    const result = await controller.materializarContextoOperativoDesdeExpedienteV1(
      'Bearer token-valido',
      'req-materializar-1',
      '16',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/workspace/expedientes-v1/16/materializar-contenedor',
      {},
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-materializar-1',
          'x-correlation-id': 'req-materializar-1',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });

  it('rechaza materialización si el workspace no contiene documentos.vincular_expediente', async () => {
    const { controller } = buildController({
      sub: 4,
      email: 'compras@documental.local',
      workspaceId: 4,
      permisos: {
        actions: ['documentos.ver'],
      },
    });

    await expect(
      controller.materializarContextoOperativoDesdeExpedienteV1(
        'Bearer token-valido',
        'req-materializar-2',
        '16',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(axios.post).not.toHaveBeenCalled();
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


  it('permite anular un Contenedor Operativo con permiso específico', async () => {
    const contexto = {
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      empresa: 'BBTI',
      clienteDestinoId: 2,
      sessionContextId: 'bc8faa7a-ff31-4fd9-9014-86c92db3c3fa',
      sistema: 'DOCUMENTAL',
      perfil: 'admin',
      permisos: {
        actions: ['documental_v2.contenedores.anular'],
      },
    };

    const { controller } = buildController(contexto);

    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        contenedorOperativo: {
          id: 4,
          estado: 'anulado',
          motivoAnulacion: 'Motivo controlado',
        },
        idempotente: false,
        workspaceDebeRefrescar: true,
      },
    });

    const result = await controller.anularContenedorOperativo(
      'Bearer token-controlado',
      'b2ea3424-91c9-45d3-b12c-1f0fac78e6c6',
      '4',
      {
        motivo: 'Motivo controlado',
        usuarioId: 999,
        empresaCodigo: 'OTRA',
      },
    );

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        '/documental-v2/contenedores/4/anular',
      ),
      {
        motivo: 'Motivo controlado',
      },
      {
        headers: expect.objectContaining({
          authorization: 'Bearer token-controlado',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-session-context-id':
            'bc8faa7a-ff31-4fd9-9014-86c92db3c3fa',
          'x-sistema-codigo': 'DOCUMENTAL',
          'x-perfil-codigo': 'admin',
          'x-request-id':
            'b2ea3424-91c9-45d3-b12c-1f0fac78e6c6',
        }),
      },
    );

    expect(result).toEqual({
      contenedorOperativo: {
        id: 4,
        estado: 'anulado',
        motivoAnulacion: 'Motivo controlado',
      },
      idempotente: false,
      workspaceDebeRefrescar: true,
    });
  });

  it('rechaza la anulación sin el permiso específico aunque el perfil sea admin', async () => {
    const { controller } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      empresa: 'BBTI',
      clienteDestinoId: 2,
      sessionContextId: 'bc8faa7a-ff31-4fd9-9014-86c92db3c3fa',
      sistema: 'DOCUMENTAL',
      perfil: 'admin',
      permisos: {
        actions: ['documentos.vincular_expediente'],
      },
    });

    await expect(
      controller.anularContenedorOperativo(
        'Bearer token-sin-permiso',
        'request-sin-permiso',
        '4',
        {
          motivo: 'Motivo controlado',
        },
      ),
    ).rejects.toThrow(
      'No tienes permiso para anular Contenedores Operativos V2',
    );

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('propaga la respuesta idempotente del servicio documental', async () => {
    const { controller } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      empresa: 'BBTI',
      clienteDestinoId: 2,
      sessionContextId: 'bc8faa7a-ff31-4fd9-9014-86c92db3c3fa',
      sistema: 'DOCUMENTAL',
      perfil: 'admin',
      permisos: {
        actions: ['documental_v2.contenedores.anular'],
      },
    });

    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        contenedorOperativo: {
          id: 4,
          estado: 'anulado',
          motivoAnulacion: 'Motivo original',
        },
        idempotente: true,
        workspaceDebeRefrescar: false,
      },
    });

    await expect(
      controller.anularContenedorOperativo(
        'Bearer token-controlado',
        'request-idempotente',
        '4',
        {
          motivo: 'Motivo distinto',
        },
      ),
    ).resolves.toEqual({
      contenedorOperativo: {
        id: 4,
        estado: 'anulado',
        motivoAnulacion: 'Motivo original',
      },
      idempotente: true,
      workspaceDebeRefrescar: false,
    });
  });


  it('expone anulación de Documento Operativo Principal por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const body = {
      usuarioId: 1,
      motivo: 'Corrección de documento principal',
    };

    const respuesta = {
      id: 21,
      documentoId: 3727,
      estado: 'anulado',
      esPrincipalActivo: false,
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: respuesta,
    });

    const result = await controller.anularDocumentoOperativoPrincipal(
      '21',
      body,
      'Bearer token-valido',
      'req-anular-principal-1',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/documentos-operativos-principales/21/anular',
      body,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token-valido',
          'x-request-id': 'req-anular-principal-1',
          'x-correlation-id': 'req-anular-principal-1',
        }),
      }),
    );

    expect(result).toEqual(respuesta);
  });

  it('expone anulación de Grupo de Factura por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const body = {
      usuarioId: 1,
      motivo: 'Factura asociada incorrectamente',
    };

    const respuesta = {
      id: 31,
      facturaDocumentoId: 910001,
      estado: 'anulado',
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: respuesta,
    });

    const result = await controller.anularGrupoFactura(
      '31',
      body,
      'Bearer token-valido',
      'req-anular-grupo-1',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/grupos-factura/31/anular',
      body,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token-valido',
          'x-request-id': 'req-anular-grupo-1',
          'x-correlation-id': 'req-anular-grupo-1',
        }),
      }),
    );

    expect(result).toEqual(respuesta);
  });

  it('expone anulación de documento asociado por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const body = {
      usuarioId: 1,
      motivo: 'Adjunto vinculado al grupo equivocado',
    };

    const respuesta = {
      id: 41,
      grupoFacturaId: 31,
      documentoId: 910007,
      estado: 'anulado',
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: respuesta,
    });

    const result = await controller.anularGrupoFacturaDocumento(
      '41',
      body,
      'Bearer token-valido',
      'req-anular-documento-1',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/grupo-factura-documentos/41/anular',
      body,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token-valido',
          'x-request-id': 'req-anular-documento-1',
          'x-correlation-id': 'req-anular-documento-1',
        }),
      }),
    );

    expect(result).toEqual(respuesta);
  });

});
