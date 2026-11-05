import { sql } from '@documental/database';
import { PeriodoDocumentalR2Repository } from '../periodo-documental-r2.repository';
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
  marcarRequiereReconciliacion: jest.fn(),
} as unknown as jest.Mocked<CargaSeguraRepository>;

const storage = {
  exists: jest.fn(),
  putObject: jest.fn(),
  deleteObject: jest.fn(),
  statObject: jest.fn(),
  copyObject: jest.fn(),
} as unknown as jest.Mocked<CargaSeguraStorage>;

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
    {
      resolver: jest.fn(),
    } as any,
    {} as any,
  );
}

describe('CargaSeguraService', () => {
  afterEach(() => jest.useRealTimers());
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

  it.each(['COMPRAS_UPLOAD_PRINCIPAL', 'ALMACEN_LEGACY_UPLOAD_GUIA'])(
    'P3 rechaza metadata r2RecoveryV1 falsificada en %s antes de reservar/PUT',
    async canalIngreso => {
      const input = command({
        canalIngreso,
        metadata: { r2RecoveryV1: { phase: 'PRE_PUT', fencingToken: 'fake' } },
      });
      await expect(createService().ejecutar(input)).rejects.toMatchObject({
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      });
      expect(repository.reservar).not.toHaveBeenCalled();
      expect(storage.putObject).not.toHaveBeenCalled();
    },
  );

  it('crea una carga segura completa', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-27T12:00:00Z') });
    const expectedKey = 'documentos/2026/10/BBTI/50__orden.pdf';
    const reserved = operation();

    const storedOperation = operation({
      estado: 'almacenada',
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: expectedKey,
      almacenadaEn: new Date(),
    });

    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: reserved,
    });

    storage.putObject.mockResolvedValue({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'documentos',
      key: expectedKey,
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
    expect(storage.putObject).toHaveBeenCalledWith(expect.objectContaining({ key: expectedKey }));
    expect(repository.marcarAlmacenada).toHaveBeenCalledTimes(1);
    expect(repository.marcarAlmacenada).toHaveBeenCalledWith(expect.objectContaining({ storageKey: expectedKey }));
    expect(persistence.persistir).toHaveBeenCalledTimes(1);
  });

  it('devuelve replay de una operación completada', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'REPLAYED',
      operacion: operation({
        estado: 'completada',
        storageKey: 'documentos/carga-segura/2026/07/BBTI/50__orden.pdf',
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
      kind: 'CREATED',
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

  it('no persiste ni elimina cuando el put condicional detecta objeto preexistente', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    });

    storage.putObject.mockResolvedValue({
      kind: 'PREEXISTING',
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: true,
    });

    repository.marcarRequiereReconciliacion.mockResolvedValue(true);

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(repository.marcarAlmacenada).not.toHaveBeenCalled();
    expect(persistence.persistir).not.toHaveBeenCalled();
    expect(compensation.compensate).not.toHaveBeenCalled();
    expect(repository.marcarRequiereReconciliacion).toHaveBeenCalledWith({
      operacionId: 50,
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'storage-key',
      errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
      errorDetalle: 'postStorageReason=OBJECT_PREEXISTING',
    });
  });

  it('persiste reconciliación con referencia storage si marcarAlmacenada retorna null', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    });

    storage.putObject.mockResolvedValue({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockResolvedValue(null);
    repository.marcarRequiereReconciliacion.mockResolvedValue(true);

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(repository.marcarRequiereReconciliacion).toHaveBeenCalledWith({
      operacionId: 50,
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'storage-key',
      errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
      errorDetalle: 'postStorageReason=MARCAR_ALMACENADA_NO_APLICADA',
    });
    expect(compensation.compensate).not.toHaveBeenCalled();
  });

  it('falla de forma tipada si no puede persistir la reconciliación post-storage', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    });

    storage.putObject.mockResolvedValue({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockResolvedValue(null);
    repository.marcarRequiereReconciliacion.mockResolvedValue(false);

    await expect(createService().ejecutar(command())).rejects.toMatchObject({
      code: 'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
    });
  });

  it('intenta persistir reconciliación si marcarAlmacenada lanza error', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    });

    storage.putObject.mockResolvedValue({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockRejectedValue(new Error('db down'));
    repository.marcarRequiereReconciliacion.mockResolvedValue(true);

    await expect(createService().ejecutar(command())).resolves.toEqual({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(repository.marcarRequiereReconciliacion).toHaveBeenCalledWith({
      operacionId: 50,
      storageProvider: 'r2',
      storageBucket: 'documentos',
      storageKey: 'storage-key',
      errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
      errorDetalle: 'postStorageReason=MARCAR_ALMACENADA_ERROR',
    });
  });

  it('preserva PRINCIPAL_ACTIVO_EXISTENTE después de compensar', async () => {
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
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'documentos',
      key: 'storage-key',
      preexisting: false,
    });

    repository.marcarAlmacenada.mockResolvedValue(storedOperation);
    repository.buscarPorId.mockResolvedValue(storedOperation);

    persistence.persistir.mockRejectedValue(
      new CargaSeguraError(
        'PRINCIPAL_ACTIVO_EXISTENTE',
        'Principal activo existente',
        {
          expedienteId: 17,
          tipoRelacion: 'principal_oc',
          documentoPrincipalId: 35,
        },
      ),
    );

    compensation.compensate.mockResolvedValue({
      kind: 'COMPENSATED',
      operacionId: 50,
    });

    await expect(createService().ejecutar(command())).rejects.toMatchObject({
      code: 'PRINCIPAL_ACTIVO_EXISTENTE',
      details: {
        expedienteId: 17,
        tipoRelacion: 'principal_oc',
        documentoPrincipalId: 35,
      },
    });

    expect(compensation.compensate).toHaveBeenCalledTimes(1);
  });


  it('R2: rechaza contrato de Almacén antes del PUT', async () => {
    repository.reservar.mockResolvedValue({
      kind: 'RESERVED',
      operacion: operation(),
    } as any);

    repository.marcarFallida.mockResolvedValue(undefined as any);

    const service = createService();

    await expect(
      service.ejecutar(
        command({
          canalIngreso: 'ALMACEN_LEGACY_UPLOAD_GUIA',
          tipoDocumental: 'GUIA_REMISION',
          tipoRelacion: 'adjunto_nota_ingreso',
          grupoFacturaId: 138,
          documentoBaseId: 486,
          esPrincipal: false,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
    });

    expect(repository.reservar).not.toHaveBeenCalled();
    expect(repository.marcarFallida).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(persistence.persistir).not.toHaveBeenCalled();
  });

  it.each([
    ['GUIA_REMISION', 'adjunto_guia', 'ALMACEN_LEGACY_UPLOAD_GUIA', 'NUEVA_GUIA'],
    ['NOTA_INGRESO', 'adjunto_nota_ingreso', 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO', 'NUEVA_NI'],
  ] as const)(
    'R2: %s utiliza fecha de Factura organizadora',
    async (tipoDocumental, tipoRelacion, canalIngreso, operacionR2) => {
      const events: string[] = [];

      const localRepository: any = {
        reservar: jest.fn(async (input: any) => ({
          kind: 'RESERVED',
          operacion: operation({
            canalIngreso,
            metadata: input.metadata,
          }),
        })),
        marcarPutStartedProtegidoR2: jest.fn(async () => {
          events.push('CAS');
          return true;
        }),
        marcarReconciliacionProtegidaR2: jest.fn(async () => true),
      };

      const localStorage: any = {
        putObject: jest.fn(async (input: any) => {
          events.push('PUT');
          return {
            kind: 'CREATED',
            provider: 'r2',
            bucket: input.bucket,
            key: input.key,
            preexisting: false,
          };
        }),
      };

      const localPersistence: any = {
        persistirProtegidaR2: jest.fn(async () => {
          events.push('PERSIST');
          return {
            operacionId: 50,
            documentoId: 100,
            archivoId: 200,
          };
        }),
      };

      const connection: any = jest.fn();
      connection.unsafe = jest.fn(async (statement: string) => {
        events.push(statement);
        return [];
      });

      const tmpRepository: any = {
        lockedBounded: jest.fn(async (_key: string, work: any) =>
          work(connection),
        ),
        transaction: jest.fn(async (_connection: any, work: any) => {
          events.push('BEGIN');
          const result = await work(connection);
          events.push('COMMIT');
          return result;
        }),
      };

      const periodoR2 = {
        verificarIdentidadGrupo: jest.fn().mockResolvedValue(true),
        resolver: jest.fn().mockResolvedValue({
          anio: '2026',
          mes: '07',
          fecha: new Date('2026-07-21T00:00:00.000Z'),
          facturaDocumentoId: 487,
        }),
      };

      const service = new CargaSeguraService(
        config,
        localRepository,
        localStorage,
        localPersistence,
        compensation,
        periodoR2 as any,
        tmpRepository,
      );

      const result = await service.ejecutar(
        command({
          canalIngreso,
          tipoDocumental,
          tipoRelacion,
          grupoFacturaId: 138,
          documentoBaseId: 486,
          expedienteId: 118,
          esPrincipal: false,
        }),
      );

      expect(result.kind).toBe('CREATED');

      expect(periodoR2.resolver).toHaveBeenCalledWith(
        expect.objectContaining({
          expedienteId: 118,
          empresaCodigo: 'BBTI',
        }),
        {
          operacion: operacionR2,
          grupoFacturaId: 138,
        },
      );

      expect(localStorage.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'documentos/2026/07/BBTI/50__orden.pdf',
        }),
      );

      expect(localRepository.marcarPutStartedProtegidoR2)
        .toHaveBeenCalledTimes(1);

      expect(localPersistence.persistirProtegidaR2)
        .toHaveBeenCalledTimes(1);

      expect(events.indexOf('CAS')).toBeGreaterThan(-1);
      expect(events.indexOf('COMMIT')).toBeGreaterThan(
        events.indexOf('CAS'),
      );
      expect(events.indexOf('PUT')).toBeGreaterThan(
        events.indexOf('COMMIT'),
      );
      expect(events.indexOf('PERSIST')).toBeGreaterThan(
        events.indexOf('PUT'),
      );
    },
  );
  describe('Finanzas: servicio con resolvedor y repositorio R2 reales, SQL/storage capturados', () => {
    const sqlMock = sql as unknown as jest.Mock;
    const row = { grupoFacturaId: 138, documentoBaseId: 486, organizadorDocumentoId: 487,
      tipoOrganizador: 'FACTURA', fechaEmision: '2026-07-21', empresaCodigo: 'BBTI',
      clienteDestinoId: 2, expedienteId: 17, integridadValida: true };
    const pago = (patch: Partial<CargaSeguraCommand> = {}) => command({ canalIngreso: 'WEB_ADMIN_GUIADO',
      tipoDocumental: 'TRANSFERENCIA', tipoRelacion: 'adjunto_transferencia',
      esPrincipal: false, grupoFacturaId: 138, documentoBaseId: 486, ...patch });
    function setup(rows: any[] = [row]) {
      sqlMock.mockReset().mockResolvedValue(rows);
      repository.reservar.mockResolvedValue({ kind: 'RESERVED', operacion: operation() } as any);
      repository.marcarAlmacenada.mockResolvedValue(operation({ estado: 'almacenada' }));
      storage.putObject.mockImplementation(async (input: any) => ({ kind: 'CREATED', provider: 'r2',
        bucket: input.bucket, key: input.key, preexisting: false }) as any);
      persistence.persistir.mockResolvedValue({ operacionId: 50, documentoId: 100, archivoId: 200 } as any);
      return new CargaSeguraService(config, repository, storage, persistence, compensation, new PeriodoDocumentalR2Repository(), {} as any);
    }
    it.each(['TRANSFERENCIA','PAGO_TRANSFERENCIA','DETRACCION','PAGO_DETRACCION'])('OC/OS %s: usa fecha Factura antes PUT y conserva metadata', async tipoDocumental => {
      jest.useFakeTimers({ now: new Date('2026-10-31T12:00:00Z') });
      const service = setup();
      const input = pago({ tipoDocumental, tipoRelacion: tipoDocumental.includes('DETRACCION') ? 'adjunto_detraccion' : 'adjunto_transferencia', metadata: { fechaEmision: '2026-10-31' } });
      const before = JSON.stringify(input.metadata);
      await service.ejecutar(input);
      expect(storage.putObject).toHaveBeenCalledWith(expect.objectContaining({ key: 'documentos/2026/07/BBTI/50__orden.pdf' }));
      expect(sqlMock.mock.invocationCallOrder[0]).toBeLessThan(storage.putObject.mock.invocationCallOrder[0]);
      expect(JSON.stringify(input.metadata)).toBe(before);
    });
    it.each(['TRANSFERENCIA','PAGO_DETRACCION'])('OP %s: usa fecha OP sin Factura', async tipoDocumental => {
      const service = setup([{ ...row, tipoOrganizador: 'ORDEN_PAGO', organizadorDocumentoId: 486, fechaEmision: '2026-01-31' }]);
      await service.ejecutar(pago({ tipoDocumental, tipoRelacion: tipoDocumental.includes('DETRACCION') ? 'adjunto_detraccion' : 'adjunto_transferencia' }));
      expect(storage.putObject).toHaveBeenCalledWith(expect.objectContaining({ key: 'documentos/2026/01/BBTI/50__orden.pdf' }));
    });
    it('rechaza todas las relaciones inválidas/ambiguas sin PUT ni persistencia', async () => {
      for (const rows of [[], [{ ...row, integridadValida: false }], [row, { ...row, organizadorDocumentoId: 999 }],
        [{ ...row, documentoBaseId: 999 }], [{ ...row, grupoFacturaId: 999 }],
        [{ ...row, empresaCodigo: 'OTRA' }], [{ ...row, clienteDestinoId: 99 }],
        [{ ...row, expedienteId: 99 }], [{ ...row, fechaEmision: '2026-02-30' }], [{ ...row, fechaEmision: null }]]) {
        jest.clearAllMocks();const service = setup(rows);
        await expect(service.ejecutar(pago())).rejects.toThrow();
        expect(storage.putObject).not.toHaveBeenCalled();expect(persistence.persistir).not.toHaveBeenCalled();
      }
    });
    it.each([{ documentoBaseId: null }, { grupoFacturaId: null }, { clienteDestinoId: null },
      { expedienteId: null }, { workspaceId: 0 }, { tipoRelacion: 'adjunto_detraccion' }, { esPrincipal: true }])('rechaza contexto/contrato %j antes PUT', async patch => {
      const service = setup();await expect(service.ejecutar(pago(patch))).rejects.toThrow();
      expect(storage.putObject).not.toHaveBeenCalled();expect(persistence.persistir).not.toHaveBeenCalled();
    });
    it('la misma operación completada no genera un segundo PUT ni otra resolución', async () => {
      const service = setup();
      await service.ejecutar(pago());
      repository.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: operation({
        estado: 'completada', documentoId: 100, archivoId: 200 }) } as any);
      const replay = await service.ejecutar(pago());
      expect(replay).toMatchObject({ kind: 'REPLAYED', documentoId: 100, archivoId: 200 });
      expect(storage.putObject).toHaveBeenCalledTimes(1);
      expect(sqlMock).toHaveBeenCalledTimes(1);
    });
    it('replay completado o fallido: no hay SQL de periodo ni PUT adicional', async () => {
      for (const estado of ['completada','fallida'] as const) {
        jest.clearAllMocks();const service = setup();
        repository.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: operation({ estado, documentoId: 100, archivoId: 200 }) } as any);
        const result = await service.ejecutar(pago());
        expect(result.kind).toBe(estado === 'completada' ? 'REPLAYED' : 'RECONCILIATION_REQUIRED');
        expect(sqlMock).not.toHaveBeenCalled();expect(storage.putObject).not.toHaveBeenCalled();
      }
    });
  });

});
