jest.mock('@documental/shared', () => ({
  NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' },
}));
jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { BadRequestException } from '@nestjs/common';
import { DocumentosService } from './documentos.service';

function setup() {
  const repo = {};
  const v2 = {
    executeManualFactura: jest.fn().mockResolvedValue({
      documento: { id: 10 },
      archivo: { id: 12 },
      ocrResultado: { id: 21 },
    }),
  };
  const eventos = {
    registrarEvento: jest.fn().mockResolvedValue(undefined),
  };
  const nats = {};
  const gruposFactura = {
    buscarObligacionScoped: jest.fn(),
  };

  const service = new DocumentosService(
    repo as any,
    v2 as any,
    eventos as any,
    nats as any,
    gruposFactura as any,
  );

  return { service, v2, eventos, gruposFactura };
}

const inputBase = {
  expedienteId: 7,
  documentoBaseId: 5,
  tipoRelacion: 'adjunto_factura',
  esPrincipal: false,
  orden: 10,
  metadata: {
    tipoDocumental: 'FACTURA',
    serie: 'E001',
    numero: '123',
    fechaEmision: '2026-09-08',
    rucEmisor: '20123456789',
    razonSocial: 'Proveedor SAC',
    montoTotal: 100,
    moneda: 'PEN',
  },
};

describe('2B autoridad backend en confirmacion manual', () => {
  it.each([
    'claveDocumental',
    'clienteAbreviatura',
    'codigoExpediente',
    'rucComprador',
    'documentoBaseId',
    'contextoValidacion',
  ])('rechaza metadata con campo de autoridad %s antes de V2', async campo => {
    const { service, v2 } = setup();

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          metadata: {
            ...inputBase.metadata,
            [campo]: campo === 'contextoValidacion' ? {} : 'NO_PERMITIDO',
          },
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'METADATA_MANUAL_AUTORIDAD_PROHIBIDA',
        details: expect.objectContaining({
          campos: expect.arrayContaining([campo]),
        }),
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it('metadata fuente valida llega a V2 sin campos de autoridad', async () => {
    const { service, v2 } = setup();

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      inputBase,
      { usuarioId: 3, requestId: 'req-2b' },
    );

    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);
    expect(v2.executeManualFactura).toHaveBeenCalledWith(
      { documentoId: 10, archivoId: 12 },
      expect.objectContaining({
        expedienteId: 7,
        documentoBaseId: 5,
        tipoRelacion: 'adjunto_factura',
        metadata: expect.objectContaining({
          serie: 'E001',
          numero: '123',
          rucEmisor: '20123456789',
          razonSocial: 'Proveedor SAC',
        }),
      }),
      expect.objectContaining({
        usuarioId: 3,
        requestId: 'req-2b',
      }),
    );

    const metadata =
      v2.executeManualFactura.mock.calls[0][1].metadata;

    expect(metadata).not.toHaveProperty('claveDocumental');
    expect(metadata).not.toHaveProperty('clienteAbreviatura');
    expect(metadata).not.toHaveProperty('codigoExpediente');
    expect(metadata).not.toHaveProperty('rucComprador');
    expect(metadata).not.toHaveProperty('documentoBaseId');
    expect(metadata).not.toHaveProperty('contextoValidacion');
  });
});

