import { BadRequestException, ConflictException } from '@nestjs/common';
import { sql } from '@documental/database';

import { OrquestarConfirmacionDocumentalV2UseCase } from './orquestar-confirmacion-documental-v2.usecase';

jest.mock('@documental/database', () => ({
  sql: {
    begin: jest.fn(),
  },
}));

type ConfirmadoOptions = {
  documentoId?: number;
  documentoBaseId?: number;
  tipoDocumental?: string;
  tipoRelacion?: string;
  esPrincipal?: boolean;
};

function confirmado(options: ConfirmadoOptions = {}) {
  const documentoId = options.documentoId ?? 100;

  return {
    id: 900,
    estado: 'confirmado',
    documento: { id: documentoId },
    documentoBaseId: options.documentoBaseId,
    tipoDocumental: options.tipoDocumental ?? 'GUIA_REMISION',
    tipoRelacion: options.tipoRelacion ?? 'adjunto_guia',
    expediente: {
      id: 15,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    },
    vinculo: {
      es_principal: options.esPrincipal ?? false,
      orden: options.esPrincipal ? 1 : 10,
    },
    ocrResultado: {
      id: 900,
      archivo_id: 700,
    },
  };
}

async function expectExceptionCode(
  promise: Promise<unknown>,
  exceptionType: typeof BadRequestException | typeof ConflictException,
  code: string,
) {
  try {
    await promise;
    throw new Error(`Se esperaba la excepción ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(exceptionType);
    expect((error as any).getResponse()).toMatchObject({ code });
  }
}

describe('OrquestarConfirmacionDocumentalV2UseCase', () => {
  const tx = Object.assign(jest.fn(), { unsafe: jest.fn() });

  const documentosLegacy = {
    confirmarOcrResultadoConExpedienteConExecutor: jest.fn(),
    consumirValidacionPendientePagoConExecutor: jest.fn(),
  };
  const documentosV2 = {
    buscarPorId: jest.fn(),
  };
  const gruposFactura = {
    listarPorDocumentoOperativoPrincipal: jest.fn(),
  };
  const materializarContexto = {
    execute: jest.fn(),
  };
  const asociarPrincipal = {
    execute: jest.fn(),
  };
  const asociarGrupoFactura = {
    execute: jest.fn(),
  };
  const asociarDocumentoGrupo = {
    execute: jest.fn(),
  };

  let useCase: OrquestarConfirmacionDocumentalV2UseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    (sql.begin as unknown as jest.Mock).mockImplementation(
      async (callback: (executor: any) => Promise<unknown>) => callback(tx),
    );

    documentosV2.buscarPorId.mockResolvedValue({
      id: 46,
      tipoDocumental: 'OC',
    });
    materializarContexto.execute.mockResolvedValue({
      contenedorOperativo: { id: 501 },
    });
    asociarPrincipal.execute.mockResolvedValue({
      documentoOperativoPrincipal: { id: 601, documentoId: 46 },
    });
    asociarGrupoFactura.execute.mockResolvedValue({
      grupoFactura: { id: 701, facturaDocumentoId: 100 },
      idempotente: false,
    });
    asociarDocumentoGrupo.execute.mockResolvedValue({
      documentoGrupoFactura: { id: 801, grupoFacturaId: 701 },
      idempotente: false,
    });
    gruposFactura.listarPorDocumentoOperativoPrincipal.mockResolvedValue([
      { id: 701, estado: 'pendiente_revision' },
    ]);

    useCase = new OrquestarConfirmacionDocumentalV2UseCase(
      documentosLegacy as any,
      documentosV2 as any,
      gruposFactura as any,
      materializarContexto as any,
      asociarPrincipal as any,
      asociarGrupoFactura as any,
      asociarDocumentoGrupo as any,
    );
  });

  it('usa un solo executor para V1, contexto, principal y factura fundadora', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({
        documentoId: 110,
        documentoBaseId: 46,
        tipoDocumental: 'FACTURA',
        tipoRelacion: 'adjunto_factura',
      }),
    );

    const result = await useCase.execute(900, {
      expedienteId: 15,
      documentoBaseId: 46,
      tipoRelacion: 'adjunto_factura',
    });

    expect(sql.begin).toHaveBeenCalledTimes(1);
    expect(documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor)
      .toHaveBeenCalledWith(tx, 900, expect.any(Object), undefined);
    expect(materializarContexto.execute).toHaveBeenCalledWith(expect.any(Object), tx);
    expect(asociarPrincipal.execute).toHaveBeenCalledWith(expect.any(Object), tx);
    expect(asociarGrupoFactura.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        documentoOperativoPrincipalId: 601,
        facturaDocumentoId: 110,
      }),
      tx,
    );
    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect((result as any).documentalV2.grupoFactura.id).toBe(701);
  });

  it.each(['OC', 'OS'])('materializa un principal operativo %s usando el propio documento', async (tipo) => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({
        documentoId: 46,
        tipoDocumental: tipo,
        tipoRelacion: tipo === 'OC' ? 'principal_oc' : 'principal_os',
        esPrincipal: true,
      }),
    );
    documentosV2.buscarPorId.mockResolvedValue({ id: 46, tipoDocumental: tipo });

    await useCase.execute(900, {
      expedienteId: 15,
      tipoRelacion: tipo === 'OC' ? 'principal_oc' : 'principal_os',
      esPrincipal: true,
    });

    expect(documentosV2.buscarPorId).toHaveBeenCalledWith(46, tx);
    expect(asociarPrincipal.execute).toHaveBeenCalledWith(
      expect.objectContaining({ documentoId: 46, tipoPrincipal: tipo }),
      tx,
    );
    expect(asociarGrupoFactura.execute).not.toHaveBeenCalled();
    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
  });

  it('mantiene principal_factura legacy fuera de V2 y no materializa contexto', async () => {
    const resultadoLegacy = confirmado({
      documentoId: 120,
      tipoDocumental: 'FACTURA',
      tipoRelacion: 'principal_factura',
      esPrincipal: true,
    });
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      resultadoLegacy,
    );

    const result = await useCase.execute(900, {
      expedienteId: 15,
      tipoRelacion: 'principal_factura',
      esPrincipal: true,
    });

    expect(result).toEqual({ ...resultadoLegacy, documentalV2: null });
    expect(materializarContexto.execute).not.toHaveBeenCalled();
    expect(documentosV2.buscarPorId).not.toHaveBeenCalled();
    expect(asociarPrincipal.execute).not.toHaveBeenCalled();
  });

  it('rechaza adjunto cuando el principal no tiene grupos activos', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );
    gruposFactura.listarPorDocumentoOperativoPrincipal.mockResolvedValue([]);

    await expectExceptionCode(
      useCase.execute(900, {
        expedienteId: 15,
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_guia',
      }),
      ConflictException,
      'GRUPO_FACTURA_REQUERIDO',
    );

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
  });

  it('autoselecciona el único grupo activo', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );
    gruposFactura.listarPorDocumentoOperativoPrincipal.mockResolvedValue([
      { id: 701, estado: 'pendiente_revision' },
      { id: 702, estado: 'anulado' },
    ]);

    await useCase.execute(900, {
      expedienteId: 15,
      documentoBaseId: 46,
      tipoRelacion: 'adjunto_guia',
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      expect.objectContaining({ grupoFacturaId: 701, tipoRelacion: 'adjunto_guia' }),
      tx,
    );
  });

  it('rechaza N grupos activos cuando falta grupoFacturaId', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );
    gruposFactura.listarPorDocumentoOperativoPrincipal.mockResolvedValue([
      { id: 701, estado: 'pendiente_revision' },
      { id: 703, estado: 'confirmado' },
    ]);

    await expectExceptionCode(
      useCase.execute(900, {
        expedienteId: 15,
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_guia',
      }),
      ConflictException,
      'GRUPO_FACTURA_AMBIGUO',
    );
  });

  it('valida grupoFacturaId incluso cuando existe un solo grupo activo', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );

    await expectExceptionCode(
      useCase.execute(900, {
        expedienteId: 15,
        documentoBaseId: 46,
        grupoFacturaId: 999,
        tipoRelacion: 'adjunto_guia',
      }),
      ConflictException,
      'GRUPO_FACTURA_NO_PERTENECE_AL_PRINCIPAL',
    );
  });

  it.each([
    ['adjunto_guia', 'GUIA_REMISION'],
    ['adjunto_nota_ingreso', 'NOTA_INGRESO'],
    ['adjunto_detraccion', 'DETRACCION'],
  ])('propaga %s sin inventar decisión financiera', async (tipoRelacion, tipoDocumental) => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46, tipoRelacion, tipoDocumental }),
    );

    await useCase.execute(900, {
      expedienteId: 15,
      documentoBaseId: 46,
      tipoRelacion,
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      expect.not.objectContaining({ decisionCorrespondencia: expect.anything() }),
      tx,
    );
  });

  it.each(['ACEPTAR', 'OBSERVAR', 'AUTORIZAR_EXCEPCION'] as const)(
    'propaga la decisión financiera %s sin reinterpretación',
    async (accion) => {
      documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
        confirmado({
          documentoBaseId: 46,
          tipoRelacion: 'adjunto_transferencia',
          tipoDocumental: 'TRANSFERENCIA',
        }),
      );

      await useCase.execute(
        900,
        {
          expedienteId: 15,
          documentoBaseId: 46,
          tipoRelacion: 'adjunto_transferencia',
          decisionCorrespondencia: { accion, motivo: 'Decisión de prueba' },
        },
        {
          usuarioId: 99,
          tienePermisoAutorizarExcepcion: accion === 'AUTORIZAR_EXCEPCION',
        },
      );

      expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          decisionCorrespondencia: {
            accion,
            motivo: 'Decisión de prueba',
          },
          usuario: expect.objectContaining({
            tienePermisoAutorizarExcepcion: accion === 'AUTORIZAR_EXCEPCION',
          }),
        }),
        tx,
      );
    },
  );

  it('no incorpora el permiso desde el input documental', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_transferencia',
        tipoDocumental: 'TRANSFERENCIA',
      }),
    );

    await useCase.execute(
      900,
      {
        expedienteId: 15,
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_transferencia',
        decisionCorrespondencia: {
          accion: 'AUTORIZAR_EXCEPCION',
          motivo: 'Prueba',
        },
        tienePermisoAutorizarExcepcion: true,
      } as any,
      { tienePermisoAutorizarExcepcion: false },
    );

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario: expect.objectContaining({
          tienePermisoAutorizarExcepcion: false,
        }),
      }),
      tx,
    );
  });

  it('no continúa cuando V1 falla', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockRejectedValue(
      new Error('fallo V1'),
    );

    await expect(
      useCase.execute(900, { expedienteId: 15, tipoRelacion: 'adjunto_guia' }),
    ).rejects.toThrow('fallo V1');

    expect(materializarContexto.execute).not.toHaveBeenCalled();
  });

  it('propaga el fallo de materialización y no asocia principal ni grupo', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );
    materializarContexto.execute.mockRejectedValue(new Error('fallo V2 contexto'));

    await expect(
      useCase.execute(900, {
        expedienteId: 15,
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_guia',
      }),
    ).rejects.toThrow('fallo V2 contexto');

    expect(asociarPrincipal.execute).not.toHaveBeenCalled();
    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
  });

  it('propaga el fallo de asociación dentro del mismo begin', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: 46 }),
    );
    asociarDocumentoGrupo.execute.mockRejectedValue(new Error('fallo asociación V2'));

    await expect(
      useCase.execute(900, {
        expedienteId: 15,
        documentoBaseId: 46,
        tipoRelacion: 'adjunto_guia',
      }),
    ).rejects.toThrow('fallo asociación V2');

    expect(sql.begin).toHaveBeenCalledTimes(1);
  });

  it('rechaza documento base ausente antes de asociar principal', async () => {
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue(
      confirmado({ documentoBaseId: undefined }),
    );

    await expectExceptionCode(
      useCase.execute(900, {
        expedienteId: 15,
        tipoRelacion: 'adjunto_guia',
      }),
      BadRequestException,
      'DOCUMENTO_BASE_REQUERIDO',
    );

    expect(documentosV2.buscarPorId).not.toHaveBeenCalled();
    expect(asociarPrincipal.execute).not.toHaveBeenCalled();
  });
});
