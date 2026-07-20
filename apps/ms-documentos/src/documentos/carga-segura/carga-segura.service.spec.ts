jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import type { ConfigService } from '@nestjs/config';

import { CargaSeguraCompensation } from './carga-segura.compensation';
import { CargaSeguraError } from './carga-segura.errors';
import { CargaSeguraPersistence } from './carga-segura.persistence';
import { CargaSeguraRepository } from './carga-segura.repository';
import { CargaSeguraService } from './carga-segura.service';
import type { CargaSeguraStorage } from './carga-segura.storage';
import type {
  CargaSeguraCommand,
  CargaSeguraOperacionRow,
} from './carga-segura.types';

const repository = {
  reservar: jest.fn(),
  marcarAlmacenada: jest.fn(),
  marcarFallida: jest.fn(),
  buscarPorId: jest.fn(),
} as unknown as jest.Mocked<CargaSeguraRepository>;

const storage = {
  exists: jest.fn(),
  putObject: jest.fn(),
  deleteObject: jest.fn(),
} as jest.Mocked<CargaSeguraStorage>;

const persistence = {
  persistir: jest.fn(),
} as unknown as jest.Mocked<CargaSeguraPersistence>;

const compensation = {
  compensate: jest.fn(),
} as unknown as jest.Mocked<CargaSeguraCompensation>;

const configValues = new Map<string, string>();

const config = {
  get: jest.fn((key: string) => configValues.get(key)),
} as unknown as ConfigService;

function command(
  overrides: Partial<CargaSeguraCommand> = {},
): CargaSeguraCommand {
  const archivo = Buffer.from('pdf-content');

  return {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'upload-001',
    requestId: 'request-001',
    correlationId: 'correlation-001',
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    tipoDocumental: 'OC',
    tipoRelacion: 'principal_oc',
    esPrincipal: true,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: archivo.length,
    archivo,
    metadata: {},
    ...overrides,
  };
}

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
    idempotencyKey: 'upload-001',
    payloadFingerprint: 'b'.repeat(64),
    fingerprintVersion: 'canonical-json-v1',
    requestId: 'request-001',
    correlationId: 'correlation-001',
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    estado: 'iniciada',
    requiereReconciliacion: false,
    nombreArchivo: 'orden.pdf',
    contentType: 'application/pdf',
    tamanoBytes: Buffer.from('pdf-content').length,
    hashSha256: 'a'.repeat(64),
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

function createService(): CargaSeguraService {
  return new CargaSeguraService(
    config,
    repository,
    storage,
    persistence,
    compensation,
  );
}

describe('CargaSeguraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    configValues.clear();
    configValues.set('DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED', 'true');
    configValues.set('R2_BUCKET', 'documentos');
  });

  it('rechaza cuando el feature flag está desactivado', async () => {
    configValues.set('DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED', 'false');

    await expect(createService().ejecutar(command())).rejects.toMatchObject({
      name: 'CargaSeguraError',
      code: 'CARGA_SEGURA_DESHABILITADA',
    });

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('crea una carga segura completa', async () => {
    const reserved = operation();

    const storedOperation = operation({
      estado: 'almacenada',
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'documentos/carga-segura/2026/07/50__orden.pdf',
      almacenadaEn: new Date(),
    });

    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: reserved,
    });

    storage.putObject.mockResolvedValue({
      provider: 'r2',
      bucket: 'documentos',
      key: 'documentos/carga-segura/2026/07/50__orden.pdf',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockResolvedValue(storedOperation);

    persistence.persistir.mockResolvedValue({
      operacionId: 50,
      documentoId: 100,
      archivoId: 200,
      expedienteId: 17,
      outboxEventKey: 'carga-segura:50:archivo.subido:v1',
    });

    const result = await createService().ejecutar(command());

    expect(result).toMatchObject({
      kind: 'CREATED',
      operacionId: 50,
      documentoId: 100,
      archivoId: 200,
    });

    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(repository.marcarAlmacenada).toHaveBeenCalledTimes(1);
    expect(persistence.persistir).toHaveBeenCalledTimes(1);
  });

  it('devuelve replay de una operación completada', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'REPLAYED',
      operacion: operation({
        estado: 'completada',
        documentoId: 100,
        archivoId: 200,
      }),
    });

    const result = await createService().ejecutar(command());

    expect(result).toMatchObject({
      kind: 'REPLAYED',
      operacionId: 50,
      documentoId: 100,
      archivoId: 200,
    });

    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('devuelve duplicate para un hash ya completado', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'DUPLICATE',
      operacion: operation({
        estado: 'completada',
        documentoId: 101,
        archivoId: 201,
      }),
    });

    const result = await createService().ejecutar(command());

    expect(result).toMatchObject({
      kind: 'DUPLICATE',
      documentoId: 101,
      archivoId: 201,
    });
  });

  it('devuelve conflicto de idempotencia', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'IDEMPOTENCY_CONFLICT',
      operacion: operation(),
    });

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'IDEMPOTENCY_CONFLICT',
      operacionId: 50,
    });
  });

  it('clasifica un replay no terminal como operación en progreso', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'REPLAYED',
      operacion: operation({
        estado: 'almacenada',
      }),
    });

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'CARGA_SEGURA_OPERACION_EN_PROGRESO',
    });
  });

  it('devuelve reconciliación cuando falla la persistencia y no puede compensar', async () => {
    const storedOperation = operation({
      estado: 'almacenada',
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'storage-key',
    });

    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    });

    storage.putObject.mockResolvedValue({
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockResolvedValue(storedOperation);

    persistence.persistir.mockRejectedValue(
      new CargaSeguraError(
        'CARGA_SEGURA_PERSISTENCE_FAILED',
        'falló la transacción',
      ),
    );

    repository.buscarPorId.mockResolvedValue(storedOperation);

    compensation.compensate.mockResolvedValue({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      reason: 'DELETE_OBJECT_FAILED',
    });

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });
  });

  it('rechaza cuando tamanoBytes no coincide con el buffer', async () => {
    await expect(
      createService().ejecutar(
        command({
          tamanoBytes: 999,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
    });

    expect(repository.reservar).not.toHaveBeenCalled();
  });
});
