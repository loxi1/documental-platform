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
      storage_key: 'documentos/tmp/12/50', storage_bucket: 'lab', promovida_en: null };
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
    service = new TmpService(repo, { get: () => 'lab' } as any, storage);
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
