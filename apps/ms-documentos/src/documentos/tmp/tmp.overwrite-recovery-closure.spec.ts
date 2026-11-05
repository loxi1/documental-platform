jest.mock('@documental/database', () => ({ sql: {} }));
jest.mock('@documental/shared', () => ({ NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' } }));
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { TmpService } from './tmp.service';

// Deterministic S3 and transactional repository models: no provider or database access.
describe('C2-03 promotion exclusive write and recovery closure', () => {
  const bytes = Buffer.from('synthetic closure PDF');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const actor = { actorId: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2,
    idempotencyKey: 'closure-operation', requestId: 'closure-request', correlationId: 'closure-correlation' };
  const destination = 'documentos/2026/09/BBTI/50__closure.pdf';
  let objects: Map<string, any>, row: any, adapter: R2CargaSeguraStorage, service: TmpService;
  let repo: any, successfulWrites: number, documents: any[], files: any[], loseResponse: boolean;
  let beforeWrite: (() => void) | undefined;
  const owned = () => ({ bytes, metadata: { sha256: hash, 'operation-id': `tmp:50:${actor.idempotencyKey}` } });

  beforeEach(() => {
    objects = new Map([['documentos/tmp/12/50', { bytes, metadata: { sha256: hash } }]]);
    successfulWrites = 0; documents = []; files = []; loseResponse = false; beforeWrite = undefined;
    row = { id: 50, actor_id: 6, workspace_id: 12, empresa_codigo: 'BBTI', cliente_destino_id: 2,
      estado: 'almacenada', metadata: {}, hash_sha256: hash, tamano_bytes: bytes.length,
      content_type: 'application/pdf', nombre_archivo_original: 'closure.pdf',
      storage_key: 'documentos/tmp/12/50', storage_bucket: 'synthetic', promovida_en: null };
    adapter = new R2CargaSeguraStorage({} as any);
    (adapter as any).client = { send: jest.fn(async (cmd: any) => {
      const i = cmd.input;
      if (cmd instanceof GetObjectCommand || cmd instanceof HeadObjectCommand) {
        const o = objects.get(i.Key); if (!o) throw { $metadata: { httpStatusCode: 404 } };
        return { Body: cmd instanceof GetObjectCommand ? Readable.from([o.bytes]) : undefined,
          ContentLength: o.bytes.length, Metadata: o.metadata };
      }
      if (cmd instanceof PutObjectCommand) {
        expect(i.IfNoneMatch).toBe('*');
        const chunks: Buffer[] = []; for await (const chunk of i.Body) chunks.push(Buffer.from(chunk));
        beforeWrite?.(); beforeWrite = undefined;
        if (objects.has(i.Key)) throw { $metadata: { httpStatusCode: 412 } };
        objects.set(i.Key, { bytes: Buffer.concat(chunks), metadata: i.Metadata }); successfulWrites++;
        if (loseResponse) { loseResponse = false; throw new Error('PUT_RESPONSE_LOST'); }
        return {};
      }
      throw new Error('COPY and physical TEMP DELETE forbidden in this test');
    }) };
    // Never execute physical TEMP cleanup, even against the in-memory storage model.
    jest.spyOn(adapter, 'deleteObject').mockRejectedValue(new Error('CLEANUP_NOT_IN_SCOPE'));
    let tail = Promise.resolve();
    repo = {
      locked: jest.fn(async (_key: string, work: any) => {
        const prior = tail; let release!: () => void; tail = new Promise<void>(r => { release = r; });
        await prior; try { return await work({}); } finally { release(); }
      }),
      own: jest.fn(async () => ({ ...row, metadata: { ...row.metadata } })),
      bind: jest.fn(async (_c: any, _r: any, key: string, identity: string) => {
        row.metadata = { ...row.metadata, destinoReservado: key, promocionIdentity: identity };
      }),
      promoted: jest.fn(async () => {
        const ds = documents.length, fs = files.length;
        try {
          documents.push({ id: 101, principalId: 7, groupId: 8, workspaceId: 12 });
          files.push({ id: 201, documentoId: 101, version: 2, key: destination });
          if (repo.failCommit) { repo.failCommit = false; throw new Error('DB_COMMIT_FAILED'); }
          row.promovida_en = new Date(); row.destino_storage_key = destination;
        } catch (e) { documents.length = ds; files.length = fs; throw e; }
      }),
      cleaned: jest.fn(), failCommit: false,
    };
    service = new TmpService(repo, {} as any, adapter, {} as any, {} as any);
  });
  const promote = () => service.promote(50, actor, destination);

  it('DESTINATION_ABSENT', async () => {
    await promote(); expect(successfulWrites).toBe(1); expect(objects.get(destination).bytes).toEqual(bytes);
  });
  it('DESTINATION_ALREADY_EXISTS: foreign object is preserved', async () => {
    const foreign = { bytes, metadata: { sha256: hash, 'operation-id': 'foreign' } };
    objects.set(destination, foreign); await expect(promote()).rejects.toThrow();
    expect(objects.get(destination)).toBe(foreign); expect(repo.promoted).not.toHaveBeenCalled();
  });
  it('DESTINATION_CREATED_BETWEEN_HEAD_AND_WRITE', async () => {
    expect((await adapter.statObject({ provider: 'r2', bucket: 'synthetic', key: destination })).exists).toBe(false);
    const foreign = { bytes: Buffer.alloc(bytes.length), metadata: {} };
    beforeWrite = () => objects.set(destination, foreign);
    await expect(promote()).rejects.toThrow(); expect(objects.get(destination)).toBe(foreign);
    expect(successfulWrites).toBe(0); expect(documents).toHaveLength(0);
  });
  it('TWO_CONCURRENT_PROMOTIONS: service lock materializes once', async () => {
    await Promise.all([promote(), promote()]); expect(successfulWrites).toBe(1);
    expect(repo.promoted).toHaveBeenCalledTimes(1); expect(documents).toHaveLength(1); expect(files).toHaveLength(1);
  });
  it('WRITE_SUCCESS_RESPONSE_LOST: retry retains the physical object', async () => {
    loseResponse = true; await expect(promote()).rejects.toThrow();
    expect(documents).toHaveLength(0); const stored = objects.get(destination);
    await promote(); expect(objects.get(destination)).toBe(stored); expect(successfulWrites).toBe(1);
    expect(documents).toHaveLength(1); expect(files).toHaveLength(1);
  });
  it('RETRY_SAME_OPERATION: compatible object is adopted only after verification', async () => {
    objects.set(destination, owned()); await promote(); await promote();
    expect(successfulWrites).toBe(0); expect(repo.promoted).toHaveBeenCalledTimes(1);
  });
  it('RETRY_DIFFERENT_OPERATION: durable reservation rejects changed identity', async () => {
    loseResponse = true; await expect(promote()).rejects.toThrow();
    await expect(service.promote(50, { ...actor, idempotencyKey: 'different' }, destination)).rejects.toThrow('TMP_DESTINATION_CONFLICT');
    expect(repo.promoted).not.toHaveBeenCalled(); expect(successfulWrites).toBe(1);
  });
  it('OBJECT_IDENTITY_MISMATCH', async () => {
    const o = owned(); o.metadata['operation-id'] = 'another-operation'; objects.set(destination, o);
    await expect(promote()).rejects.toThrow(); expect(repo.promoted).not.toHaveBeenCalled();
  });
  it('SHA256_MISMATCH: matching metadata cannot conceal different bytes', async () => {
    objects.set(destination, { ...owned(), bytes: Buffer.alloc(bytes.length) });
    await expect(promote()).rejects.toThrow(); expect(repo.promoted).not.toHaveBeenCalled();
  });
  it('DB_PERSISTENCE_FAILURE: same destination and identity survive rollback', async () => {
    repo.failCommit = true; await expect(promote()).rejects.toThrow('DB_COMMIT_FAILED');
    expect(documents).toHaveLength(0); expect(files).toHaveLength(0);
    expect(objects.has(row.storage_key)).toBe(true); const stored = objects.get(destination);
    await promote(); expect(objects.get(destination)).toBe(stored); expect(successfulWrites).toBe(1);
    expect(documents).toHaveLength(1); expect(files).toHaveLength(1);
  });
  it('NO_DUPLICATE_DOCUMENT: retry preserves parent/group/workspace', async () => {
    await promote(); const document = documents[0]; await promote();
    expect(documents).toEqual([document]); expect(document).toMatchObject({ principalId: 7, groupId: 8, workspaceId: 12 });
  });
  it('NO_DUPLICATE_FILE: retry preserves file identity and version', async () => {
    await promote(); const file = files[0]; await promote();
    expect(files).toEqual([file]); expect(file).toMatchObject({ id: 201, documentoId: 101, version: 2 });
  });
});
