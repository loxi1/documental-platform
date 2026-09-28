import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('@documental/database', () => ({
  sql: {
    begin: jest.fn(async (fn: any) => fn({ tx: true })),
  },
}));

import { RegularizarObligacionOpReciboHonorarioUseCase } from './regularizar-obligacion-op-recibo-honorario.usecase';

describe('RegularizarObligacionOpReciboHonorarioUseCase', () => {
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
      id: 902,
      grupoFacturaId: 116,
      documentoId: 701,
      tipoRelacion: 'regularizador_recibo_honorario',
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
    new RegularizarObligacionOpReciboHonorarioUseCase(
      snapshots as any,
      regularizadores as any,
      relaciones as any,
      asociarDocumentoGrupo as any,
      auditoria as any,
    );

  const input = () => ({
    grupoFacturaId: 116,
    documentoId: 701,
    usuario,
  });

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

  it('RH-01 snapshot permite RECIBO_HONORARIO y regulariza PENDIENTE', async () => {
    await expect(crear().execute(input())).resolves.toEqual({
      grupoFacturaId: 116,
      documentoId: 701,
      tipoRelacion: 'regularizador_recibo_honorario',
      estadoRegularizacion: 'REGULARIZADO',
      idempotente: false,
    });

    expect(regularizadores.permiteTipoDocumental).toHaveBeenCalledWith(
      116,
      'RECIBO_HONORARIO',
      tx,
    );

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      {
        grupoFacturaId: 116,
        documentoId: 701,
        tipoRelacion: 'regularizador_recibo_honorario',
        operacionInterna: 'REGULARIZAR_OBLIGACION_OP',
        usuario,
      },
      tx,
    );
  });

  it('RH-02 snapshot no permite RECIBO_HONORARIO y rechaza antes de asociar', async () => {
    regularizadores.permiteTipoDocumental.mockResolvedValueOnce(false);

    await expect(crear().execute(input())).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'TIPO_DOCUMENTAL_REGULARIZADOR_NO_PERMITIDO',
        tipoDocumental: 'RECIBO_HONORARIO',
      }),
    });

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-03 PENDIENTE transiciona a REGULARIZADO en la misma operación', async () => {
    await crear().execute(input());

    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).toHaveBeenCalledWith(116, tx);
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).toHaveBeenCalledTimes(1);
  });

  it('RH-04 NO_REQUIERE rechaza antes de asociación, transición y auditoría', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: false,
      estadoRegularizacion: 'NO_REQUIERE',
    });

    await expect(crear().execute(input())).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-05 REGULARIZADO con el mismo RH es replay idempotente', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'REGULARIZADO',
    });

    relaciones.buscarActivoPorGrupoDocumentoRelacion.mockResolvedValue({
      id: 902,
      grupoFacturaId: 116,
      documentoId: 701,
      tipoRelacion: 'regularizador_recibo_honorario',
      estado: 'activo',
    });

    await expect(crear().execute(input())).resolves.toEqual({
      grupoFacturaId: 116,
      documentoId: 701,
      tipoRelacion: 'regularizador_recibo_honorario',
      estadoRegularizacion: 'REGULARIZADO',
      idempotente: true,
    });

    expect(
      relaciones.buscarActivoPorGrupoDocumentoRelacion,
    ).toHaveBeenCalledWith(
      {
        grupoFacturaId: 116,
        documentoId: 701,
        tipoRelacion: 'regularizador_recibo_honorario',
      },
      tx,
    );

    expect(regularizadores.permiteTipoDocumental).not.toHaveBeenCalled();
    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-06 REGULARIZADO con otro regularizador rechaza nueva regularización ordinaria', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'REGULARIZADO',
    });

    relaciones.buscarActivoPorGrupoDocumentoRelacion.mockResolvedValue(null);

    await expect(
      crear().execute({
        grupoFacturaId: 116,
        documentoId: 702,
        usuario,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OBLIGACION_YA_REGULARIZADA_CON_OTRO_DOCUMENTO',
      }),
    });

    expect(regularizadores.permiteTipoDocumental).not.toHaveBeenCalled();
    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
  });

  it('RH-07 snapshot inexistente rechaza sin efectos', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue(null);

    await expect(crear().execute(input())).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-08 asociación fallida no transiciona ni audita', async () => {
    asociarDocumentoGrupo.execute.mockRejectedValue(
      new ConflictException('asociacion fallida'),
    );

    await expect(crear().execute(input())).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-09 asociación no persistida bloquea transición', async () => {
    asociarDocumentoGrupo.execute.mockResolvedValue({
      documentoGrupoFactura: null,
      idempotente: false,
      workspaceDebeRefrescar: false,
    });

    await expect(crear().execute(input())).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REGULARIZACION_OP_ASOCIACION_NO_PERSISTIDA',
      }),
    });

    expect(
      snapshots.marcarRegularizadoDesdePendiente,
    ).not.toHaveBeenCalled();
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-10 CAS concurrente aborta antes de auditoría', async () => {
    snapshots.marcarRegularizadoDesdePendiente.mockResolvedValue(false);

    await expect(crear().execute(input())).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REGULARIZACION_OP_TRANSICION_CONCURRENTE',
      }),
    });

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarRegularizacion).not.toHaveBeenCalled();
  });

  it('RH-11 preserva grupo/documento, no introduce pagos y audita RH correctamente', async () => {
    await crear().execute(input());

    expect(Object.keys(snapshots)).toEqual([
      'obtenerRegularizacionPorGrupoFacturaId',
      'marcarRegularizadoDesdePendiente',
    ]);

    expect(asociarDocumentoGrupo.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 116,
        documentoId: 701,
        tipoRelacion: 'regularizador_recibo_honorario',
        operacionInterna: 'REGULARIZAR_OBLIGACION_OP',
      }),
      tx,
    );

    expect(auditoria.registrarRegularizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'REGULARIZAR_OP',
        entidad: 'obligacion_snapshot',
        entidadId: 116,
        empresaCodigo: 'BBTI',
        usuario,
        antes: {
          grupoFacturaId: 116,
          estadoRegularizacion: 'PENDIENTE',
        },
        despues: expect.objectContaining({
          grupoFacturaId: 116,
          documentoRegularizadorId: 701,
          grupoFacturaDocumentoId: 902,
          tipoDocumentoRegularizador: 'RECIBO_HONORARIO',
          tipoRelacion: 'regularizador_recibo_honorario',
          estadoRegularizacion: 'REGULARIZADO',
        }),
      }),
      tx,
    );
  });

  it('RH-12 no acepta un estado distinto de PENDIENTE/REGULARIZADO', async () => {
    snapshots.obtenerRegularizacionPorGrupoFacturaId.mockResolvedValue({
      grupoFacturaId: 116,
      requiereRegularizacionAplicada: true,
      estadoRegularizacion: 'DESCONOCIDO',
    });

    await expect(crear().execute(input())).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OBLIGACION_NO_PENDIENTE_REGULARIZACION',
      }),
    });

    expect(asociarDocumentoGrupo.execute).not.toHaveBeenCalled();
  });
});
