jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('axios', () => {
  const request = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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
          'x-finanzas-correspondencia-autorizar-excepcion': 'false',
        },
      },
    );
    expect(result).toEqual(respuesta);
  });

  it('propaga permiso explícito para autorizar excepción financiera', async () => {
    const { controller } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      permisos: {
        actions: [
          'documental_v2.finanzas.correspondencia.autorizar_excepcion',
        ],
      },
    });

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          documentoGrupoFactura: {
            id: 2,
            grupoFacturaId: 2,
            documentoId: 29,
            tipoRelacion: 'adjunto_transferencia',
            estado: 'activo',
          },
          idempotente: false,
          workspaceDebeRefrescar: true,
        },
      },
    });

    const body = {
      grupoFacturaId: 2,
      documentoId: 29,
      tipoRelacion: 'adjunto_transferencia',
      decisionCorrespondencia: {
        accion: 'AUTORIZAR_EXCEPCION',
        motivo: 'Excepción autorizada para prueba controlada.',
      },
    };

    await controller.asociarDocumentoGrupoFactura(
      'Bearer token-valido',
      'req-finanzas-excepcion',
      body,
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/grupos-factura/documentos/asociar',
      body,
      {
        headers: expect.objectContaining({
          'x-finanzas-correspondencia-autorizar-excepcion': 'true',
        }),
      },
    );
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



  it('expone evaluación de correspondencia pago-factura por proxy controlado', async () => {
    const { controller, nats } = buildController({
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
    });

    const respuesta = {
      estado: 'NO_VERIFICABLE',
      facturaDocumentoId: 26,
      pagoDocumentoId: 29,
      requiereDecisionHumana: true,
      permiteAsociacionOrdinaria: false,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const result = await controller.evaluarCorrespondenciaPagoFactura(
      'Bearer token-valido',
      'req-finanzas-1',
      '26',
      '29',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });

    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/finanzas/correspondencia/evaluar',
      {
        params: {
          facturaDocumentoId: '26',
          pagoDocumentoId: '29',
        },
        headers: {
          authorization: 'Bearer token-valido',
          'x-user-id': '1',
          'x-user-email': 'admin@documental.local',
          'x-workspace-id': '1',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-finanzas-1',
          'x-correlation-id': 'req-finanzas-1',
        },
      },
    );

    expect(result).toEqual(respuesta);
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


  it('lista Contenedores Operativos usando empresa y cliente del contexto autenticado', async () => {
    const { controller } = buildController({
      sub: 4,
      email: 'compras@documental.local',
      workspaceId: 4,
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
    });

    const respuesta = {
      items: [
        {
          id: 21,
          empresaCodigo: 'BBTI',
          clienteDestinoId: 2,
          tipoContexto: 'centro_costo_op',
          codigo: 'CC-MVP-001',
          estado: 'activo',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: respuesta,
      },
    });

    const result = await controller.listarContenedoresOperativos(
      'Bearer token-compras',
      'req-listar-1',
      {
        empresaCodigo: 'OTRA',
        clienteDestinoId: '999',
        tipoContexto: 'centro_costo_op',
        estado: 'activo',
        q: 'MVP',
        limit: '50',
        offset: '0',
      },
    );

    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/contenedores',
      {
        params: {
          empresaCodigo: 'BBTI',
          clienteDestinoId: 2,
          tipoContexto: 'centro_costo_op',
          estado: 'activo',
          q: 'MVP',
          limit: '50',
          offset: '0',
        },
        headers: expect.objectContaining({
          authorization: 'Bearer token-compras',
          'x-user-id': '4',
          'x-user-email': 'compras@documental.local',
          'x-workspace-id': '4',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'x-request-id': 'req-listar-1',
        }),
      },
    );

    expect(result).toEqual(respuesta);
  });

  it('rechaza listar Contenedores Operativos sin capacidad ver', async () => {
    const { controller } = buildController({
      perfil: 'compras',
      permisos: {
        actions: ['documentos.ver'],
      },
    });

    await expect(
      controller.listarContenedoresOperativos(
        'Bearer token-sin-ver',
        'req-listar-403',
        {
          tipoContexto: 'centro_costo_op',
        },
      ),
    ).rejects.toThrow(
      'No tienes permiso para consultar Contenedores Operativos V2',
    );

    expect(axios.get).not.toHaveBeenCalled();
  });

  it('busca Contenedor Operativo por clave usando la empresa del contexto', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
    });

    const contenedor = {
      id: 22,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'centro_costo_op',
      codigo: 'CC-MVP-002',
      estado: 'activo',
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: contenedor,
      },
    });

    const result = await controller.buscarContenedorOperativoPorClave(
      'Bearer token-ver',
      'req-buscar-1',
      {
        empresaCodigo: 'OTRA',
        tipoContexto: 'centro_costo_op',
        codigo: 'CC-MVP-002',
      },
    );

    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/contenedores/buscar',
      {
        params: {
          empresaCodigo: 'BBTI',
          tipoContexto: 'centro_costo_op',
          codigo: 'CC-MVP-002',
        },
        headers: expect.objectContaining({
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
        }),
      },
    );

    expect(result).toEqual(contenedor);
  });

  it('obtiene detalle y valida empresa y cliente destino', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
    });

    const contenedor = {
      id: 23,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'centro_costo_op',
      codigo: 'CC-MVP-003',
      estado: 'activo',
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: contenedor,
      },
    });

    await expect(
      controller.obtenerContenedorOperativo(
        'Bearer token-ver',
        'req-detalle-1',
        '23',
      ),
    ).resolves.toEqual(contenedor);
  });

  it('rechaza detalle perteneciente a otro cliente destino', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
    });

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 24,
          empresaCodigo: 'BBTI',
          clienteDestinoId: 99,
          tipoContexto: 'centro_costo_op',
          codigo: 'CC-AJENO',
          estado: 'activo',
        },
      },
    });

    await expect(
      controller.obtenerContenedorOperativo(
        'Bearer token-ver',
        'req-detalle-ajeno',
        '24',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propaga 404 del detalle de Contenedor Operativo', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
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
      controller.obtenerContenedorOperativo(
        'Bearer token-ver',
        'req-detalle-404',
        '999999',
      ),
    ).rejects.toMatchObject({
      status: 404,
      response: expect.objectContaining({
        code: 'CONTENEDOR_OPERATIVO_NO_ENCONTRADO',
      }),
    });
  });

  it('crea Contenedor Operativo reemplazando empresa y cliente manipulables', async () => {
    const { controller } = buildController({
      sub: 4,
      email: 'compras@documental.local',
      workspaceId: 4,
      permisos: {
        actions: ['documental_v2.contenedores.crear'],
      },
    });

    const creado = {
      id: 25,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'centro_costo_op',
      codigo: 'CC-MVP-004',
      descripcion: 'Centro de costo controlado',
      estado: 'activo',
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: creado,
      },
    });

    const result = await controller.crearContenedorOperativo(
      'Bearer token-crear',
      'req-crear-1',
      {
        empresaCodigo: 'OTRA',
        clienteDestinoId: 999,
        tipoContexto: 'centro_costo_op',
        codigo: 'CC-MVP-004',
        descripcion: 'Centro de costo controlado',
        centroCostoCodigo: 'CC-MVP-004',
      },
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/contenedores',
      {
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        tipoContexto: 'centro_costo_op',
        codigo: 'CC-MVP-004',
        descripcion: 'Centro de costo controlado',
        centroCostoCodigo: 'CC-MVP-004',
      },
      {
        headers: expect.objectContaining({
          authorization: 'Bearer token-crear',
          'x-user-id': '4',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
        }),
      },
    );

    expect(result).toEqual(creado);
  });

  it('propaga 409 de código activo duplicado al crear', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.crear'],
      },
    });

    (axios.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: 'CONTENEDOR_OPERATIVO_YA_EXISTE',
            message:
              'Ya existe un contenedor operativo activo con la misma empresa, tipo y código.',
          },
        },
      },
    });

    await expect(
      controller.crearContenedorOperativo(
        'Bearer token-crear',
        'req-crear-409',
        {
          tipoContexto: 'centro_costo_op',
          codigo: 'CC-DUPLICADO',
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'CONTENEDOR_OPERATIVO_YA_EXISTE',
      }),
    });
  });

  it('actualiza un Contenedor Operativo activo después de validar su alcance', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.editar'],
      },
    });

    const actual = {
      id: 26,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'centro_costo_op',
      codigo: 'CC-MVP-005',
      descripcion: 'Descripción inicial',
      estado: 'activo',
    };

    const actualizado = {
      ...actual,
      descripcion: 'Descripción actualizada',
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: actual,
      },
    });

    (axios.patch as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: actualizado,
      },
    });

    const result = await controller.actualizarContenedorOperativo(
      'Bearer token-editar',
      'req-editar-1',
      '26',
      {
        descripcion: 'Descripción actualizada',
      },
    );

    expect(axios.patch).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/contenedores/26',
      {
        descripcion: 'Descripción actualizada',
      },
      {
        headers: expect.objectContaining({
          authorization: 'Bearer token-editar',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
        }),
      },
    );

    expect(result).toEqual(actualizado);
  });

  it('rechaza con 409 la edición de un Contenedor Operativo anulado', async () => {
    const { controller } = buildController({
      permisos: {
        actions: ['documental_v2.contenedores.editar'],
      },
    });

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 27,
          empresaCodigo: 'BBTI',
          clienteDestinoId: 2,
          tipoContexto: 'centro_costo_op',
          codigo: 'CC-ANULADO',
          estado: 'anulado',
        },
      },
    });

    await expect(
      controller.actualizarContenedorOperativo(
        'Bearer token-editar',
        'req-editar-anulado',
        '27',
        {
          descripcion: 'No debe actualizarse',
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'CONTENEDOR_OPERATIVO_ANULADO_NO_EDITABLE',
      }),
    });

    expect(axios.patch).not.toHaveBeenCalled();
  });

  it('rechaza editar sin capacidad específica aunque el perfil sea compras', async () => {
    const { controller } = buildController({
      perfil: 'compras',
      permisos: {
        actions: ['documental_v2.contenedores.ver'],
      },
    });

    await expect(
      controller.actualizarContenedorOperativo(
        'Bearer token-sin-editar',
        'req-editar-403',
        '28',
        {
          descripcion: 'No autorizado',
        },
      ),
    ).rejects.toThrow(
      'No tienes permiso para editar Contenedores Operativos V2',
    );

    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.patch).not.toHaveBeenCalled();
  });

});
