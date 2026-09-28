import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('@documental/database', () => ({
  sql: {
    begin: jest.fn(async (fn: any) => fn({ tx: true })),
  },
}));

import { RegularizarObligacionOpFacturaUseCase } from './regularizar-obligacion-op-factura.usecase';

describe('RegularizarObligacionOpFacturaUseCase', () => {
  const tx = expect.anything();

  const usuario = {
    id: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: '11111111-1111-1111-1111-111111111111',
    correlationId: '22222222-2222-2222-2222-222222222222',
  };

  const snapshotPendiente = {
    grupoFacturaId: 116,
    requiereRegularizacionAplicada: true,
    estadoRegularizacion: 'PENDIENTE' as const,
  };

  const asociacion = {
    documentoGrupoFactura: {
      id: 901,
      grupoFacturaId: 116,
      documentoId: 700,
      tipoRelacion: 'regularizador_factura',
      estado: 'activo',
    },
    idempotente: false,
    workspaceDebeRefrescar: true,
  };

  const snapshots = {
    obtenerRegularizacionPorGrupoFacturaId: jest.fn(),
    marcarRegularizadoDesdePendiente: jest.fn(),
  };

  const regularizadores = {
    permiteTipoDocumental: jest.fn(),
  };

  const relaciones = {
    buscarActivoPorGrupoDocumentoRelacion: jest.fn(),
  };

  const asociarDocumentoGrupo = {
    execute: jest.fn(),
  };

  const auditoria = {
    registrarRegularizacion: jest.fn(),
  };

  const crear = () =>
    new RegularizarObligacionOpFacturaUseCase(
      snapshots as any,
      regularizadores as any,
      relaciones as any,
      asociarDocumentoGrupo as any,
      auditoria as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue(
      snapshotPendiente,
    );
    snapshots.marcarRegularizadoDesdePendiente.mockResolvedValue(true);
    regularizadores.permiteTipoDocumental.mockResolvedValue(true);
    relaciones.buscarActivoPorGrupoDocumentoRelacion.mockResolvedValue(null);
    asociarDocumentoGrupo.execute.mockResolvedValue(asociacion);
    auditoria.registrarRegularizacion.mockResolvedValue(undefined);
  });

  it('T1 regulariza una obligación OP pendiente mediante FACTURA', async () => {
    const result = await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(result).toEqual({
      grupoFacturaId: 116,
      documentoId: 700,
      tipoRelacion: 'regularizador_factura',
      estadoRegularizacion: 'REGULARIZADO',
      idempotente: false,
    });
  });

  it('T2 asocia la FACTURA al mismo grupo con relación específica', async () => {
    await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 116,
        documentoId: 700,
        tipoRelacion: 'regularizador_factura',
        operacionInterna: 'REGULARIZAR_OBLIGACION_OP',
        usuario,
      }),
      tx,
    );
  });

  it('T3/T4 delega al writer las guardas de origen OP, principal OP y facturaDocumentoId NULL', async () => {
    await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledTimes(1);
  });

  it('T5 no toca pagos', async () => {
    await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(Object.keys(snapshots)).toEqual([
      'obtenerRegularizacionPorGrupoFacturaId',
      'marcarRegularizadoDesdePendiente',
    ]);
  });

  it('T6 rechaza NO_REQUIERE antes de asociar', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
    });

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T7 rechaza snapshot inexistente', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue(null);

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
  });

  it('T7b exige FACTURA congelada para una nueva regularización', async () => {
    regularizadores.permiteTipoDocumental.mockResolvedValueOnce(false);

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'TIPO_DOCUMENTAL_REGULARIZADOR_NO_PERMITIDO',
        tipoDocumental: 'FACTURA',
      }),
    });

    expect(
      regularizadores.permiteTipoDocumental,
    ).toHaveBeenCalledWith(
      116,
      'FACTURA',
      tx,
    );

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T7c FACTURA congelada habilita el writer de regularización', async () => {
    regularizadores.permiteTipoDocumental.mockResolvedValueOnce(true);

    await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(
      regularizadores.permiteTipoDocumental,
    ).toHaveBeenCalledWith(
      116,
      'FACTURA',
      tx,
    );

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledTimes(1);
  });

  it('T8 si falla la asociación no intenta transición ni auditoría', async () => {
    asociarDocumentoGrupo.execute.mockRejectedValue(
      new ConflictException('asociacion fallida'),
    );

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T9 si falla el CAS después de asociar aborta antes de auditoría', async () => {
    snapshots.marcarRegularizadoDesdePendiente.mockResolvedValue(false);

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REGULARIZACION_OP_TRANSICION_CONCURRENTE',
      }),
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T10 asociación nula no permite transición', async () => {
    asociarDocumentoGrupo.execute.mockResolvedValue({
      documentoGrupoFactura: null,
      idempotente: false,
      workspaceDebeRefrescar: false,
    });

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REGULARIZACION_OP_ASOCIACION_NO_PERSISTIDA',
      }),
    });

    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T11 replay exacto de la misma FACTURA es idempotente y no reescribe', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'REGULARIZADO',
    });

    relaciones.buscarActivoPorGrupoDocumentoRelacion.mockResolvedValue({
      id: 901,
      grupoFacturaId: 116,
      documentoId: 700,
      tipoRelacion: 'regularizador_factura',
      estado: 'activo',
    });

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 700,
        usuario,
      }),
    ).resolves.toEqual({
      grupoFacturaId: 116,
      documentoId: 700,
      tipoRelacion: 'regularizador_factura',
      estadoRegularizacion: 'REGULARIZADO',
      idempotente: true,
    });

    expect(
      relaciones.buscarActivoPorGrupoDocumentoRelacion,
    ).toHaveBeenCalledWith(
      {
        grupoFacturaId: 116,
        documentoId: 700,
        tipoRelacion: 'regularizador_factura',
      },
      tx,
    );

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
    expect(
      regularizadores.permiteTipoDocumental,
    ).not.toHaveBeenCalled();
  });

  it('T11b rechaza una FACTURA distinta cuando la obligación ya está regularizada', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'REGULARIZADO',
    });

    relaciones.buscarActivoPorGrupoDocumentoRelacion.mockResolvedValue(null);

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 701,
        usuario,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OBLIGACION_YA_REGULARIZADA_CON_OTRO_DOCUMENTO',
      }),
    });

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('T12 audita actor, obligación, documento, relación y transición', async () => {
    await crear().execute({
      grupoFacturaId: 116,
      documentoId: 700,
      usuario,
    });

    expect(auditoria.registrarRegularizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'REGULARIZAR_OP',
        entidad: 'obligacion_snapshot',
        entidadId: 116,
        usuario,
        antes: {
          grupoFacturaId: 116,
          estadoRegularizacion: 'PENDIENTE',
        },
        despues: expect.objectContaining({
          grupoFacturaId: 116,
          documentoRegularizadorId: 700,
          grupoFacturaDocumentoId: 901,
          tipoDocumentoRegularizador: 'FACTURA',
          tipoRelacion: 'regularizador_factura',
          estadoRegularizacion: 'REGULARIZADO',
        }),
      }),
      tx,
    );
  });
});
