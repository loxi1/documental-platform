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
}) {
  const contenedores = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 10,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    }),
  };
  const principales = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 20,
      contenedorOperativoId: 10,
    }),
  };
  const gruposFactura = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 4,
      documentoOperativoPrincipalId: 20,
      facturaDocumentoId: 26,
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
    grupoFacturaId: 4,
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
  };
  const documentos = {
    buscarPorId: jest.fn().mockResolvedValue({
      id: 29,
      tipoDocumental: options?.tipoDocumental ?? 'TRANSFERENCIA',
      clienteAbreviatura: 'BBTI',
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
    grupoFacturaId: 4,
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
});