describe('R10 mapping HTTP de validacion manual FACTURA', () => {
  it('mapea OCR_VALIDACION_INVALIDA a BadRequestException preservando payload', async () => {
    const { service, v2 } = setup();
    const error = new Error(
      'Faltan campos obligatorios para confirmar FACTURA: serie, numero',
    ) as Error & { code?: string; details?: unknown };

    error.code = 'OCR_VALIDACION_INVALIDA';
    error.details = {
      tipoDocumental: 'FACTURA',
      faltantes: ['serie', 'numero'],
    };

    v2.executeManualFactura.mockRejectedValueOnce(error);

    try {
      await service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        inputBase,
        { usuarioId: 3, requestId: 'req-r10' },
      );
      throw new Error('Se esperaba BadRequestException');
    } catch (caught: any) {
      expect(caught).toBeInstanceOf(BadRequestException);
      expect(caught.getStatus()).toBe(400);
      expect(caught.getResponse()).toEqual({
        code: 'OCR_VALIDACION_INVALIDA',
        message:
          'Faltan campos obligatorios para confirmar FACTURA: serie, numero',
        details: {
          tipoDocumental: 'FACTURA',
          faltantes: ['serie', 'numero'],
        },
      });
    }

    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);
  });

  it('no convierte errores distintos de OCR_VALIDACION_INVALIDA', async () => {
    const { service, v2 } = setup();
    const error = new Error('fallo distinto') as Error & { code?: string };

    error.code = 'OTRO_ERROR';
    v2.executeManualFactura.mockRejectedValueOnce(error);

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        inputBase,
        { usuarioId: 3, requestId: 'req-r10-other' },
      ),
    ).rejects.toBe(error);

    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);
  });
});

describe('G2 autoridad server-side para Factura sobre Orden de Pago', () => {
  const auditOp = {
    usuarioId: 3,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: 'req-g2',
  };

  const obligacionOp = {
    origenObligacion: 'ORDEN_PAGO',
    facturaDocumentoId: null,
    principalId: 601,
    tipoPrincipal: 'ORDEN_PAGO',
    documentoPrincipalId: 46,
    contenedorId: 501,
    expedienteId: 7,
  };

  it('T1: OP válida deriva origen y documento base desde persistencia', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOp);

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      {
        ...inputBase,
        grupoFacturaId: 701,
        documentoBaseId: undefined,
      },
      auditOp,
    );

    expect(gruposFactura.buscarObligacionScoped).toHaveBeenCalledTimes(1);
    expect(gruposFactura.buscarObligacionScoped).toHaveBeenCalledWith(
      701,
      {
        id: 3,
        workspaceId: 12,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
      expect.anything(),
    );

    expect(v2.executeManualFactura).toHaveBeenCalledWith(
      { documentoId: 10, archivoId: 12 },
      expect.objectContaining({
        expedienteId: 7,
        grupoFacturaId: 701,
        documentoBaseId: 46,
        origenObligacion: 'ORDEN_PAGO',
      }),
      expect.objectContaining(auditOp),
    );
  });

  it('T2: origen OP no proviene del cliente sino de la obligación persistida', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOp);

    const inputCliente = {
      ...inputBase,
      grupoFacturaId: 701,
      documentoBaseId: undefined,
    };

    expect(inputCliente).not.toHaveProperty('origenObligacion');

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      inputCliente,
      auditOp,
    );

    const inputInterno = v2.executeManualFactura.mock.calls[0][1];

    expect(inputInterno.origenObligacion).toBe('ORDEN_PAGO');
    expect(inputInterno.documentoBaseId).toBe(46);
  });

  it('T3: grupo no autorizado aborta sin confirmar ni degradar a OC/OS', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(null);

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          grupoFacturaId: 701,
        },
        auditOp,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'GRUPO_FACTURA_NO_AUTORIZADO',
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it('T4: expediente contradictorio con OP persistida aborta explícitamente', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOp);

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          expedienteId: 999,
          grupoFacturaId: 701,
          documentoBaseId: undefined,
        },
        auditOp,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CONTEXTO_OP_INCONSISTENTE',
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it('T5: documentoBaseId contradictorio con principal OP aborta explícitamente', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOp);

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          grupoFacturaId: 701,
          documentoBaseId: 999,
        },
        auditOp,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'DOCUMENTO_BASE_OP_INCONSISTENTE',
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it.each([
    ['usuarioId', { ...auditOp, usuarioId: null }],
    ['workspaceId', { ...auditOp, workspaceId: null }],
    ['empresaCodigo', { ...auditOp, empresaCodigo: null }],
    ['clienteDestinoId', { ...auditOp, clienteDestinoId: null }],
  ])(
    'T6: contexto autenticado incompleto (%s) aborta antes del repository',
    async (_campo, auditInvalido) => {
      const { service, v2, gruposFactura } = setup();

      await expect(
        service.confirmarFacturaManualConExpediente(
          { documentoId: 10, archivoId: 12 },
          {
            ...inputBase,
            grupoFacturaId: 701,
          },
          auditInvalido as any,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'CONTEXTO_AUTENTICADO_INCOMPLETO',
        }),
      });

      expect(gruposFactura.buscarObligacionScoped).not.toHaveBeenCalled();
      expect(v2.executeManualFactura).not.toHaveBeenCalled();
    },
  );

  it('T7: obligación genuina no OP conserva el flujo histórico sin inyectar origen', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue({
      ...obligacionOp,
      origenObligacion: 'FACTURA',
      tipoPrincipal: 'OC',
    });

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      {
        ...inputBase,
        grupoFacturaId: 701,
      },
      auditOp,
    );

    const inputInterno = v2.executeManualFactura.mock.calls[0][1];

    expect(inputInterno).not.toHaveProperty('origenObligacion');
    expect(inputInterno.documentoBaseId).toBe(inputBase.documentoBaseId);
  });

  it('T9: resolver autoridad OP no ejecuta regularización ni crea grupos en el service', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOp);

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      {
        ...inputBase,
        grupoFacturaId: 701,
        documentoBaseId: undefined,
      },
      auditOp,
    );

    expect(gruposFactura.buscarObligacionScoped).toHaveBeenCalledTimes(1);
    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);

    const inputInterno = v2.executeManualFactura.mock.calls[0][1];

    expect(inputInterno).toMatchObject({
      grupoFacturaId: 701,
      documentoBaseId: 46,
      origenObligacion: 'ORDEN_PAGO',
    });
  });
});

