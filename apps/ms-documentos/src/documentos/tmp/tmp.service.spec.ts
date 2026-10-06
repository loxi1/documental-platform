jest.mock('@documental/shared', () => ({
  NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' },
}));
jest.mock('@documental/database', () => ({ sql: {} }));
import { TmpService } from './tmp.service';
import { TmpController } from './tmp.controller';
import { NotFoundException } from '@nestjs/common';

describe('TEMP staging/promoción', () => {
  const actor = { actorId: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2, idempotencyKey: 'key', requestId: 'req', correlationId: 'corr' };
  let row: any, repo: any, storage: any, service: TmpService;
  const destination = 'documentos/carga-segura/2026/09/BBTI/50__pago.pdf';
  beforeEach(() => {
    row = { id: 50, actor_id: 6, workspace_id: 12, empresa_codigo: 'BBTI', cliente_destino_id: 2,
      estado: 'almacenada', metadata: {}, hash_sha256: 'a'.repeat(64), tamano_bytes: 9,
      storage_key: 'documentos/tmp/12/50',
    nombre_archivo_original: 'factura.pdf', storage_bucket: 'lab', promovida_en: null };
    repo = { locked: jest.fn(async (_: any, work: any) => work({})),
      reserve: jest.fn(async () => row),
      own: jest.fn(async (_: any, id: any, a: any) => { if (a.actorId !== 6 || a.workspaceId !== 12) throw new NotFoundException(); return { ...row }; }),
      bind: jest.fn(async (_: any, r: any, d: any, key: any) => { row.metadata = { destinoReservado: d, promocionIdentity: key }; }),
      staged: jest.fn(async () => { row.estado = 'almacenada'; }),
      promoted: jest.fn(async () => { row.promovida_en = new Date(); row.destino_storage_key = destination; row.estado = 'requiere_reconciliacion'; }),
      cleaned: jest.fn(async () => { row.estado = 'completada'; }),
    };
    storage = { putObject: jest.fn(), copyObject: jest.fn(), deleteObject: jest.fn(),
      statObject: jest.fn(async (o: any) => ({ exists: o.key === row.storage_key || storage.copyObject.mock.calls.length > 0,
        tamanoBytes: 9, hashSha256: 'a'.repeat(64) })) };
    service = new TmpService(
      repo,
      { get: () => 'lab' } as any,
      storage,
      { send: jest.fn() } as any,
      { getTempPreviewUrl: jest.fn() } as any,
    );
  });
  it('reserva y almacena usando buffer existente, sin documento ni OCR', async () => {
    row.estado = 'iniciada';
    await service.reserve(actor, { originalname: 'pago.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') });
    expect(repo.reserve).toHaveBeenCalled(); expect(storage.putObject).toHaveBeenCalledTimes(1); expect(repo.staged).toHaveBeenCalledTimes(1);
  });
  it('consulta propia', async () => { expect((await service.consult(50, actor)).estado).toBe('STAGED'); });
  it.each([{ ...actor, actorId: 7 }, { ...actor, workspaceId: 99 }])('rechaza consulta ajena', async a => {
    await expect(service.consult(50, a)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.statObject).not.toHaveBeenCalled();
  });
  it('promueve con copy, verifica, persiste y borra inmediatamente', async () => {
    expect((await service.promote(50, actor, destination)).estado).toBe('PROMOTED');
    expect(storage.copyObject).toHaveBeenCalledTimes(1);
    expect(storage.statObject).toHaveBeenCalledWith(expect.objectContaining({ key: destination }));
    expect(repo.promoted.mock.invocationCallOrder[0]).toBeLessThan(storage.deleteObject.mock.invocationCallOrder[0]);
  });
  it('replay sin copy ni auditoría duplicada', async () => {
    await service.promote(50, actor, destination); await service.promote(50, actor, destination);
    expect(storage.copyObject).toHaveBeenCalledTimes(1); expect(repo.promoted).toHaveBeenCalledTimes(1);
  });
  it('destino o identidad incompatible produce conflicto', async () => {
    await service.promote(50, actor, destination);
    await expect(service.promote(50, actor, destination.replace('pago', 'otro'))).rejects.toThrow('TMP_DESTINATION_CONFLICT');
    await expect(service.promote(50, { ...actor, idempotencyKey: 'otra' }, destination)).rejects.toThrow('TMP_DESTINATION_CONFLICT');
  });
  it('fallo delete conserva definitivo y retry recupera limpieza', async () => {
    storage.deleteObject.mockRejectedValueOnce(new Error('storage'));
    expect((await service.promote(50, actor, destination)).estado).toBe('CLEANUP_PENDING');
    expect((await service.promote(50, actor, destination)).estado).toBe('PROMOTED');
    expect(storage.copyObject).toHaveBeenCalledTimes(1); expect(repo.promoted).toHaveBeenCalledTimes(1);
  });
  it('destino no verificado nunca se persiste ni elimina TEMP', async () => {
    storage.statObject.mockImplementation(async (o: any) => ({ exists: o.key === row.storage_key, tamanoBytes: 9, hashSha256: 'a'.repeat(64) }));
    await expect(service.promote(50, actor, destination)).rejects.toThrow('TMP_STORAGE_VERIFICATION_FAILED');
    expect(repo.promoted).not.toHaveBeenCalled(); expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('recupera copy exitoso tras fallo DB sin repetir copy', async () => {
    repo.promoted.mockRejectedValueOnce(new Error('DB'));
    await expect(service.promote(50, actor, destination)).rejects.toThrow('DB');
    expect((await service.promote(50, actor, destination)).estado).toBe('PROMOTED');
    expect(storage.copyObject).toHaveBeenCalledTimes(1);
  });
  it('recupera put con consulta', async () => {
    row.estado = 'iniciada'; expect((await service.consult(50, actor)).estado).toBe('STAGED');
    expect(storage.putObject).not.toHaveBeenCalled();
  });
  it.each(['otro/bucket', 'documentos/carga-segura/2026/09/OTRA/50__pago.pdf', destination.replace('50__','51__')])('rechaza namespace arbitrario %s', async d => {
    await expect(service.promote(50, actor, d)).rejects.toThrow('namespace'); expect(storage.copyObject).not.toHaveBeenCalled();
  });
  it('controller rechaza actor y bucket del body', () => {
    const controller = new TmpController(service);
    expect(() => controller.promote({}, '50', { actorId: 999, destinoStorageKey: destination })).toThrow('Campo TEMP');
    expect(() => controller.reserve({}, { actorId: 999 }, { archivo: [] })).toThrow('únicamente');
  });
});

describe('TEMP OCR candidato sin persistencia documental', () => {
  const actor = {
    actorId: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    idempotencyKey: 'tmp-ocr-test',
    requestId: '11111111-1111-4111-8111-111111111111',
    correlationId: 'corr-tmp-ocr',
  } as any;

  const row = {
    id: 50,
    operacion_tipo: 'tmp',
    actor_id: 6,
    workspace_id: 12,
    empresa_codigo: 'BBTI',
    cliente_destino_id: 2,
    estado: 'almacenada',
    storage_provider: 'r2',
    storage_bucket: 'data-prod',
    storage_key: 'documentos/tmp/12/50',
    nombre_archivo_original: 'factura.pdf',
    tamano_bytes: 1234,
    hash_sha256: 'a'.repeat(64),
    expira_en: new Date(Date.now() + 60 * 60 * 1000),
    metadata: {} as any,
  };

  function fixture(ocrResult: any = {
    ok: true,
    tipoPropuesto: 'FACTURA',
    confidence: 0.98,
    metadata: { ruc: '20123456789' },
  }) {
    const { of } = require('rxjs');

    row.estado = 'almacenada';
    row.storage_provider = 'r2';
    row.storage_bucket = 'data-prod';
    row.storage_key = 'documentos/tmp/12/50';
    row.expira_en = new Date(Date.now() + 60 * 60 * 1000);
    row.metadata = {};

    const repo = {
      locked: jest.fn(async (_key: string, work: any) => work({})),
      own: jest.fn(async () => row),
      ocrProcessing: jest.fn(async (_c: any, _id: number, tipoEsperado: string) => {
        row.metadata = {
          ...row.metadata,
          ocrCandidate: {
            status: 'PROCESSING',
            tipoEsperado,
            startedAt: '2026-09-23T16:00:00.000Z',
          },
        };
      }),
      ocrDone: jest.fn(async (_c: any, _id: number, tipoEsperado: string, resultado: any) => {
        row.metadata = {
          ...row.metadata,
          ocrCandidate: {
            status: 'DONE',
            tipoEsperado,
            completedAt: '2026-09-23T16:00:01.000Z',
            resultado,
          },
        };
      }),
    };

    const storage = {
      statObject: jest.fn().mockResolvedValue({
        exists: true,
        tamanoBytes: 1234,
        hashSha256: 'a'.repeat(64),
      }),
    };

    const nats = {
      send: jest.fn().mockReturnValue(of(ocrResult)),
    };

    const service = new TmpService(
      repo as any,
      { get: jest.fn() } as any,
      storage as any,
      nats as any,
      {
        getTempPreviewUrl: jest.fn().mockResolvedValue({
          tempId: 50,
          filename: 'factura.pdf',
          contentType: 'application/pdf',
          signedUrl: 'http://preview.local/factura.pdf',
          expiresIn: 300,
          expiresAt: '2026-09-23T17:05:00.000Z',
        }),
      } as any,
    );

    const preview = (service as any).preview;

    return { service, repo, storage, nats, preview };
  }

  it('genera preview TEMP propio vigente desde storage persistido', async () => {
    const { service, storage, preview } = fixture();

    const result = await service.previewUrl(50, actor);

    expect(storage.statObject).toHaveBeenCalledTimes(1);
    expect(preview.getTempPreviewUrl).toHaveBeenCalledWith({
      tempId: 50,
      filename: 'factura.pdf',
      storageProvider: 'r2',
      storageBucket: 'data-prod',
      storageKey: 'documentos/tmp/12/50',
    });
    expect(result).toEqual(expect.objectContaining({
      tempId: 50,
      signedUrl: 'http://preview.local/factura.pdf',
    }));
  });

  it('preview TEMP rechaza estado no almacenado antes de firmar', async () => {
    const { service, storage, preview } = fixture();
    row.estado = 'iniciada';

    await expect(service.previewUrl(50, actor))
      .rejects.toThrow('TEMP_PREVIEW_ESTADO_NO_ELEGIBLE');

    expect(storage.statObject).not.toHaveBeenCalled();
    expect(preview.getTempPreviewUrl).not.toHaveBeenCalled();
  });

  it('preview TEMP expirado no firma ni consulta storage', async () => {
    const { service, storage, preview } = fixture();
    row.expira_en = new Date(Date.now() - 1000);

    await expect(service.previewUrl(50, actor))
      .rejects.toThrow('TEMP_EXPIRADO');

    expect(storage.statObject).not.toHaveBeenCalled();
    expect(preview.getTempPreviewUrl).not.toHaveBeenCalled();
  });

  it('preview TEMP no firma cuando el objeto ya no existe', async () => {
    const { service, storage, preview } = fixture();
    storage.statObject.mockResolvedValueOnce({ exists: false });

    await expect(service.previewUrl(50, actor))
      .rejects.toThrow('TMP_STORAGE_NOT_FOUND');

    expect(preview.getTempPreviewUrl).not.toHaveBeenCalled();
  });

  it('preview TEMP permanece disponible con OCR PROCESSING', async () => {
    const { service, nats, preview } = fixture();

    row.metadata = {
      ocrCandidate: {
        status: 'PROCESSING',
        tipoEsperado: 'FACTURA',
        startedAt: '2026-09-23T16:00:00.000Z',
      },
    };

    const result = await service.previewUrl(50, actor);

    expect(result).toEqual(expect.objectContaining({
      tempId: 50,
      signedUrl: 'http://preview.local/factura.pdf',
    }));
    expect(preview.getTempPreviewUrl).toHaveBeenCalledTimes(1);
    expect(nats.send).not.toHaveBeenCalled();
  });

  it('respeta OCR_REQUEST_SUBJECT configurado para TEMP OCR', async () => {
    const original = process.env.OCR_REQUEST_SUBJECT;
    process.env.OCR_REQUEST_SUBJECT = 'lab.ocr.procesar-archivo';

    try {
      const { service, nats } = fixture();

      await service.procesarOcr(50, actor, 'RECIBO_HONORARIO');

      expect(nats.send).toHaveBeenCalledWith(
        'lab.ocr.procesar-archivo',
        expect.objectContaining({
          storageProvider: 'r2',
          storageKey: 'documentos/tmp/12/50',
          tipoEsperado: 'RECIBO_HONORARIO',
          canalIngreso: 'TEMP_REGULARIZACION_OP',
        }),
      );
    } finally {
      if (original === undefined) {
        delete process.env.OCR_REQUEST_SUBJECT;
      } else {
        process.env.OCR_REQUEST_SUBJECT = original;
      }
    }
  });

  it.each([
    ['FACTURA'],
    ['RECIBO_HONORARIO'],
  ])('procesa %s directamente desde TEMP sin documento ni archivo definitivo', async tipo => {
    const { service, repo, storage, nats } = fixture();

    const result = await service.procesarOcr(50, actor, tipo);

    expect(repo.locked).toHaveBeenCalledWith(
      '50',
      expect.any(Function),
    );

    expect(repo.own).toHaveBeenCalledWith(
      expect.anything(),
      50,
      actor,
    );

    expect(storage.statObject).toHaveBeenCalledWith({
      provider: 'r2',
      bucket: 'data-prod',
      key: 'documentos/tmp/12/50',
    });

    expect(nats.send).toHaveBeenCalledTimes(1);

    expect(nats.send).toHaveBeenCalledWith(
      'ocr.procesar-archivo',
      expect.objectContaining({
        documentoId: null,
        archivoId: null,
        storageProvider: 'r2',
        storageKey: 'documentos/tmp/12/50',
        clienteAbreviatura: 'BBTI',
        areaOrigen: 'FINANZAS',
        tipoEsperado: tipo,
        canalIngreso: 'TEMP_REGULARIZACION_OP',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        tempId: 50,
        documentoId: null,
        archivoId: null,
        temporal: true,
        persistido: false,
        tipoEsperado: tipo,
      }),
    );
  });

  it('rechaza un tipo distinto de FACTURA/RH antes de llamar al worker', async () => {
    const { service, nats } = fixture();

    await expect(
      service.procesarOcr(50, actor, 'PAGO_TRANSFERENCIA'),
    ).rejects.toThrow('TEMP_OCR_TIPO_NO_PERMITIDO');

    expect(nats.send).not.toHaveBeenCalled();
  });

  it('rechaza TEMP que no está almacenado antes de llamar al worker', async () => {
    const { service, repo, nats } = fixture();

    repo.own.mockResolvedValue({
      ...row,
      estado: 'completada',
    });

    await expect(
      service.procesarOcr(50, actor, 'FACTURA'),
    ).rejects.toThrow('TEMP_OCR_ESTADO_NO_ELEGIBLE');

    expect(nats.send).not.toHaveBeenCalled();
  });

  it('usa storageKey del TEMP persistido y no recibe storageKey del cliente', async () => {
    const { service, nats } = fixture();

    await service.procesarOcr(50, actor, 'FACTURA');

    const payload = nats.send.mock.calls[0][1];

    expect(payload.storageKey).toBe('documentos/tmp/12/50');
    expect(payload.nombreOriginal).toBe('factura.pdf');
    expect(payload.documentoId).toBeNull();
    expect(payload.archivoId).toBeNull();
  });

  it('rechaza tempId inválido antes de repositorio y worker', async () => {
    const { service, repo, nats } = fixture();

    await expect(
      service.procesarOcr(0, actor, 'FACTURA'),
    ).rejects.toThrow('tempId inválido');

    expect(repo.locked).not.toHaveBeenCalled();
    expect(nats.send).not.toHaveBeenCalled();
  });

  it('usa el provider contractual r2 persistido por TEMP', async () => {
    const { service, storage, nats } = fixture();

    await service.procesarOcr(50, actor, 'FACTURA');

    expect(storage.statObject).toHaveBeenCalledWith({
      provider: 'r2',
      bucket: 'data-prod',
      key: 'documentos/tmp/12/50',
    });

    expect(nats.send).toHaveBeenCalledWith(
      'ocr.procesar-archivo',
      expect.objectContaining({
        storageProvider: 'r2',
        storageKey: 'documentos/tmp/12/50',
      }),
    );
  });

  it('rechaza storage_provider desconocido antes de OCR', async () => {
    const { service, repo, nats } = fixture();

    repo.own.mockResolvedValue({
      ...row,
      storage_provider: 'otro',
    });

    await expect(
      service.procesarOcr(50, actor, 'FACTURA'),
    ).rejects.toThrow('TEMP_STORAGE_PROVIDER_NO_DISPONIBLE');

    expect(nats.send).not.toHaveBeenCalled();
  });

  it('persiste PROCESSING antes del único dispatch y DONE después de respuesta OCR', async () => {
    const { service, repo, nats } = fixture();

    const result = await service.procesarOcr(50, actor, 'FACTURA');

    expect(repo.ocrProcessing).toHaveBeenCalledTimes(1);
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(repo.ocrDone).toHaveBeenCalledTimes(1);

    expect(repo.ocrProcessing.mock.invocationCallOrder[0])
      .toBeLessThan(nats.send.mock.invocationCallOrder[0]);
    expect(nats.send.mock.invocationCallOrder[0])
      .toBeLessThan(repo.ocrDone.mock.invocationCallOrder[0]);

    expect(row.metadata.ocrCandidate).toEqual(
      expect.objectContaining({
        status: 'DONE',
        tipoEsperado: 'FACTURA',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        tempId: 50,
        documentoId: null,
        archivoId: null,
        temporal: true,
        persistido: false,
        tipoEsperado: 'FACTURA',
        ocrEstado: 'DONE',
      }),
    );
  });

  it('reutiliza candidato DONE sin segundo dispatch OCR ni acceso storage', async () => {
    const { service, repo, storage, nats } = fixture();

    const first = await service.procesarOcr(50, actor, 'FACTURA');

    expect(first.ocrEstado).toBe('DONE');
    expect(nats.send).toHaveBeenCalledTimes(1);

    storage.statObject.mockClear();
    repo.ocrProcessing.mockClear();
    repo.ocrDone.mockClear();
    nats.send.mockClear();

    const replay = await service.procesarOcr(50, actor, 'FACTURA');

    expect(replay).toEqual(
      expect.objectContaining({
        tempId: 50,
        tipoEsperado: 'FACTURA',
        ocrEstado: 'DONE',
        persistido: false,
      }),
    );
    expect(nats.send).not.toHaveBeenCalled();
    expect(storage.statObject).not.toHaveBeenCalled();
    expect(repo.ocrProcessing).not.toHaveBeenCalled();
    expect(repo.ocrDone).not.toHaveBeenCalled();
  });

  it('PROCESSING no dispara un segundo OCR', async () => {
    const { service, repo, storage, nats } = fixture();

    row.metadata = {
      ocrCandidate: {
        status: 'PROCESSING',
        tipoEsperado: 'FACTURA',
        startedAt: '2026-09-23T16:00:00.000Z',
      },
    };

    const result = await service.procesarOcr(50, actor, 'FACTURA');

    expect(result).toEqual(
      expect.objectContaining({
        tempId: 50,
        tipoEsperado: 'FACTURA',
        ocrEstado: 'PROCESSING',
        persistido: false,
      }),
    );
    expect(nats.send).not.toHaveBeenCalled();
    expect(storage.statObject).not.toHaveBeenCalled();
    expect(repo.ocrProcessing).not.toHaveBeenCalled();
    expect(repo.ocrDone).not.toHaveBeenCalled();
  });

  it.each(['PROCESSING', 'DONE'])(
    '%s con tipo distinto rechaza cambio FACTURA/RH sin dispatch',
    async status => {
      const { service, repo, storage, nats } = fixture();

      row.metadata = {
        ocrCandidate: {
          status,
          tipoEsperado: 'FACTURA',
          ...(status === 'DONE'
            ? { resultado: { ok: true } }
            : { startedAt: '2026-09-23T16:00:00.000Z' }),
        },
      };

      await expect(
        service.procesarOcr(50, actor, 'RECIBO_HONORARIO'),
      ).rejects.toThrow('TEMP_OCR_TIPO_CONFLICT');

      expect(nats.send).not.toHaveBeenCalled();
      expect(storage.statObject).not.toHaveBeenCalled();
      expect(repo.ocrProcessing).not.toHaveBeenCalled();
      expect(repo.ocrDone).not.toHaveBeenCalled();
    },
  );

  it('error o timeout incierto conserva PROCESSING y no marca DONE', async () => {
    const { throwError } = require('rxjs');
    const { service, repo, nats } = fixture();

    nats.send.mockReturnValue(
      throwError(() => new Error('OCR_TIMEOUT_INCIERTO')),
    );

    await expect(
      service.procesarOcr(50, actor, 'FACTURA'),
    ).rejects.toThrow('OCR_TIMEOUT_INCIERTO');

    expect(repo.ocrProcessing).toHaveBeenCalledTimes(1);
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(repo.ocrDone).not.toHaveBeenCalled();

    expect(row.metadata.ocrCandidate).toEqual(
      expect.objectContaining({
        status: 'PROCESSING',
        tipoEsperado: 'FACTURA',
      }),
    );

    nats.send.mockClear();

    const retry = await service.procesarOcr(50, actor, 'FACTURA');

    expect(retry.ocrEstado).toBe('PROCESSING');
    expect(nats.send).not.toHaveBeenCalled();
    expect(repo.ocrDone).not.toHaveBeenCalled();
  });

  it('deriva clienteAbreviatura exclusivamente del empresa_codigo persistido en TEMP', async () => {
    const { service, nats } = fixture();

    const actorDistinto = {
      ...actor,
      empresaCodigo: 'OTRA_EMPRESA',
    };

    await service.procesarOcr(50, actorDistinto, 'FACTURA');

    expect(nats.send).toHaveBeenCalledWith(
      'ocr.procesar-archivo',
      expect.objectContaining({
        clienteAbreviatura: 'BBTI',
      }),
    );
  });

  it('rechaza TEMP expirado antes de storage y OCR', async () => {
    const { service, repo, storage, nats } = fixture();

    repo.own.mockResolvedValue({
      ...row,
      expira_en: new Date(Date.now() - 1000),
    });

    await expect(
      service.procesarOcr(50, actor, 'FACTURA'),
    ).rejects.toThrow('TEMP_EXPIRADO');

    expect(storage.statObject).not.toHaveBeenCalled();
    expect(nats.send).not.toHaveBeenCalled();
  });

});
