jest.mock('@documental/database', () => ({
  sql: { reserve: jest.fn() },
}));

import { CargaSeguraPersistence } from './carga-segura.persistence';
import { TmpRepository } from '../tmp/tmp.repository';

describe('P3: atomicidad terminal protegida', () => {
  const fence = {
    fencingToken: 'p3-fence-test',
    attempt: 1,
    storageBucket: 'documentos',
    storageKey: 'p3/test/guia.pdf',
  };

  const input: any = {
    operacion: {
      id: 50,
      hashSha256: 'p3-test-hash',
    },
    command: {
      workspaceId: 1,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      expedienteId: 17,
      actorId: 1,
      canalIngreso: 'ALMACEN_LEGACY_UPLOAD_GUIA',
      tipoDocumental: 'GUIA_REMISION',
      tipoRelacion: 'adjunto_guia',
      esPrincipal: false,
      grupoFacturaId: 138,
      documentoBaseId: 486,
      nombreArchivo: 'guia.pdf',
      contentType: 'application/pdf',
      tamanoBytes: 10,
      metadata: {},
      idempotencyKey: 'p3-terminal-test',
      requestId: 'p3-terminal-request',
      correlationId: 'p3-terminal-correlation',
    },
    fecha: new Date('2026-07-21T00:00:00Z'),
  };

  function setup(
    queryResult: (query: string) => unknown[] | Promise<unknown[]>,
  ) {
    const events: string[] = [];

    const connection: any = jest.fn();

    connection.unsafe = jest.fn(async (statement: string) => {
      events.push(statement);
      return [];
    });

    const tx: any = (strings: TemplateStringsArray) => {
      const query = strings.join('?').replace(/\s+/g, ' ').trim();
      events.push(query);
      return Promise.resolve(queryResult(query));
    };

    tx.unsafe = connection.unsafe;

    const repo = new TmpRepository();
    const persistence = new CargaSeguraPersistence(repo);

    return { tx, persistence, events };
  }

  it('CAS terminal rechazado: ROLLBACK sin inserciones', async () => {
    const h = setup(query => {
      if (query.startsWith('UPDATE documentos.carga_operaciones')) {
        return [];
      }
      throw new Error('P3_UNEXPECTED_QUERY');
    });

    await expect(
      h.persistence.persistirProtegidaR2(h.tx, input, fence),
    ).rejects.toThrow();

    expect(h.events).toContain('BEGIN');
    expect(h.events).toContain('ROLLBACK');
    expect(h.events).not.toContain('COMMIT');

    expect(
      h.events.some(event => event.startsWith('INSERT INTO')),
    ).toBe(false);
  });

  it('fallo documental posterior al CAS: ROLLBACK', async () => {
    const h = setup(query => {
      if (query.startsWith('UPDATE documentos.carga_operaciones')) {
        return [{ id: 50 }];
      }

      if (query.startsWith('SELECT') &&
          query.includes('FROM documentos.carga_operaciones')) {
        return [{
          id: 50,
          estado: 'almacenada',
          workspace_id: 1,
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
          expediente_id: 17,
          actor_id: 1,
          idempotency_key: 'p3-terminal-test',
          canal_ingreso: 'ALMACEN_LEGACY_UPLOAD_GUIA',
          nombre_archivo_original: 'guia.pdf',
          content_type: 'application/pdf',
          tamano_bytes: 10,
          hash_sha256: 'p3-test-hash',
          storage_provider: 'r2',
          storage_bucket: fence.storageBucket,
          storage_key: fence.storageKey,
          metadata: {
            r2RecoveryV1: {
              version: 1,
              phase: 'PUT_STARTED',
              fencingToken: fence.fencingToken,
              attempt: fence.attempt,
              storageBucket: fence.storageBucket,
              storageKey: fence.storageKey,
            },
          },
        }];
      }

      if (query.includes('pg_advisory_xact_lock')) {
        return [];
      }

      if (query.includes('FROM documentos.expedientes')) {
        return [{
          id: 17,
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        }];
      }

      if (query.startsWith('INSERT INTO documentos.documentos (')) {
        throw new Error('P3_DOCUMENT_INSERT_FAILED');
      }

      throw new Error(`P3_UNEXPECTED_QUERY: ${query}`);
    });

    await expect(
      h.persistence.persistirProtegidaR2(h.tx, input, fence),
    ).rejects.toThrow('P3_DOCUMENT_INSERT_FAILED');

    expect(h.events).toContain('BEGIN');
    expect(h.events).toContain('ROLLBACK');
    expect(h.events).not.toContain('COMMIT');

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos ('),
      ),
    ).toBe(true);

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos_archivos'),
      ),
    ).toBe(false);
  });

  // P3: los escenarios siguientes simulan respuestas SQL;
  // no sustituyen una prueba de integración PostgreSQL.

  function terminalFixture() {
    return {
      id: 50,
      estado: 'almacenada',
      workspace_id: 1,
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,
      expediente_id: 17,
      actor_id: 1,
      idempotency_key: 'p3-terminal-test',
      canal_ingreso: 'ALMACEN_LEGACY_UPLOAD_GUIA',
      nombre_archivo_original: 'guia.pdf',
      content_type: 'application/pdf',
      tamano_bytes: 10,
      hash_sha256: 'p3-test-hash',
      storage_provider: 'r2',
      storage_bucket: fence.storageBucket,
      storage_key: fence.storageKey,
      metadata: {
        r2RecoveryV1: {
          version: 1,
          phase: 'PUT_STARTED',
          fencingToken: fence.fencingToken,
          attempt: fence.attempt,
          storageBucket: fence.storageBucket,
          storageKey: fence.storageKey,
        },
      },
    };
  }

  function terminalScenario(
    failure: 'STALE' | 'FILE' | 'COMPLETION' | 'SUCCESS',
  ) {
    let updateCount = 0;

    return setup(query => {
      if (query.startsWith('UPDATE documentos.carga_operaciones')) {
        updateCount++;

        if (updateCount === 1) {
          expect(query).toContain("fencingToken");
          expect(query).toContain("PUT_STARTED");
          expect(query).toContain("storageBucket");
          expect(query).toContain("storageKey");

          return failure === 'STALE' ? [] : [{ id: 50 }];
        }

        if (updateCount === 2) {
          expect(query).toContain("COMPLETED");
          expect(query).toContain("fencingToken");

          return failure === 'COMPLETION' ? [] : [{ id: 50 }];
        }

        throw new Error('P3_UNEXPECTED_EXTRA_UPDATE');
      }

      if (
        query.startsWith('SELECT') &&
        query.includes('FROM documentos.carga_operaciones')
      ) {
        return [terminalFixture()];
      }

      if (query.includes('pg_advisory_xact_lock')) {
        return [];
      }

      if (query.includes('FROM documentos.expedientes')) {
        return [{
          id: 17,
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        }];
      }

      if (query.startsWith('INSERT INTO documentos.documentos (')) {
        return [{ id: 701 }];
      }

      if (query.startsWith('INSERT INTO documentos.documentos_archivos')) {
        if (failure === 'FILE') {
          throw new Error('P3_FILE_INSERT_FAILED');
        }

        return [{ id: 702 }];
      }

      if (query.startsWith('INSERT INTO documentos.documento_eventos_outbox')) {
        return [];
      }

      throw new Error(`P3_UNEXPECTED_QUERY: ${query}`);
    });
  }

  it('fencing obsoleto: rechazo sin inserciones', async () => {
    const h = terminalScenario('STALE');

    await expect(
      h.persistence.persistirProtegidaR2(h.tx, input, fence),
    ).rejects.toThrow('P3_FENCING_STALE_OR_UNCERTAIN');

    expect(h.events).toContain('BEGIN');
    expect(h.events).toContain('ROLLBACK');
    expect(h.events).not.toContain('COMMIT');

    expect(
      h.events.some(event => event.startsWith('INSERT INTO')),
    ).toBe(false);
  });

  it('fallo al insertar archivo: ROLLBACK', async () => {
    const h = terminalScenario('FILE');

    await expect(
      h.persistence.persistirProtegidaR2(h.tx, input, fence),
    ).rejects.toThrow('P3_FILE_INSERT_FAILED');

    expect(h.events).toContain('ROLLBACK');
    expect(h.events).not.toContain('COMMIT');

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos ('),
      ),
    ).toBe(true);

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos_archivos'),
      ),
    ).toBe(true);

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documento_eventos_outbox'),
      ),
    ).toBe(false);
  });

  it('rechazo de COMPLETED: ROLLBACK de escrituras previas', async () => {
    const h = terminalScenario('COMPLETION');

    await expect(
      h.persistence.persistirProtegidaR2(h.tx, input, fence),
    ).rejects.toThrow('No se pudo completar la operación de carga');

    expect(h.events).toContain('ROLLBACK');
    expect(h.events).not.toContain('COMMIT');

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos ('),
      ),
    ).toBe(true);

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documentos_archivos'),
      ),
    ).toBe(true);

    expect(
      h.events.some(event =>
        event.startsWith('INSERT INTO documentos.documento_eventos_outbox'),
      ),
    ).toBe(true);
  });

  it('éxito: COMMIT después de documento, archivo, outbox y COMPLETED', async () => {
    const h = terminalScenario('SUCCESS');

    const result = await h.persistence.persistirProtegidaR2(
      h.tx,
      input,
      fence,
    );

    expect(result).toMatchObject({
      operacionId: 50,
      documentoId: 701,
      archivoId: 702,
      expedienteId: 17,
    });

    const documentIndex = h.events.findIndex(event =>
      event.startsWith('INSERT INTO documentos.documentos ('),
    );

    const fileIndex = h.events.findIndex(event =>
      event.startsWith('INSERT INTO documentos.documentos_archivos'),
    );

    const outboxIndex = h.events.findIndex(event =>
      event.startsWith('INSERT INTO documentos.documento_eventos_outbox'),
    );

    const completedIndex = h.events.findIndex(event =>
      event.startsWith('UPDATE documentos.carga_operaciones') &&
      event.includes('COMPLETED'),
    );

    const commitIndex = h.events.indexOf('COMMIT');

    expect(documentIndex).toBeGreaterThan(0);
    expect(fileIndex).toBeGreaterThan(documentIndex);
    expect(outboxIndex).toBeGreaterThan(fileIndex);
    expect(completedIndex).toBeGreaterThan(outboxIndex);
    expect(commitIndex).toBeGreaterThan(completedIndex);

    expect(h.events).not.toContain('ROLLBACK');
    expect(h.events.filter(event => event === 'COMMIT')).toHaveLength(1);
  });

});