describe('G3 contrato normalizado de expedienteId en autoridad OP', () => {
  const auditOpG3 = {
    usuarioId: 3,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: 'req-g3',
  };

  const obligacionOpG3 = {
    origenObligacion: 'ORDEN_PAGO',
    facturaDocumentoId: null,
    principalId: 601,
    tipoPrincipal: 'ORDEN_PAGO',
    documentoPrincipalId: 46,
    contenedorId: 501,
    expedienteId: 26,
  };

  it('T2: expediente persistido normalizado 27 no coincide con request 26', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue({
      ...obligacionOpG3,
      expedienteId: 27,
    });

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          expedienteId: 26,
          grupoFacturaId: 701,
          documentoBaseId: undefined,
        },
        auditOpG3,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CONTEXTO_OP_INCONSISTENTE',
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it('T7: expediente persistido normalizado 26 habilita autoridad OP server-side', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue(obligacionOpG3);

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      {
        ...inputBase,
        expedienteId: 26,
        grupoFacturaId: 701,
        documentoBaseId: undefined,
      },
      auditOpG3,
    );

    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);
    expect(v2.executeManualFactura).toHaveBeenCalledWith(
      { documentoId: 10, archivoId: 12 },
      expect.objectContaining({
        expedienteId: 26,
        grupoFacturaId: 701,
        documentoBaseId: 46,
        origenObligacion: 'ORDEN_PAGO',
      }),
      expect.objectContaining(auditOpG3),
    );
  });

  it('T8: OP inconsistente aborta sin fallback OC/OS', async () => {
    const { service, v2, gruposFactura } = setup();

    gruposFactura.buscarObligacionScoped.mockResolvedValue({
      ...obligacionOpG3,
      expedienteId: 27,
    });

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          expedienteId: 26,
          grupoFacturaId: 701,
          documentoBaseId: undefined,
        },
        auditOpG3,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CONTEXTO_OP_INCONSISTENTE',
      }),
    });

    expect(gruposFactura.buscarObligacionScoped).toHaveBeenCalledTimes(1);
    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });
});
