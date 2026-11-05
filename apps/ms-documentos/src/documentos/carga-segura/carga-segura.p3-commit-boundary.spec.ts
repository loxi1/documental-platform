jest.mock('@documental/database', () => ({
  sql: {
    reserve: jest.fn(),
  },
}));

import { TmpRepository } from '../tmp/tmp.repository';

describe('P3: frontera transaccional COMMIT/PUT', () => {
  const repo = new TmpRepository();

  function connectionDouble() {
    const events: string[] = [];

    const connection: any = jest.fn();

    connection.unsafe = jest.fn(async (statement: string) => {
      events.push(statement);
      return [];
    });

    connection.release = jest.fn();

    return { connection, events };
  }

  it('no devuelve éxito antes de confirmar COMMIT', async () => {
    const { connection, events } = connectionDouble();

    let confirmCommit!: () => void;

    const commitPending = new Promise<void>(resolve => {
      confirmCommit = resolve;
    });

    connection.unsafe.mockImplementation(async (statement: string) => {
      events.push(statement);

      if (statement === 'COMMIT') {
        await commitPending;
      }

      return [];
    });

    const work = jest.fn(async () => {
      events.push('CAS_CONFIRMED');
      return true;
    });

    let completed = false;

    const transaction = repo.transaction(connection, work).then(result => {
      completed = true;
      return result;
    });

    try {
      for (let i = 0; i < 10 && !events.includes('COMMIT'); i++) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }

      expect(events).toEqual(['BEGIN', 'CAS_CONFIRMED', 'COMMIT']);
      expect(completed).toBe(false);
    } finally {
      confirmCommit();
    }

    await expect(transaction).resolves.toBe(true);
    expect(completed).toBe(true);
  });

  it('propaga CAS rechazado y ejecuta ROLLBACK', async () => {
    const { connection, events } = connectionDouble();

    const original = new Error('P3_CAS_REJECTED');

    await expect(
      repo.transaction(connection, async () => {
        events.push('CAS_REJECTED');
        throw original;
      }),
    ).rejects.toBe(original);

    expect(events).toEqual(['BEGIN', 'CAS_REJECTED', 'ROLLBACK']);
    expect(events).not.toContain('COMMIT');
  });

  it('no devuelve éxito cuando COMMIT rechaza', async () => {
    const { connection, events } = connectionDouble();

    connection.unsafe.mockImplementation(async (statement: string) => {
      events.push(statement);

      if (statement === 'COMMIT') {
        throw new Error('P3_COMMIT_UNCERTAIN');
      }

      return [];
    });

    await expect(
      repo.transaction(connection, async () => {
        events.push('CAS_CONFIRMED');
        return true;
      }),
    ).rejects.toThrow('P3_COMMIT_UNCERTAIN');

    expect(events).toEqual([
      'BEGIN',
      'CAS_CONFIRMED',
      'COMMIT',
      'ROLLBACK',
    ]);
  });
});
