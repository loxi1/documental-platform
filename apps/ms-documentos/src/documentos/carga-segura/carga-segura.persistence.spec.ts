jest.mock('@documental/database', () => {
  const taggedSql = jest.fn();

  Object.assign(taggedSql, {
    begin: jest.fn(),
  });

  return {
    sql: taggedSql,
  };
});

import { sql } from '@documental/database';

import { CargaSeguraError } from './carga-segura.errors';
import { CargaSeguraPersistence } from './carga-segura.persistence';
import type {
  CargaSeguraCommand,
  CargaSeguraOperacionRow,
} from './carga-segura.types';

const beginMock = (
  sql as unknown as {
    begin: jest.Mock;
  }
).begin;

const txMock = jest.fn();

const HASH = 'a'.repeat(64);
const FINGERPRINT = 'b'.repeat(64);

let queryResults: unknown[][] = [];
let executedQueries = 0;

function operation(
  overrides: Partial<CargaSeguraOperacionRow> = {},
): CargaSeguraOperacionRow {
  return {
    id: 50,
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'upload-050',
    payloadFingerprint: FINGERPRINT,
    fingerprintVersion: 'canonical-json-v1',
    requestId: 'request-050',
    correlationId: 'correlation-050',
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    estado: 'almacenada',
    requiereReconciliacion: false,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 1024,
    hashSha256: HASH,
    storageProvider: 'r2',
    storageBucket: 'documentos',
    storageKey: 'documentos/carga-segura/2026/07/50__orden.pdf',
    documentoId: null,
    archivoId: null,
    errorCodigo: null,
    errorDetalle: null,
    metadata: {},
    iniciadaEn: new Date(),
    almacenadaEn: new Date(),
    completadaEn: null,
    fallidaEn: null,
    expiraEn: new Date(),
    actualizadoEn: new Date(),
    ...overrides,
  };
}

function command(
  overrides: Partial<CargaSeguraCommand> = {},
): CargaSeguraCommand {
  return {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'upload-050',
    requestId: 'request-050',
    correlationId: 'correlation-050',
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    tipoDocumental: 'OC',
    tipoRelacion: 'principal_oc',
    esPrincipal: true,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 1024,
    archivo: Buffer.from('pdf'),
    metadata: {},
    ...overrides,
  };
}

function storedOperationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 50,
    estado: 'almacenada',
    workspace_id: 1,
    empresa_codigo: 'BBTI',
    cliente_destino_id: 2,
    expediente_id: 17,
    actor_id: 1,
    idempotency_key: 'upload-050',
    request_id: 'request-050',
    correlation_id: 'correlation-050',
    canal_ingreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    nombre_archivo_original: 'orden.pdf',
    content_type: 'application/pdf',
    tamano_bytes: 1024,
    hash_sha256: HASH,
    storage_provider: 'r2',
    storage_bucket: 'documentos',
    storage_key: 'documentos/carga-segura/2026/07/50__orden.pdf',
    ...overrides,
  };
}

function queue(...results: unknown[][]): void {
  queryResults.push(...results);
}

describe('CargaSeguraPersistence', () => {
  beforeEach(() => {
    queryResults = [];
    executedQueries = 0;

    beginMock.mockReset();
    txMock.mockReset();

    txMock.mockImplementation(() => {
      executedQueries += 1;

      return Promise.resolve(queryResults.shift() ?? []);
    });

    beginMock.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );
  });

  it('persiste documento, archivo, relación, outbox y operación', async () => {
    queue(
      [storedOperationRow()],
      [],
      [
        {
          id: 17,
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        },
      ],
      [],
      [{ id: 100 }],
      [{ id: 200 }],
      [],
      [],
      [{ id: 50 }],
    );

    const result = await new CargaSeguraPersistence().persistir({
      operacion: operation(),
      command: command(),
      fecha: new Date('2026-07-20T12:00:00.000Z'),
    });

    expect(result).toEqual({
      operacionId: 50,
      documentoId: 100,
      archivoId: 200,
      expedienteId: 17,
      outboxEventKey: 'carga-segura:50:documento-creado:v1',
    });

    expect(beginMock).toHaveBeenCalledTimes(1);
    expect(executedQueries).toBe(9);
  });

  it('persiste sin relación cuando no existe expediente', async () => {
    queue(
      [
        storedOperationRow({
          expediente_id: null,
        }),
      ],
      [{ id: 101 }],
      [{ id: 201 }],
      [],
      [{ id: 50 }],
    );

    const result = await new CargaSeguraPersistence().persistir({
      operacion: operation({
        expedienteId: null,
      }),
      command: command({
        expedienteId: null,
        tipoRelacion: null,
        esPrincipal: false,
      }),
    });

    expect(result.documentoId).toBe(101);
    expect(result.archivoId).toBe(201);
    expect(result.expedienteId).toBeNull();
    expect(executedQueries).toBe(5);
  });

  it('bloquea un segundo principal en el expediente', async () => {
    queue(
      [storedOperationRow()],
      [],
      [
        {
          id: 17,
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        },
      ],
      [{ documento_id: 99 }],
    );

    await expect(
      new CargaSeguraPersistence().persistir({
        operacion: operation(),
        command: command(),
      }),
    ).rejects.toMatchObject({
      name: 'CargaSeguraError',
      code: 'CARGA_SEGURA_PERSISTENCE_FAILED',
    });

    expect(executedQueries).toBe(4);
  });

  it('rechaza una operación que no está almacenada', async () => {
    queue([
      storedOperationRow({
        estado: 'iniciada',
      }),
    ]);

    await expect(
      new CargaSeguraPersistence().persistir({
        operacion: operation({
          estado: 'iniciada',
        }),
        command: command(),
      }),
    ).rejects.toBeInstanceOf(CargaSeguraError);

    expect(executedQueries).toBe(1);
  });

  it('rechaza diferencias entre operación y comando', async () => {
    queue([storedOperationRow()]);

    await expect(
      new CargaSeguraPersistence().persistir({
        operacion: operation(),
        command: command({
          empresaCodigo: 'OTRA',
        }),
      }),
    ).rejects.toMatchObject({
      code: 'CARGA_SEGURA_PERSISTENCE_FAILED',
    });

    expect(executedQueries).toBe(1);
  });
});
