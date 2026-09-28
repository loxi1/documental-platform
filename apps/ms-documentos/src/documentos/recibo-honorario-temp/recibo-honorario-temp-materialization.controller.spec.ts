jest.mock('@documental/database', () => ({
  sql: {},
}));

jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    OcrProcesarArchivo: 'ocr.procesar-archivo',
  },
}));

import { ReciboHonorarioTempMaterializationController } from './recibo-honorario-temp-materialization.controller';

describe('R28-P4-P6 RECIBO_HONORARIO TEMP materialization controller', () => {
  const headers = {
    'x-user-id': '6',
    'x-workspace-id': '12',
    'x-empresa-codigo': 'BBTI',
    'x-cliente-destino-id': '2',
    'x-request-id': 'req-rh',
    'x-correlation-id': 'corr-rh',
    'idempotency-key': 'idem-rh',
  };

  const metadata = {
    fechaEmision: '2026-09-20',
    serie: 'E001',
    numero: '123',
    rucEmisor: '20123456789',
    razonSocialEmisor: 'PROFESIONAL VALIDADO',
    moneda: 'PEN',
    montoTotal: 150.5,
  };

  it('materializa RH usando tempId, identidad autenticada e idempotency de headers', async () => {
    const materializar = jest.fn().mockResolvedValue({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
      tipoDocumental: 'RECIBO_HONORARIO',
    });

    const controller =
      new ReciboHonorarioTempMaterializationController({
        materializar,
      } as any);

    const result =
      await controller.materializarReciboHonorarioOp(
        headers,
        '50',
        { metadata },
      );

    expect(materializar).toHaveBeenCalledTimes(1);
    expect(materializar).toHaveBeenCalledWith(
      50,
      'idem-rh',
      {
        id: 6,
        workspaceId: 12,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-rh',
        correlationId: 'corr-rh',
      },
      metadata,
    );

    expect(result).toEqual({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
      tipoDocumental: 'RECIBO_HONORARIO',
    });
  });

  it('no toma identidad estructural desde metadata humana del body', async () => {
    const materializar = jest.fn().mockResolvedValue({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
    });

    const controller =
      new ReciboHonorarioTempMaterializationController({
        materializar,
      } as any);

    const metadataConCamposNoAutoritativos = {
      ...metadata,
      workspaceId: 999,
      empresaCodigo: 'OTRA',
      clienteDestinoId: 999,
      actorId: 999,
    };

    await controller.materializarReciboHonorarioOp(
      headers,
      '50',
      { metadata: metadataConCamposNoAutoritativos },
    );

    expect(materializar).toHaveBeenCalledWith(
      50,
      'idem-rh',
      expect.objectContaining({
        id: 6,
        workspaceId: 12,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      }),
      metadataConCamposNoAutoritativos,
    );
  });
});
