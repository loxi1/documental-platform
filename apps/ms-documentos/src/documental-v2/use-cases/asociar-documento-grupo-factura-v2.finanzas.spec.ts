import { ConflictException } from '@nestjs/common';

jest.mock('../contenedor-operativo.repository', () => ({}));
jest.mock('../documento-existente-readonly.repository', () => ({}));
jest.mock('../documento-operativo-principal.repository', () => ({}));
jest.mock('../grupo-factura-documento.repository', () => ({}));
jest.mock('../grupo-factura.repository', () => ({}));
jest.mock('../auditoria-operativa-v2.repository', () => ({}));

import { AsociarDocumentoGrupoFacturaV2UseCase } from './asociar-documento-grupo-factura-v2.usecase';

const comparacionesCoinciden = {
  proveedor: { estado: 'COINCIDE', factura: '201', pago: '201' },
  moneda: { estado: 'COINCIDE', factura: 'PEN', pago: 'PEN' },
  importe: { estado: 'COINCIDE', factura: 100, pago: 100 },
  documentoReferenciado: {
    estado: 'COINCIDE',
    factura: 'F001-1',
    pago: 'F001-1',
  },
} as const;

function evaluacion(
  estado: 'VALIDADA' | 'NO_VERIFICABLE' | 'PENDIENTE' | 'INCOMPATIBLE',
  requiereDecisionHumana: boolean,
  permiteAsociacionOrdinaria: boolean,
) {
  return {
    estado,
    facturaDocumentoId: 26,
    pagoDocumentoId: 29,
    comparaciones: comparacionesCoinciden,
    requiereDecisionHumana,
    permiteAsociacionOrdinaria,
    advertencias: [],
  };
}

function buildUseCase(options?: {
  tipoDocumental?: string;
  existente?: any;
  evaluacion?: any;
  permiso?: boolean;
  origenObligacion?: 'FACTURA' | 'ORDEN_PAGO';
  facturaDocumentoId?: number | null;
  tipoPrincipal?: string;
  principalDocumentoId?: number;
  empresaGrupo?: string;
  empresaPago?: string;
  documentoOp?: any;
  pago?: any;
  grupoFacturaId?: number;
  clienteDestinoGrupo?: number;
}) {
  const contenedores = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 10,
      empresaCodigo: options?.empresaGrupo ?? 'BBTI',
      clienteDestinoId: options?.clienteDestinoGrupo ?? 2,
    }),
  };
  const principales = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 20,
      contenedorOperativoId: 10,
      documentoId: options?.principalDocumentoId ?? 25,
      tipoPrincipal: options?.tipoPrincipal ?? 'OC',
      estado: 'activo',
      esPrincipalActivo: true,
    }),
  };
  const gruposFactura = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: options?.grupoFacturaId ?? 4,
      documentoOperativoPrincipalId: 20,
      facturaDocumentoId:
        options?.facturaDocumentoId !== undefined
          ? options.facturaDocumentoId
          : 26,
      origenObligacion: options?.origenObligacion ?? 'FACTURA',
      estado: 'activo',
      anuladoEn: null,
    }),
  };
  const tipoRelacion =
    options?.tipoDocumental === 'GUIA_REMISION'
      ? 'adjunto_guia'
      : 'adjunto_transferencia';
  const row = {
    id: 80,
    grupoFacturaId: options?.grupoFacturaId ?? 4,
    documentoId: 29,
    tipoRelacion,
    estado: 'activo',
    metadata: {},
  };
  const grupoFacturaDocumentos = {
    buscarActivoPorDocumentoId: jest
      .fn()
      .mockResolvedValue(options?.existente ?? null),
    listarHistoricosPorDocumentoId: jest.fn().mockResolvedValue([]),
    crear: jest.fn().mockResolvedValue(row),
    actualizar: jest.fn().mockResolvedValue(row),
    sumarMontoTransferenciasActivas: jest.fn().mockResolvedValue(0),
  };
  const pago = options?.pago ?? {
    id: 29,
    tipoDocumental: options?.tipoDocumental ?? 'TRANSFERENCIA',
    clienteAbreviatura: options?.empresaPago ?? 'BBTI',
    estado: 'pendiente',
    rucEmisor: '201',
    razonSocialEmisor: 'Proveedor',
    serie: 'TR',
    numero: '29',
    claveDocumental: 'BBTI|TRANSFERENCIA|201|TR|29',
    fechaEmision: '2026-08-01',
    moneda: 'PEN',
    montoTotal: 100,
    nombreArchivo: 'transferencia.pdf',
    metadata: {},
  };

  const documentoOp = options?.documentoOp ?? {
    id: options?.principalDocumentoId ?? 25,
    tipoDocumental: 'ORDEN_PAGO',
    clienteAbreviatura: options?.empresaGrupo ?? 'BBTI',
    estado: 'confirmado',
    rucEmisor: '201',
    razonSocialEmisor: 'Proveedor',
    serie: null,
    numero: null,
    claveDocumental: null,
    fechaEmision: '2026-08-01',
    moneda: 'PEN',
    montoTotal: 100,
    nombreArchivo: 'op.pdf',
    metadata: {},
  };

  const documentos = {
    buscarPorId: jest.fn().mockImplementation(async (id: number) => {
      if (id === pago.id) return pago;
      if (
        (options?.origenObligacion ?? 'FACTURA') === 'ORDEN_PAGO' &&
        id === documentoOp.id
      ) {
        return documentoOp;
      }
      return null;
    }),
  };
  const auditoria = {
    registrarCreacion: jest.fn().mockResolvedValue(undefined),
    registrarDecisionCorrespondencia: jest.fn().mockResolvedValue(undefined),
  };
  const evaluarCorrespondencia = {
    execute: jest.fn().mockResolvedValue(
      options?.evaluacion ?? evaluacion('VALIDADA', false, true),
    ),
  };

  const useCase = new AsociarDocumentoGrupoFacturaV2UseCase(
    contenedores as any,
    principales as any,
    gruposFactura as any,
    grupoFacturaDocumentos as any,
    documentos as any,
    auditoria as any,
    evaluarCorrespondencia as any,
  );

  const input = {
    grupoFacturaId: options?.grupoFacturaId ?? 4,
    documentoId: 29,
    tipoRelacion,
    usuario: {
      id: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      requestId: 'req-finanzas',
      correlationId: 'req-finanzas',
      origen: 'api-gateway',
      tienePermisoAutorizarExcepcion: options?.permiso ?? false,
    },
  };

  return {
    useCase,
    input,
    grupoFacturaDocumentos,
    auditoria,
    evaluarCorrespondencia,
    gruposFactura,
    principales,
    contenedores,
    documentos,
  };
}

