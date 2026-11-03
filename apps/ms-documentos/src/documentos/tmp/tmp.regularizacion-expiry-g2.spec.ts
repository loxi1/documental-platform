jest.mock('@documental/shared', () => ({
  NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' },
}));
jest.mock('@documental/database', () => ({ sql: {} }));

import { TmpService } from './tmp.service';

describe('G2 recuperación TEMP regularización OP después de 24 horas', () => {
  const actor = {
    actorId: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    idempotencyKey: 'g2-recovery',
    requestId: '11111111-1111-4111-8111-111111111111',
    correlationId: 'g2-recovery',
  } as any;

  function fixture(
    tipo: 'FACTURA' | 'RECIBO_HONORARIO',
    options: {
      ordenPagoId?: number;
      consumer?: string;
      estado?: string;
      promovida_en?: Date | null;
      exists?: boolean;
    } = {},
  ) {
    const row = {
      id: 50,
      operacion_tipo: 'tmp',
      actor_id: actor.actorId,
      workspace_id: actor.workspaceId,
      empresa_codigo: actor.empresaCodigo,
      cliente_destino_id: actor.clienteDestinoId,
      estado: options.estado ?? 'almacenada',
      promovida_en: options.promovida_en ?? null,
      storage_provider: 'r2',
      storage_bucket: 'fixture-only',
      storage_key: 'documentos/tmp/12/50',
      nombre_archivo_original: 'comprobante.pdf',
      content_type: 'application/pdf',
      expira_en: new Date(Date.now() - 48 * 60 * 60 * 1000),
      metadata: {
        regularizacionOp: {
          consumer: options.consumer ?? 'REGULARIZACION_OP',
          ordenPagoId: options.ordenPagoId ?? 31,
          tipoRegularizador: tipo,
        },
      },
    };

    const repo = {
      locked: jest.fn(async (_key: string, work: any) => work({})),
      findRegularizacionOp: jest.fn(
        async (_c: any, identity: any, opId: number, requestedType: string) => {
          // Simula los filtros de pertenencia y contexto del SQL real.
          if (
            identity.actorId !== row.actor_id ||
            identity.workspaceId !== row.workspace_id ||
            identity.empresaCodigo !== row.empresa_codigo ||
            identity.clienteDestinoId !== row.cliente_destino_id ||
            opId !== row.metadata.regularizacionOp.ordenPagoId ||
            requestedType !== row.metadata.regularizacionOp.tipoRegularizador ||
            row.metadata.regularizacionOp.consumer !== 'REGULARIZACION_OP'
          ) {
            return null;
          }
          return row;
        },
      ),
    };

    const storage = {
      statObject: jest.fn().mockResolvedValue({
        exists: options.exists ?? true,
      }),
    };

    const preview = {
      getTempPreviewUrl: jest.fn().mockResolvedValue({
        tempId: 50,
        signedUrl: 'http://preview.local/comprobante.pdf',
      }),
    };

    const service = new TmpService(
      repo as any,
      { get: jest.fn() } as any,
      storage as any,
      { send: jest.fn() } as any,
      preview as any,
    );

    return { service, repo, storage, preview };
  }

  it.each(['FACTURA', 'RECIBO_HONORARIO'] as const)(
    'recupera %s vencido hace 48 horas con OP coincidente',
    async tipo => {
      const { service, storage, preview } = fixture(tipo);

      const result = await service.recoverRegularizacionOp(actor, 31, tipo);

      expect(result).toEqual(
        expect.objectContaining({
          tempId: 50,
          disponible: true,
          tipoRegularizador: tipo,
        }),
      );
      expect(storage.statObject).toHaveBeenCalledTimes(1);
      expect(preview.getTempPreviewUrl).toHaveBeenCalledTimes(1);
    },
  );

  it('OP incorrecta no recupera el TEMP', async () => {
    const { service, storage } = fixture('FACTURA');

    await expect(
      service.recoverRegularizacionOp(actor, 32, 'FACTURA'),
    ).resolves.toBeNull();

    expect(storage.statObject).not.toHaveBeenCalled();
  });

  it('tipo incorrecto no recupera el TEMP', async () => {
    const { service, storage } = fixture('RECIBO_HONORARIO');

    await expect(
      service.recoverRegularizacionOp(actor, 31, 'FACTURA'),
    ).resolves.toBeNull();

    expect(storage.statObject).not.toHaveBeenCalled();
  });

  it('actor ajeno no recupera el TEMP', async () => {
    const { service, storage } = fixture('FACTURA');

    await expect(
      service.recoverRegularizacionOp(
        { ...actor, actorId: 999 },
        31,
        'FACTURA',
      ),
    ).resolves.toBeNull();

    expect(storage.statObject).not.toHaveBeenCalled();
  });

  it('TEMP vencido sin contexto válido sigue rechazado', async () => {
    const { service, storage, preview } = fixture('FACTURA', {
      consumer: 'OTRO_CONSUMER',
    });

    await expect(
      service.recoverRegularizacionOp(actor, 31, 'FACTURA'),
    ).resolves.toBeNull();

    expect(storage.statObject).not.toHaveBeenCalled();
    expect(preview.getTempPreviewUrl).not.toHaveBeenCalled();
  });

  it('TEMP vencido con estado no elegible devuelve TEMP_EXPIRADO', async () => {
    const { service, storage } = fixture('FACTURA', {
      estado: 'iniciada',
    });

    await expect(
      service.recoverRegularizacionOp(actor, 31, 'FACTURA'),
    ).resolves.toEqual(
      expect.objectContaining({
        disponible: false,
        motivo: 'TEMP_EXPIRADO',
      }),
    );

    expect(storage.statObject).not.toHaveBeenCalled();
  });

  it('archivo ausente no se declara recuperable', async () => {
    const { service, preview } = fixture('FACTURA', {
      exists: false,
    });

    await expect(
      service.recoverRegularizacionOp(actor, 31, 'FACTURA'),
    ).resolves.toEqual(
      expect.objectContaining({
        disponible: false,
        motivo: 'TMP_STORAGE_NOT_FOUND',
      }),
    );

    expect(preview.getTempPreviewUrl).not.toHaveBeenCalled();
  });
});
