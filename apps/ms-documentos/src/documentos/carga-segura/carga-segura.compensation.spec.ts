jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { CargaSeguraCompensation } from './carga-segura.compensation';
import type { CargaSeguraOperacionRow } from './carga-segura.types';

function operation(
  overrides: Partial<CargaSeguraOperacionRow> = {},
): CargaSeguraOperacionRow {
  return {
    id: 10,
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'key',
    payloadFingerprint: 'b'.repeat(64),
    fingerprintVersion: 'canonical-json-v1',
    requestId: null,
    correlationId: null,
    canalIngreso: 'WEB',
    estado: 'almacenada',
    requiereReconciliacion: false,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 100,
    hashSha256: 'a'.repeat(64),
    storageProvider: 'r2',
    storageBucket: 'bucket',
    storageKey: 'key',
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

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    operacion: operation(),
    storageObject: { provider: 'r2', bucket: 'bucket', key: 'key' },
    objetoCreadoPorOperacion: true,
    objetoPreexistente: false,
    esReplay: false,
    errorCodigo: 'CARGA_SEGURA_PERSISTENCE_FAILED',
    errorDetalle: 'fallo de persistencia',
    ...overrides,
  };
}

describe('CargaSeguraCompensation', () => {
  it('elimina el objeto y marca la operación fallida', async () => {
    const repository = {
      contarReferenciasVigentesStorage: jest.fn().mockResolvedValue(0),
      marcarFallida: jest.fn().mockResolvedValue(true),
      marcarRequiereReconciliacion: jest.fn(),
    } as any;

    const storage = {
      deleteObject: jest.fn().mockResolvedValue(undefined),
    } as any;

    const result = await new CargaSeguraCompensation(
      repository,
      storage,
    ).compensate(createInput());

    expect(result.kind).toBe('COMPENSATED');
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(repository.marcarFallida).toHaveBeenCalledTimes(1);
  });

  it('no elimina un objeto preexistente', async () => {
    const repository = {
      contarReferenciasVigentesStorage: jest.fn(),
      marcarFallida: jest.fn(),
      marcarRequiereReconciliacion: jest.fn().mockResolvedValue(true),
    } as any;

    const storage = {
      deleteObject: jest.fn(),
    } as any;

    const result = await new CargaSeguraCompensation(
      repository,
      storage,
    ).compensate(
      createInput({
        objetoPreexistente: true,
      }),
    );

    expect(result.kind).toBe('RECONCILIATION_REQUIRED');
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('no elimina cuando existen referencias vigentes', async () => {
    const repository = {
      contarReferenciasVigentesStorage: jest.fn().mockResolvedValue(1),
      marcarFallida: jest.fn(),
      marcarRequiereReconciliacion: jest.fn().mockResolvedValue(true),
    } as any;

    const storage = {
      deleteObject: jest.fn(),
    } as any;

    const result = await new CargaSeguraCompensation(
      repository,
      storage,
    ).compensate(createInput());

    expect(result.kind).toBe('RECONCILIATION_REQUIRED');
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('requiere reconciliación cuando falla DeleteObject', async () => {
    const repository = {
      contarReferenciasVigentesStorage: jest.fn().mockResolvedValue(0),
      marcarFallida: jest.fn(),
      marcarRequiereReconciliacion: jest.fn().mockResolvedValue(true),
    } as any;

    const storage = {
      deleteObject: jest.fn().mockRejectedValue(new Error('R2 down')),
    } as any;

    const result = await new CargaSeguraCompensation(
      repository,
      storage,
    ).compensate(createInput());

    expect(result.kind).toBe('RECONCILIATION_REQUIRED');
  });

  it('falla de forma tipada cuando no se persiste la reconciliación', async () => {
    const repository = {
      contarReferenciasVigentesStorage: jest.fn().mockResolvedValue(0),
      marcarFallida: jest.fn(),
      marcarRequiereReconciliacion: jest.fn().mockResolvedValue(false),
    } as any;

    const storage = {
      deleteObject: jest.fn().mockRejectedValue(new Error('R2 down')),
    } as any;

    await expect(
      new CargaSeguraCompensation(repository, storage).compensate(
        createInput(),
      ),
    ).rejects.toMatchObject({
      code: 'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
    });
  });
});