describe('AsociarDocumentoGrupoFacturaV2UseCase - correspondencia financiera', () => {
  it('1. VALIDADA crea asociación', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('VALIDADA', false, true),
    });

    const result = await ctx.useCase.execute(ctx.input);

    expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
    expect(result.documentoGrupoFactura?.id).toBe(80);
    expect(ctx.auditoria.registrarDecisionCorrespondencia).not.toHaveBeenCalled();
  });

  it('2. NO_VERIFICABLE + ACEPTAR + motivo crea asociación y auditoría', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('NO_VERIFICABLE', true, false),
    });

    const result = await ctx.useCase.execute({
      ...ctx.input,
      decisionCorrespondencia: {
        accion: 'ACEPTAR',
        motivo: 'Transferencia aceptada después de revisión humana.',
      },
    });

    expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
    expect(result.correspondencia?.estado).toBe('NO_VERIFICABLE');
    expect(result.correspondencia?.permiteAsociacionOrdinaria).toBe(true);
    expect(ctx.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'CORRESPONDENCIA_PAGO_FACTURA_DECIDIDA',
        despues: expect.objectContaining({
          accion: 'ACEPTAR',
          estadoResultante: 'NO_VERIFICABLE',
          asociacionCreada: true,
        }),
      }),
      undefined,
    );
  });

  it('3. NO_VERIFICABLE + ACEPTAR sin motivo rechaza', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('NO_VERIFICABLE', true, false),
    });

    await expect(
      ctx.useCase.execute({
        ...ctx.input,
        decisionCorrespondencia: { accion: 'ACEPTAR' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('4. OBSERVAR + motivo registra auditoría y no crea vínculo', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('NO_VERIFICABLE', true, false),
    });

    const result = await ctx.useCase.execute({
      ...ctx.input,
      decisionCorrespondencia: {
        accion: 'OBSERVAR',
        motivo: 'No existe referencia verificable de la factura.',
      },
    });

    expect(result.documentoGrupoFactura).toBeNull();
    expect(result.correspondencia?.estado).toBe('OBSERVADA');
    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    expect(ctx.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledWith(
      expect.objectContaining({
        despues: expect.objectContaining({
          accion: 'OBSERVAR',
          asociacionCreada: false,
        }),
      }),
      undefined,
    );
  });

  it('5. INCOMPATIBLE + ACEPTAR rechaza', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('INCOMPATIBLE', true, false),
    });

    await expect(
      ctx.useCase.execute({
        ...ctx.input,
        decisionCorrespondencia: {
          accion: 'ACEPTAR',
          motivo: 'Intento de aceptación ordinaria.',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('6. INCOMPATIBLE + AUTORIZAR_EXCEPCION sin permiso rechaza', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('INCOMPATIBLE', true, false),
      permiso: false,
    });

    await expect(
      ctx.useCase.execute({
        ...ctx.input,
        decisionCorrespondencia: {
          accion: 'AUTORIZAR_EXCEPCION',
          motivo: 'Excepción sustentada por revisión financiera.',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('7. INCOMPATIBLE + AUTORIZAR_EXCEPCION con permiso y motivo crea y audita', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('INCOMPATIBLE', true, false),
      permiso: true,
    });

    const result = await ctx.useCase.execute({
      ...ctx.input,
      decisionCorrespondencia: {
        accion: 'AUTORIZAR_EXCEPCION',
        motivo: 'Excepción autorizada por responsable financiero.',
      },
    });

    expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
    expect(result.correspondencia?.estado).toBe('EXCEPCION_AUTORIZADA');
    expect(ctx.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledWith(
      expect.objectContaining({
        despues: expect.objectContaining({
          permisoExcepcionUtilizado: true,
          asociacionCreada: true,
        }),
      }),
      undefined,
    );
  });

  it('8. llamada directa no omite evaluación ni decisión requerida', async () => {
    const ctx = buildUseCase({
      evaluacion: evaluacion('NO_VERIFICABLE', true, false),
    });

    await expect(ctx.useCase.execute(ctx.input)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(ctx.evaluarCorrespondencia.execute).toHaveBeenCalledWith(
      {
        facturaDocumentoId: 26,
        pagoDocumentoId: 29,
      },
      undefined,
    );
    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('9. reintento no duplica asociación activa', async () => {
    const existente = {
      id: 80,
      grupoFacturaId: 4,
      documentoId: 29,
      tipoRelacion: 'adjunto_transferencia',
      estado: 'activo',
      metadata: {},
    };
    const ctx = buildUseCase({ existente });

    const result = await ctx.useCase.execute(ctx.input);

    expect(result.idempotente).toBe(true);
    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('10. relación distinta de adjunto_transferencia conserva comportamiento', async () => {
    const ctx = buildUseCase({ tipoDocumental: 'GUIA_REMISION' });

    const result = await ctx.useCase.execute(ctx.input);

    expect(result.documentoGrupoFactura?.tipoRelacion).toBe('adjunto_guia');
    expect(ctx.evaluarCorrespondencia.execute).not.toHaveBeenCalled();
    expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
  });


  // FINANZAS_MULTIPAGO_SALDO_01B_R1
  it('15. segundo pago igual al saldo restante se asocia ordinariamente', async () => {
    const ctx = buildUseCase({
      evaluacion: {
        ...evaluacion('VALIDADA', false, true),
        comparaciones: {
          ...comparacionesCoinciden,
          importe: { estado: 'COINCIDE', factura: 444.95, pago: 44.95 },
        },
      },
    });
    ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas.mockResolvedValue(400);

    const result = await ctx.useCase.execute(ctx.input);

    expect(ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas)
      .toHaveBeenCalledWith(4, undefined);
    expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
    expect(result.documentoGrupoFactura?.id).toBe(80);
  });

  it('16. pago mayor al saldo restante exige decisión humana', async () => {
    const ctx = buildUseCase({
      evaluacion: {
        ...evaluacion('VALIDADA', false, true),
        comparaciones: {
          ...comparacionesCoinciden,
          importe: { estado: 'COINCIDE', factura: 444.95, pago: 50 },
        },
      },
    });
    ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas.mockResolvedValue(400);

    await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'DECISION_CORRESPONDENCIA_REQUERIDA',
      }),
    });
    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });

  it('17. factura con saldo cero bloquea un tercer pago', async () => {
    const ctx = buildUseCase({
      evaluacion: {
        ...evaluacion('VALIDADA', false, true),
        comparaciones: {
          ...comparacionesCoinciden,
          importe: { estado: 'COINCIDE', factura: 444.95, pago: 10 },
        },
      },
    });
    ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas.mockResolvedValue(444.95);

    await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'FACTURA_PAGO_COMPLETO',
      }),
    });
    expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
  });


  describe('R2 ORDEN_PAGO como obligación financiera', () => {
    const op153 = () =>
      buildUseCase({
        grupoFacturaId: 116,
        origenObligacion: 'ORDEN_PAGO',
        facturaDocumentoId: null,
        tipoPrincipal: 'ORDEN_PAGO',
        principalDocumentoId: 443,
        documentoOp: {
          id: 443,
          tipoDocumental: 'ORDEN_PAGO',
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          rucEmisor: null,
          razonSocialEmisor: null,
          serie: null,
          numero: null,
          claveDocumental: null,
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          montoTotal: 100,
          nombreArchivo: 'OP-153',
          metadata: {},
        },
        pago: {
          id: 29,
          tipoDocumental: 'TRANSFERENCIA',
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          rucEmisor: null,
          razonSocialEmisor: null,
          serie: null,
          numero: null,
          claveDocumental: null,
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          montoTotal: 100,
          nombreArchivo: 'transferencia-op153.pdf',
          metadata: {},
        },
      });

    it('R2-01 OP153 acepta facturaDocumentoId NULL y usa documento principal real sin invocar evaluador FACTURA', async () => {
      const ctx = op153();

      const result = await ctx.useCase.execute(ctx.input);

      expect(ctx.documentos.buscarPorId).toHaveBeenCalledWith(29, undefined);
      expect(ctx.documentos.buscarPorId).toHaveBeenCalledWith(443, undefined);
      expect(ctx.evaluarCorrespondencia.execute).not.toHaveBeenCalled();
      expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
      expect(result.documentoGrupoFactura?.grupoFacturaId).toBe(116);

      const creacion = ctx.grupoFacturaDocumentos.crear.mock.calls[0][0];
      expect(creacion.grupoFacturaId).toBe(116);
      expect(creacion.metadata.contexto.facturaDocumentoId).toBeNull();
    });

    it('R2-02 OP compatible por monto/moneda continúa por asociación ordinaria aunque proveedor no sea verificable', async () => {
      const ctx = op153();

      const result = await ctx.useCase.execute(ctx.input);

      expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
      expect(result.correspondencia).toBeUndefined();
      expect(ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas)
        .toHaveBeenCalledWith(116, undefined);
    });

    it('R2-03 OP con moneda incompatible exige decisión y no crea vínculo ordinario', async () => {
      const ctx = op153();
      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'USD',
            montoTotal: 100,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'ORDEN_PAGO',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DECISION_CORRESPONDENCIA_REQUERIDA',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-04 OP con pago mayor al monto exige decisión y protege sobrepago', async () => {
      const ctx = op153();
      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 110,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'ORDEN_PAGO',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DECISION_CORRESPONDENCIA_REQUERIDA',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-05 multipago OP usa saldo del mismo grupo 116', async () => {
      const ctx = op153();
      ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas
        .mockResolvedValue(60);

      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 40,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'ORDEN_PAGO',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await ctx.useCase.execute(ctx.input);

      expect(ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas)
        .toHaveBeenCalledWith(116, undefined);
      expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
      expect(ctx.grupoFacturaDocumentos.crear.mock.calls[0][0].grupoFacturaId)
        .toBe(116);
    });

    it('R2-06 multipago OP rechaza pago que excede saldo restante', async () => {
      const ctx = op153();
      ctx.grupoFacturaDocumentos.sumarMontoTransferenciasActivas
        .mockResolvedValue(60);

      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 50,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'ORDEN_PAGO',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DECISION_CORRESPONDENCIA_REQUERIDA',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-07 excepción existente puede autorizar incompatibilidad OP y audita facturaDocumentoId NULL', async () => {
      const ctx = buildUseCase({
        grupoFacturaId: 116,
        origenObligacion: 'ORDEN_PAGO',
        facturaDocumentoId: null,
        tipoPrincipal: 'ORDEN_PAGO',
        principalDocumentoId: 443,
        permiso: true,
        documentoOp: {
          id: 443,
          tipoDocumental: 'ORDEN_PAGO',
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          moneda: 'PEN',
          montoTotal: 100,
          metadata: {},
        },
        pago: {
          id: 29,
          tipoDocumental: 'TRANSFERENCIA',
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          moneda: 'USD',
          montoTotal: 100,
          metadata: {},
        },
      });

      const result = await ctx.useCase.execute({
        ...ctx.input,
        decisionCorrespondencia: {
          accion: 'AUTORIZAR_EXCEPCION',
          motivo: 'Excepción OP autorizada por responsable financiero.',
        },
      });

      expect(result.correspondencia?.estado).toBe('EXCEPCION_AUTORIZADA');
      expect(result.correspondencia?.facturaDocumentoId).toBeNull();
      expect(ctx.auditoria.registrarDecisionCorrespondencia)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            despues: expect.objectContaining({
              facturaDocumentoId: null,
              grupoFacturaId: 116,
              permisoExcepcionUtilizado: true,
              asociacionCreada: true,
            }),
          }),
          undefined,
        );
    });

    it('R2-08 rechaza grupo OP cuyo principal no es ORDEN_PAGO', async () => {
      const ctx = buildUseCase({
        grupoFacturaId: 116,
        origenObligacion: 'ORDEN_PAGO',
        facturaDocumentoId: null,
        tipoPrincipal: 'OC',
        principalDocumentoId: 443,
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-09 rechaza documento principal que no es ORDEN_PAGO', async () => {
      const ctx = op153();

      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'FACTURA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-10 rechaza documento principal OP de empresa ajena', async () => {
      const ctx = op153();

      ctx.documentos.buscarPorId.mockImplementation(async (id: number) => {
        if (id === 29) {
          return {
            id: 29,
            tipoDocumental: 'TRANSFERENCIA',
            clienteAbreviatura: 'BBTI',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        if (id === 443) {
          return {
            id: 443,
            tipoDocumental: 'ORDEN_PAGO',
            clienteAbreviatura: 'OTRA',
            estado: 'confirmado',
            moneda: 'PEN',
            montoTotal: 100,
            metadata: {},
          };
        }
        return null;
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-11 FACTURA con facturaDocumentoId NULL sigue rechazada', async () => {
      const ctx = buildUseCase({
        origenObligacion: 'FACTURA',
        facturaDocumentoId: null,
        tipoPrincipal: 'OC',
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.evaluarCorrespondencia.execute).not.toHaveBeenCalled();
      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('R2-12 scope de empresa del token sigue bloqueando OP antes de asociar', async () => {
      const ctx = op153();

      await expect(
        ctx.useCase.execute({
          ...ctx.input,
          usuario: {
            ...ctx.input.usuario,
            empresaCodigo: 'OTRA',
          },
        }),
      ).rejects.toBeDefined();

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
      expect(ctx.documentos.buscarPorId).not.toHaveBeenCalled();
    });
  });


  describe('R28 CUT2 - operación común de regularización OP', () => {
    const regularizadorOp = (
      tipoDocumental: 'FACTURA' | 'RECIBO_HONORARIO',
      tipoRelacion: 'regularizador_factura' | 'regularizador_recibo_honorario',
      options?: {
        origenObligacion?: 'FACTURA' | 'ORDEN_PAGO';
        facturaDocumentoId?: number | null;
        tipoPrincipal?: string;
        grupoFacturaId?: number;
        existente?: any;
      },
    ) => {
      const ctx = buildUseCase({
        grupoFacturaId: options?.grupoFacturaId ?? 116,
        origenObligacion: options?.origenObligacion ?? 'ORDEN_PAGO',
        facturaDocumentoId:
          options?.facturaDocumentoId !== undefined
            ? options.facturaDocumentoId
            : null,
        tipoPrincipal: options?.tipoPrincipal ?? 'ORDEN_PAGO',
        principalDocumentoId: 443,
        tipoDocumental,
        existente: options?.existente,
        documentoOp: {
          id: 443,
          tipoDocumental: 'ORDEN_PAGO',
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          rucEmisor: null,
          razonSocialEmisor: null,
          serie: null,
          numero: null,
          claveDocumental: null,
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          montoTotal: 100,
          nombreArchivo: 'OP-443',
          metadata: {},
        },
        pago: {
          id: 29,
          tipoDocumental,
          clienteAbreviatura: 'BBTI',
          estado: 'confirmado',
          rucEmisor: '201',
          razonSocialEmisor: 'Proveedor',
          serie: tipoDocumental === 'FACTURA' ? 'F001' : 'E001',
          numero: '29',
          claveDocumental:
            tipoDocumental === 'FACTURA'
              ? 'BBTI|FACTURA|201|F001|29'
              : 'BBTI|RECIBO_HONORARIO|201|E001|29',
          fechaEmision: '2026-09-15',
          moneda: 'PEN',
          montoTotal: 100,
          nombreArchivo:
            tipoDocumental === 'FACTURA'
              ? 'factura.pdf'
              : 'recibo-honorario.pdf',
          metadata: {},
        },
      });

      return {
        ...ctx,
        input: {
          ...ctx.input,
          tipoRelacion,
          operacionInterna: 'REGULARIZAR_OBLIGACION_OP' as const,
        },
      };
    };

    it('T-COMMON-01 REGULARIZAR_OBLIGACION_OP + FACTURA + regularizador_factura PASS', async () => {
      const ctx = regularizadorOp('FACTURA', 'regularizador_factura');

      const result = await ctx.useCase.execute(ctx.input);

      expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
      expect(result.idempotente).toBe(false);
      expect(
        ctx.grupoFacturaDocumentos.crear.mock.calls[0][0].tipoRelacion,
      ).toBe('regularizador_factura');
    });

    it('T-COMMON-02 REGULARIZAR_OBLIGACION_OP + RECIBO_HONORARIO + regularizador_recibo_honorario PASS', async () => {
      const ctx = regularizadorOp(
        'RECIBO_HONORARIO',
        'regularizador_recibo_honorario',
      );

      const result = await ctx.useCase.execute(ctx.input);

      expect(ctx.grupoFacturaDocumentos.crear).toHaveBeenCalledTimes(1);
      expect(result.idempotente).toBe(false);
      expect(
        ctx.grupoFacturaDocumentos.crear.mock.calls[0][0].tipoRelacion,
      ).toBe('regularizador_recibo_honorario');
    });

    it('T-COMMON-03 FACTURA + regularizador_recibo_honorario REJECT', async () => {
      const ctx = regularizadorOp(
        'FACTURA',
        'regularizador_recibo_honorario',
      );

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-04 RECIBO_HONORARIO + regularizador_factura REJECT', async () => {
      const ctx = regularizadorOp(
        'RECIBO_HONORARIO',
        'regularizador_factura',
      );

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-05 origen distinto de ORDEN_PAGO REJECT', async () => {
      const ctx = regularizadorOp('FACTURA', 'regularizador_factura', {
        origenObligacion: 'FACTURA',
        facturaDocumentoId: null,
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-06 principal distinto de ORDEN_PAGO REJECT', async () => {
      const ctx = regularizadorOp('FACTURA', 'regularizador_factura', {
        tipoPrincipal: 'OC',
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-07 facturaDocumentoId != NULL REJECT', async () => {
      const ctx = regularizadorOp('FACTURA', 'regularizador_factura', {
        facturaDocumentoId: 26,
      });

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GRUPO_FACTURA_NO_PERSISTIDO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-08 replay misma asociación IDEMPOTENT', async () => {
      const existente = {
        id: 80,
        grupoFacturaId: 116,
        documentoId: 29,
        tipoRelacion: 'regularizador_recibo_honorario',
        estado: 'activo',
        metadata: {},
      };

      const ctx = regularizadorOp(
        'RECIBO_HONORARIO',
        'regularizador_recibo_honorario',
        { existente },
      );

      const result = await ctx.useCase.execute(ctx.input);

      expect(result.idempotente).toBe(true);
      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-09 mismo documento con relación incompatible CONFLICT', async () => {
      const existente = {
        id: 80,
        grupoFacturaId: 116,
        documentoId: 29,
        tipoRelacion: 'regularizador_factura',
        estado: 'activo',
        metadata: {},
      };

      const ctx = regularizadorOp(
        'RECIBO_HONORARIO',
        'regularizador_recibo_honorario',
        { existente },
      );

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });

    it('T-COMMON-10 mismo documento en otro grupo CONFLICT', async () => {
      const existente = {
        id: 80,
        grupoFacturaId: 117,
        documentoId: 29,
        tipoRelacion: 'regularizador_recibo_honorario',
        estado: 'activo',
        metadata: {},
      };

      const ctx = regularizadorOp(
        'RECIBO_HONORARIO',
        'regularizador_recibo_honorario',
        { existente },
      );

      await expect(ctx.useCase.execute(ctx.input)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO',
        }),
      });

      expect(ctx.grupoFacturaDocumentos.crear).not.toHaveBeenCalled();
    });
  });

});
