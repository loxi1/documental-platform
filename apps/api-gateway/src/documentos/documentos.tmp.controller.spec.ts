jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }), { virtual: true });
import { of } from 'rxjs';
import axios from 'axios';
import { DocumentosGatewayController } from './documentos.controller';

describe('Gateway TEMP autenticado', () => {
  const context = { sub: 6, workspaceId: 12, empresa: 'BBTI', clienteDestinoId: 2, sistema: 'DOCUMENTAL', permisos: { actions: ['documentos.subir'] } };
  const controller = (payload: any = context) => new DocumentosGatewayController({ get: () => 'http://lab/api/v1' } as any, { send: () => of({ valid: true, payload }) } as any);
  afterEach(() => jest.restoreAllMocks());
  it('consulta usa actor/contexto del token', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({ data: { data: { tempId: 1 } } });
    expect(await controller().consultarTmp('Bearer token', 'req', '1')).toEqual({ tempId: 1 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ headers: expect.objectContaining({ 'x-actor-id': '6', 'x-workspace-id': '12' }) }));
  });
  it('rechaza sin permiso de carga', async () => {
    const spy = jest.spyOn(axios, 'request');
    await expect(controller({ ...context, permisos: { actions: [] } }).consultarTmp('Bearer token','req','1')).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
  it('no interpola rutas arbitrarias', async () => {
    await expect(controller().consultarTmp('Bearer token','req','../1')).rejects.toThrow('tempId');
  });
  it('preview TEMP usa contexto autenticado y no recibe storage desde cliente', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        data: {
          tempId: 1,
          signedUrl: 'http://preview.local/factura.pdf',
        },
      },
    });

    const result = await controller().obtenerPreviewTmp(
      'Bearer token',
      'req',
      '1',
    );

    expect(result).toEqual({
      tempId: 1,
      signedUrl: 'http://preview.local/factura.pdf',
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'http://lab/api/v1/documentos/tmp/1/preview-url',
        headers: expect.objectContaining({
          'x-actor-id': '6',
          'x-workspace-id': '12',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
        }),
      }),
    );

    const request = spy.mock.calls[0][0] as any;
    expect(request.data).toBeUndefined();
  });

  it('preview TEMP rechaza tempId arbitrario antes de proxy', async () => {
    const spy = jest.spyOn(axios, 'request');

    await expect(
      controller().obtenerPreviewTmp('Bearer token', 'req', '../1'),
    ).rejects.toThrow('tempId');

    expect(spy).not.toHaveBeenCalled();
  });

  it('OCR TEMP propaga contexto, idempotency y body al contrato existente', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        data: {
          tempId: 1,
          ocrEstado: 'PROCESSING',
          temporal: true,
          persistido: false,
        },
      },
    });

    const result = await controller().procesarOcrTmp(
      'Bearer token',
      'req',
      'ocr-key',
      '1',
      { tipoEsperado: 'FACTURA' },
    );

    expect(result).toEqual(expect.objectContaining({
      tempId: 1,
      ocrEstado: 'PROCESSING',
    }));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://lab/api/v1/documentos/tmp/1/procesar-ocr',
        headers: expect.objectContaining({
          'x-actor-id': '6',
          'x-workspace-id': '12',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'idempotency-key': 'ocr-key',
        }),
        data: { tipoEsperado: 'FACTURA' },
      }),
    );
  });

  it('OCR TEMP recovery devuelve DONE existente por el mismo proxy', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        data: {
          tempId: 1,
          ocrEstado: 'DONE',
          tipoEsperado: 'FACTURA',
          temporal: true,
          persistido: false,
          metadata: { serie: 'F001' },
        },
      },
    });

    const result = await controller().procesarOcrTmp(
      'Bearer token',
      'req',
      'ocr-recovery-key',
      '1',
      { tipoEsperado: 'FACTURA' },
    );

    expect(result).toEqual(expect.objectContaining({
      tempId: 1,
      ocrEstado: 'DONE',
      metadata: { serie: 'F001' },
    }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('materialización FACTURA OP propaga identidad e idempotency y conserva documentoId canónico', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        data: {
          tempId: 1,
          documentoId: 700,
          archivoId: 701,
          estado: 'PROMOTED',
        },
      },
    });

    const metadata = {
      fechaEmision: '2026-09-20',
      serie: 'F001',
      numero: '123',
      rucProveedor: '20123456789',
      proveedor: 'PROVEEDOR VALIDADO SAC',
      montoTotal: 150.5,
    };

    const result = await controller().materializarFacturaOpTmp(
      'Bearer token',
      'req',
      'materializar-key',
      '1',
      { metadata },
    );

    expect(result).toEqual(expect.objectContaining({
      tempId: 1,
      documentoId: 700,
      archivoId: 701,
    }));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://lab/api/v1/documentos/tmp/1/materializar-factura-op',
        headers: expect.objectContaining({
          'x-actor-id': '6',
          'x-workspace-id': '12',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'idempotency-key': 'materializar-key',
        }),
        data: { metadata },
      }),
    );
  });

  it.each([
    ['procesarOcrTmp', ['Bearer token', 'req', 'key', '../1', { tipoEsperado: 'FACTURA' }]],
    ['materializarFacturaOpTmp', ['Bearer token', 'req', 'key', '../1', { metadata: {} }]],
    ['materializarReciboHonorarioOpTmp', ['Bearer token', 'req', 'key', '../1', { metadata: {} }]],
  ])('%s rechaza tempId arbitrario antes del proxy', async (method, args) => {
    const spy = jest.spyOn(axios, 'request');

    await expect(
      (controller() as any)[method](...args),
    ).rejects.toThrow('tempId');

    expect(spy).not.toHaveBeenCalled();
  });

  it('materialización RECIBO_HONORARIO OP propaga identidad e idempotency y conserva documentoId canónico', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        data: {
          tempId: 1,
          documentoId: 800,
          archivoId: 801,
          estado: 'PROMOTED',
        },
      },
    });

    const metadata = {
      fechaEmision: '2026-09-20',
      serie: 'E001',
      numero: '456',
      rucEmisor: '20123456789',
      razonSocialEmisor: 'PROFESIONAL VALIDADO',
      moneda: 'PEN',
      descripcionServicio: 'Servicio profesional',
      montoTotal: 150.5,
      retencion: 12,
      montoNeto: 138.5,
      observaciones: 'Validado por usuario',
    };

    const result = await controller().materializarReciboHonorarioOpTmp(
      'Bearer token',
      'req-rh',
      'materializar-rh-key',
      '1',
      { metadata },
    );

    expect(result).toEqual(
      expect.objectContaining({
        tempId: 1,
        documentoId: 800,
        archivoId: 801,
      }),
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://lab/api/v1/documentos/tmp/1/materializar-recibo-honorario-op',
        headers: expect.objectContaining({
          'x-actor-id': '6',
          'x-workspace-id': '12',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'idempotency-key': 'materializar-rh-key',
        }),
        data: { metadata },
      }),
    );
  });

  it('materialización RECIBO_HONORARIO OP propaga 409 del backend sin convertirlo en éxito', async () => {
    jest.spyOn(axios, 'request').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: 'RECIBO_HONORARIO_TEMP_IDEMPOTENCY_CONFLICT',
        },
      },
    });

    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    let captured: any;

    try {
      await controller().materializarReciboHonorarioOpTmp(
        'Bearer token',
        'req-rh-conflict',
        'materializar-rh-conflict-key',
        '1',
        { metadata: {} },
      );
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeDefined();
    expect(captured.getStatus()).toBe(409);
    expect(captured.getResponse()).toBe(
      'RECIBO_HONORARIO_TEMP_IDEMPOTENCY_CONFLICT',
    );
  });

  it('materialización FACTURA OP propaga 409 del backend sin convertirlo en éxito', async () => {
    jest.spyOn(axios, 'request').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: 'FACTURA_TEMP_IDEMPOTENCY_CONFLICT',
        },
      },
    });

    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    let captured: any;
    try {
      await controller().materializarFacturaOpTmp(
        'Bearer token',
        'req',
        'materializar-conflict-key',
        '1',
        { metadata: {} },
      );
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeDefined();
    expect(captured.getStatus()).toBe(409);
    expect(captured.getResponse()).toBe('FACTURA_TEMP_IDEMPOTENCY_CONFLICT');
  });

  it('reserva rechaza actor del body', async () => {
    await expect(controller().reservarTmp('Bearer token','req','key', [], { actorId: 999 })).rejects.toThrow('únicamente');
  });
});
