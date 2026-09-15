const connection: any = jest.fn();
connection.unsafe = jest.fn();
connection.release = jest.fn();
jest.mock('@documental/database', () => ({ sql: { reserve: jest.fn(async () => connection) } }));
import { TmpRepository } from './tmp.repository';

describe('TmpRepository conexión reservada', () => {
  const repo = new TmpRepository();
  const actor = { actorId: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2, idempotencyKey: 'key', requestId: 'req', correlationId: 'corr' };
  beforeEach(() => { connection.mockReset().mockResolvedValue([]); connection.unsafe.mockReset().mockResolvedValue([]); connection.release.mockClear(); });
  it('reserva y auditoría en una transacción sin depender de begin en reserve()', async () => {
    connection.mockImplementation(async (parts: TemplateStringsArray) => {
      const query = parts.join('?');
      if (query.includes('INSERT INTO documentos.carga_operaciones')) return [{ id: 10 }];
      return [];
    });
    const r = await repo.locked('reserve', c => repo.reserve(c, actor, { name: 'p.pdf', mime: 'application/pdf', size: 4, hash: 'a'.repeat(64) }, 'b'.repeat(64), 'lab'));
    expect(r.storage_key).toBe('documentos/tmp/12/10');
    expect(connection.unsafe.mock.calls.map((c: any[]) => c[0])).toEqual(['BEGIN', 'COMMIT']);
    expect(connection.mock.calls.some((c: any[]) => c[0].join('').includes('INSERT INTO core.auditoria_eventos'))).toBe(true);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('fallo de auditoría revierte promoción y libera bloqueo', async () => {
    connection.mockImplementation(async (parts: TemplateStringsArray) => {
      if (parts.join('').includes('INSERT INTO core.auditoria_eventos')) throw new Error('audit');
      return [];
    });
    await expect(repo.locked('10', c => repo.promoted(c, { id: 10, hash_sha256: 'a'.repeat(64), tamano_bytes: 4 }, actor, 'destino'))).rejects.toThrow('audit');
    expect(connection.unsafe.mock.calls.map((c: any[]) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
