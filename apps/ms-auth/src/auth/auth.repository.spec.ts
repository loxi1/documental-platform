import * as bcrypt from 'bcrypt';

const mockDb = {
  begin: jest.fn(),
  json: jest.fn((value: unknown) => value),
};

jest.mock('@documental/database', () => ({
  sql: mockDb,
}));

import { AuthRepository } from './auth.repository';

describe('G2-B — transacción de contraseña', () => {
  let repository: AuthRepository;
  let queries: string[];
  let responses: unknown[][];
  let tx: jest.Mock;

  const params = {
    userId: 101,
    expectedAuthVersion: 1,
    currentPassword: 'ClaveActual123!',
    newPassword: 'ClaveNueva456!',
    workspaceId: 201,
    empresaCodigo: 'BBTI',
    sistemaCodigo: 'DOCUMENTAL',
    perfilCodigo: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AuthRepository();
    queries = [];
    responses = [];

    tx = jest.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join('?').replace(/\s+/g, ' ').trim();
      queries.push(query);
      return responses.shift() ?? [];
    });

    mockDb.begin.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
  });

  it('R01 verifica contraseña antes de actualizar', async () => {
    const hash = await bcrypt.hash(params.currentPassword, 4);
    responses = [[{
      id: 101, estado: 'activo',
      password_hash: hash, auth_version: 1,
    }]];

    const result = await repository.changePasswordAndRevokeSessions({
      ...params, currentPassword: 'Incorrecta',
    });

    expect(result).toEqual({
      changed: false,
      reason: 'INVALID_CURRENT_PASSWORD',
    });
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('FOR UPDATE');
  });

  it('R02 incrementa versión y actualiza contraseña', async () => {
    const hash = await bcrypt.hash(params.currentPassword, 4);
    responses = [
      [{ id: 101, estado: 'activo', password_hash: hash, auth_version: 1 }],
      [{ auth_version: 2 }],
      [],
    ];

    const result = await repository.changePasswordAndRevokeSessions(params);

    expect(result).toEqual({ changed: true, authVersion: 2 });
    expect(queries[1]).toContain('auth_version = auth_version + 1');
    expect(queries[1]).toContain('password_hash');
    expect(mockDb.begin).toHaveBeenCalledTimes(1);
  });

  it('R03 inserta auditoría en la misma transacción', async () => {
    const hash = await bcrypt.hash(params.currentPassword, 4);
    responses = [
      [{ id: 101, estado: 'activo', password_hash: hash, auth_version: 1 }],
      [{ auth_version: 2 }],
      [],
    ];

    await repository.changePasswordAndRevokeSessions(params);

    expect(queries).toHaveLength(3);
    expect(queries[2]).toContain('INSERT INTO core.auditoria_eventos');
    expect(queries[2]).toContain('AUTH_PASSWORD_CHANGED');
    // Drizzle configures postgres-js JSON serializers as transparent: bind strings.
    const auditParameters = tx.mock.calls[2].slice(1);
    expect(auditParameters.slice(-2)).toEqual([
      JSON.stringify({ authVersion: 1 }),
      JSON.stringify({ authVersion: 2 }),
    ]);
    expect(queries[2].match(/::jsonb/g)).toHaveLength(2);
    expect(mockDb.json).not.toHaveBeenCalled();
    expect(tx).toHaveBeenCalledTimes(3);
  });

  it('R04 propaga fallo de auditoría sin declarar éxito', async () => {
    const hash = await bcrypt.hash(params.currentPassword, 4);

    responses = [
      [{ id: 101, estado: 'activo', password_hash: hash, auth_version: 1 }],
      [{ auth_version: 2 }],
    ];

    tx.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join('?').replace(/\s+/g, ' ').trim();
      queries.push(query);

      if (query.includes('INSERT INTO core.auditoria_eventos')) {
        throw new Error('AUDIT_FAILURE_SIMULATED');
      }

      return responses.shift() ?? [];
    });

    await expect(
      repository.changePasswordAndRevokeSessions(params),
    ).rejects.toThrow('AUDIT_FAILURE_SIMULATED');

    expect(queries).toHaveLength(3);
    expect(mockDb.begin).toHaveBeenCalledTimes(1);
  });
  it('R05 serializes concurrent attempts in modeled row lock and changes once', async () => {
    const state = { version: 1, hash: await bcrypt.hash(params.currentPassword, 4), audits: 0, updates: 0 };
    let tail = Promise.resolve();
    mockDb.begin.mockImplementation((callback: (transaction: unknown) => Promise<unknown>) => {
      const work = tail.then(() => callback(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.join('?');
        if (query.includes('FOR UPDATE')) return [{ id: params.userId, estado: 'activo', password_hash: state.hash, auth_version: state.version }];
        if (query.includes('UPDATE auth.usuarios')) {
          expect(values[2]).toBe(state.version);
          state.hash = String(values[0]); state.version += 1; state.updates += 1;
          return [{ auth_version: state.version }];
        }
        if (query.includes('INSERT INTO core.auditoria_eventos')) {state.audits += 1; return [];}
        throw new Error('UNEXPECTED_QUERY');
      }));
      tail = work.then(() => undefined); return work;
    });
    const results = await Promise.all([repository.changePasswordAndRevokeSessions(params), repository.changePasswordAndRevokeSessions(params)]);
    expect(results).toEqual([{changed: true, authVersion: 2}, {changed: false, reason: 'TOKEN_REVOKED'}]);
    expect(state).toEqual(expect.objectContaining({version: 2, audits: 1, updates: 1}));
  });

});
