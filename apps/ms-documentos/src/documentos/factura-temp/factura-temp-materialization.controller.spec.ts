jest.mock('@documental/database', () => ({
  sql: {},
}));

jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    OcrProcesarArchivo: 'ocr.procesar-archivo',
  },
}));

import { FacturaTempMaterializationController } from './factura-temp-materialization.controller';

describe('R26-D2 FACTURA TEMP materialization controller', () => {
  const headers = {
    'x-user-id': '6',
    'x-workspace-id': '12',
    'x-empresa-codigo': 'BBTI',
    'x-cliente-destino-id': '2',
    'x-request-id': 'req-d2',
    'x-correlation-id': 'corr-d2',
    'idempotency-key': 'idem-d2',
  };

  const metadata = {
    fechaEmision: '2026-09-20',
    serie: 'F001',
    numero: '123',
    rucProveedor: '20123456789',
    proveedor: 'PROVEEDOR VALIDADO SAC',
    montoTotal: 150.5,
  };

  it('materializa usando tempId, identidad autenticada e idempotency de headers', async () => {
    const materializar = jest.fn().mockResolvedValue({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
    });

    const controller =
      new FacturaTempMaterializationController({
        materializar,
      } as any);

    const result = await controller.materializarFacturaOp(
      headers,
      '50',
      { metadata },
    );

    expect(materializar).toHaveBeenCalledTimes(1);
    expect(materializar).toHaveBeenCalledWith(
      50,
      'idem-d2',
      {
        id: 6,
        workspaceId: 12,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        requestId: 'req-d2',
        correlationId: 'corr-d2',
      },
      metadata,
    );

    expect(result).toEqual({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
    });
  });

  it('no toma identidad estructural desde metadata del body', async () => {
    const materializar = jest.fn().mockResolvedValue({
      tempId: 50,
      documentoId: 700,
      archivoId: 701,
    });

    const controller =
      new FacturaTempMaterializationController({
        materializar,
      } as any);

    const metadataConCamposNoAutoritativos = {
      ...metadata,
      workspaceId: 999,
      empresaCodigo: 'OTRA',
      clienteDestinoId: 999,
      actorId: 999,
    };

    await controller.materializarFacturaOp(
      headers,
      '50',
      { metadata: metadataConCamposNoAutoritativos },
    );

    expect(materializar).toHaveBeenCalledWith(
      50,
      'idem-d2',
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
