jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { sql } from '@documental/database';

import { CargaSeguraRepository } from './carga-segura.repository';
import type {
  CargaSeguraOperacionRow,
  ReservarCargaSeguraInput,
} from './carga-segura.types';

const sqlMock = sql as unknown as jest.Mock;

const HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const FINGERPRINT =
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let queryResults: unknown[][] = [];
let executedQueryCount = 0;

function input(
  overrides: Partial<ReservarCargaSeguraInput> = {},
): ReservarCargaSeguraInput {
  return {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'upload-001',
    payloadFingerprint: FINGERPRINT,
    requestId: null,
    correlationId: null,
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 1024,
    hashSha256: HASH,
    metadata: {},
    ...overrides,
  };
}

function operation(
  overrides: Partial<CargaSeguraOperacionRow> = {},
): CargaSeguraOperacionRow {
  return {
    id: 1,
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'upload-001',
    payloadFingerprint: FINGERPRINT,
    fingerprintVersion: 'canonical-json-v1',
    requestId: null,
    correlationId: null,
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    estado: 'iniciada',
    requiereReconciliacion: false,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 1024,
    hashSha256: HASH,
    storageProvider: null,
    storageBucket: null,
    storageKey: null,
    documentoId: null,
    archivoId: null,
    errorCodigo: null,
    errorDetalle: null,
    metadata: {},
    iniciadaEn: new Date(),
    almacenadaEn: null,
    completadaEn: null,
    fallidaEn: null,
    expiraEn: new Date(),
    actualizadoEn: new Date(),
    ...overrides,
  };
}

function queueQueryResults(...results: unknown[][]): void {
  queryResults.push(...results);
}

describe('CargaSeguraRepository', () => {
  beforeEach(() => {
    queryResults = [];
    executedQueryCount = 0;

    sqlMock.mockReset();

    sqlMock.mockImplementation(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        const isSelectionFragment =
          strings.length === 1 &&
          values.length === 0 &&
          strings[0].includes('workspace_id AS "workspaceId"');

        if (isSelectionFragment) {
          return {
            type: 'sql-fragment',
            text: strings[0],
          };
        }

        executedQueryCount += 1;

        return Promise.resolve(queryResults.shift() ?? []);
      },
    );
  });

  it('devuelve RESERVED cuando gana el insert', async () => {
    const row = operation();

    queueQueryResults([row]);

    const result = await new CargaSeguraRepository().reservar(input());

    expect(result).toEqual({
      kind: 'RESERVED',
      operacion: row,
    });

    expect(executedQueryCount).toBe(1);
  });

  it('devuelve REPLAYED para misma clave y fingerprint', async () => {
    const row = operation();

    queueQueryResults([], [row]);

    const result = await new CargaSeguraRepository().reservar(input());

    expect(result.kind).toBe('REPLAYED');
    expect(executedQueryCount).toBe(2);
  });

  it('devuelve conflicto para misma clave y fingerprint distinto', async () => {
    const row = operation({
      payloadFingerprint:
        'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    });

    queueQueryResults([], [row]);

    const result = await new CargaSeguraRepository().reservar(input());

    expect(result.kind).toBe('IDEMPOTENCY_CONFLICT');

    expect(executedQueryCount).toBe(2);
  });

  it('devuelve DUPLICATE para mismo hash con otra clave', async () => {
    const row = operation({
      idempotencyKey: 'otra-key',
    });

    queueQueryResults([], [], [row]);

    const result = await new CargaSeguraRepository().reservar(input());

    expect(result.kind).toBe('DUPLICATE');
    expect(executedQueryCount).toBe(3);
  });

  it('reintenta cuando el bloqueo por hash desaparece concurrentemente', async () => {
    const row = operation({ id: 2 });

    queueQueryResults([], [], [], [row]);

    const result = await new CargaSeguraRepository().reservar(input());

    expect(result.kind).toBe('RESERVED');
    expect(executedQueryCount).toBe(4);
  });

  it('falla si no puede clasificar después del reintento', async () => {
    queueQueryResults([], [], [], [], [], []);

    await expect(new CargaSeguraRepository().reservar(input())).rejects.toThrow(
      'No fue posible clasificar la reserva concurrente',
    );

    expect(executedQueryCount).toBe(6);
  });

  it('busca una operación por id', async () => {
    const row = operation({ id: 25 });

    queueQueryResults([row]);

    const result = await new CargaSeguraRepository().buscarPorId(25);

    expect(result).toStrictEqual(row);
    expect(executedQueryCount).toBe(1);
  });

  it('devuelve null cuando la operación no existe', async () => {
    queueQueryResults([]);

    const result = await new CargaSeguraRepository().buscarPorId(999);

    expect(result).toBeNull();
    expect(executedQueryCount).toBe(1);
  });
  it('normaliza los bigint entregados como texto por PostgreSQL', async () => {
    const row = operation({
      id: '25' as unknown as number,
      expedienteId: '17' as unknown as number,
      tamanoBytes: '1024' as unknown as number,
      documentoId: '100' as unknown as number,
      archivoId: '200' as unknown as number,
    });

    queryResults.push([row]);

    const result = await new CargaSeguraRepository().buscarPorId(25);

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 25,
      expedienteId: 17,
      tamanoBytes: 1024,
      documentoId: 100,
      archivoId: 200,
    });

    expect(typeof result?.id).toBe('number');
    expect(typeof result?.expedienteId).toBe('number');
    expect(typeof result?.tamanoBytes).toBe('number');
    expect(typeof result?.documentoId).toBe('number');
    expect(typeof result?.archivoId).toBe('number');
    expect(executedQueryCount).toBe(1);
  });

  it('marca una operación iniciada como almacenada', async () => {
    const row = operation({
      estado: 'almacenada',
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'documentos/carga-segura/2026/07/1__orden.pdf',
      almacenadaEn: new Date(),
    });

    queueQueryResults([row]);

    const result = await new CargaSeguraRepository().marcarAlmacenada({
      operacionId: 1,
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'documentos/carga-segura/2026/07/1__orden.pdf',
    });

    expect(result).toStrictEqual(row);
    expect(executedQueryCount).toBe(1);
  });

  it('devuelve null si la transición a almacenada no aplica', async () => {
    queueQueryResults([]);

    const result = await new CargaSeguraRepository().marcarAlmacenada({
      operacionId: 1,
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'key',
    });

    expect(result).toBeNull();
    expect(executedQueryCount).toBe(1);
  });

  it('marca reconciliación desde iniciada y persiste la referencia storage', async () => {
    queueQueryResults([{ id: 1 }]);

    const result =
      await new CargaSeguraRepository().marcarRequiereReconciliacion({
        operacionId: 1,
        storageProvider: 'r2',
        storageBucket: 'documentos',
        storageKey: 'documentos/carga-segura/2026/07/1__orden.pdf',
        errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
        errorDetalle: 'postStorageReason=MARCAR_ALMACENADA_NO_APLICADA',
      });

    expect(result).toBe(true);
    expect(executedQueryCount).toBe(1);
  });

  it('devuelve false cuando la transición de reconciliación no aplica', async () => {
    queueQueryResults([]);

    const result =
      await new CargaSeguraRepository().marcarRequiereReconciliacion({
        operacionId: 1,
        storageProvider: 'r2',
        storageBucket: 'documentos',
        storageKey: 'key',
        errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
        errorDetalle: 'fallo',
      });

    expect(result).toBe(false);
    expect(executedQueryCount).toBe(1);
  });
});
