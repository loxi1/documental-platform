jest.mock('@documental/database', () => ({
  sql: { reserve: jest.fn() },
}));

import { CargaSeguraService } from './carga-segura.service';
import { TmpRepository } from '../tmp/tmp.repository';
import { createHash } from 'node:crypto';

describe('P3: integración servicio CAS COMMIT PUT', () => {
  const archivo = Buffer.from('p3-integrated-test');

  const command: any = {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    idempotencyKey: 'p3-integrated-001',
    requestId: 'p3-request-001',
    correlationId: 'p3-correlation-001',
    canalIngreso: 'ALMACEN_LEGACY_UPLOAD_GUIA',
    tipoDocumental: 'GUIA_REMISION',
    tipoRelacion: 'adjunto_guia',
    esPrincipal: false,
    grupoFacturaId: 138,
    documentoBaseId: 486,
    nombreArchivo: 'guia.pdf',
    contentType: 'application/pdf',
    tamanoBytes: archivo.length,
    archivo,
    metadata: {},
  };

  function setup() {
    const events: string[] = [];

    let confirmCommit!: () => void;

    const commitPending = new Promise<void>(resolve => {
      confirmCommit = resolve;
    });

    const connection: any = jest.fn();

    connection.unsafe = jest.fn(async (statement: string) => {
      events.push(statement);

      if (statement === 'COMMIT') {
        await commitPending;
      }

      return [];
    });

    const tmpRepository = new TmpRepository();

    jest.spyOn(tmpRepository, 'lockedBounded').mockImplementation(
      async (_key: any, work: any) => work(connection),
    );

    const repository: any = {
      reservar: jest.fn(async (input: any) => ({
        kind: 'RESERVED',
        operacion: {
          id: 50,
          workspaceId: command.workspaceId,
          empresaCodigo: command.empresaCodigo,
          clienteDestinoId: command.clienteDestinoId,
          expedienteId: command.expedienteId,
          actorId: command.actorId,
          canalIngreso: command.canalIngreso,
          estado: 'iniciada',
          documentoId: null,
          archivoId: null,
          storageKey: null,
          metadata: input.metadata,
        },
      })),
      marcarPutStartedProtegidoR2: jest.fn(async () => {
        events.push('CAS_PUT_STARTED');
        return true;
      }),
      marcarReconciliacionProtegidaR2: jest.fn(async () => true),
      marcarFallida: jest.fn(),
      marcarRequiereReconciliacion: jest.fn(),
    };

    const storage: any = {
      putObject: jest.fn(async (input: any) => {
        events.push('PUT');
        return {
          kind: 'CREATED',
          provider: 'r2',
          bucket: input.bucket,
          key: input.key,
        };
      }),
      deleteObject: jest.fn(),
    };

    const persistence: any = {
      persistirProtegidaR2: jest.fn(async () => ({
        operacionId: 50,
        documentoId: 100,
        archivoId: 200,
      })),
    };

    const period: any = {
      verificarIdentidadGrupo: jest.fn(async () => true),
      resolver: jest.fn(async () => ({
        fecha: new Date('2026-07-21T00:00:00Z'),
      })),
    };

    const config: any = {
      get: (key: string) => {
        if (key === 'DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED') return 'true';
        if (key === 'R2_BUCKET') return 'documentos';
        return undefined;
      },
    };

    const service = new CargaSeguraService(
      config,
      repository,
      storage,
      persistence,
      { compensate: jest.fn() } as any,
      period,
      tmpRepository,
    );

    return {
      service,
      events,
      storage,
      repository,
      persistence,
      confirmCommit,
    };
  }


  it.each([true, false])('reintento PUT_STARTED exige hash y tamaño y nunca repite PUT (%s)', async matches => {
    const h = setup();
    const hash = createHash('sha256').update(archivo).digest('hex');
    h.repository.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: {
      id: 50, workspaceId: 1, empresaCodigo: 'BBTI', clienteDestinoId: 2, expedienteId: 17,
      actorId: 1, canalIngreso: command.canalIngreso, estado: 'iniciada',
      requiereReconciliacion: false, documentoId: null, archivoId: null,
      storageBucket: 'documentos', storageKey: 'documentos/2026/07/BBTI/50__guia.pdf', hashSha256: hash,
      metadata: { r2IdentityV2: { version: 2, grupoFacturaId: 138, documentoBaseId: 486 },
        r2RecoveryV1: { version: 1, phase: 'PUT_STARTED', attempt: 1, fencingToken: 'fence',
          storageBucket: 'documentos', storageKey: 'documentos/2026/07/BBTI/50__guia.pdf' } },
    } });
    h.storage.statObject = jest.fn(async () => ({ exists: true, hashSha256: matches ? hash : 'different', tamanoBytes: archivo.length }));
    const result = await h.service.ejecutar(command);
    expect(result.kind).toBe(matches ? 'CREATED' : 'RECONCILIATION_REQUIRED');
    expect(h.storage.putObject).not.toHaveBeenCalled();
    expect(h.persistence.persistirProtegidaR2).toHaveBeenCalledTimes(matches ? 1 : 0);
    expect(h.repository.marcarPutStartedProtegidoR2).not.toHaveBeenCalled();
  });

  it.each([false, 'throw', true])('fallo PRE_PUT conserva excepción original con bookkeeping %s', async behavior => {
    const h = setup();
    h.confirmCommit();
    const original = new Error('resolution');
    (h.service as any).periodoR2.resolver.mockRejectedValueOnce(original);
    (h.repository as any).marcarFalloPrePutProtegidoR2 = jest.fn(async () => {
      if (behavior === 'throw') throw new Error('secondary');
      return behavior;
    });
    await expect(h.service.ejecutar(command)).rejects.toBe(original);
    expect((h.repository as any).marcarFalloPrePutProtegidoR2).toHaveBeenCalledTimes(1);
    expect(h.storage.putObject).not.toHaveBeenCalled();
    expect(h.repository.marcarPutStartedProtegidoR2).not.toHaveBeenCalled();
    expect(h.repository.marcarFallida).not.toHaveBeenCalled();
  });

  it('CAS rechazado impide PUT y persistencia documental', async () => {
    const h = setup();
    h.confirmCommit();

    h.repository.marcarPutStartedProtegidoR2.mockImplementationOnce(
      async () => {
        h.events.push('CAS_REJECTED');
        return false;
      },
    );

    const result = await h.service.ejecutar(command);

    expect(result).toMatchObject({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(h.events).toContain('CAS_REJECTED');
    expect(h.events).toContain('COMMIT');
    expect(h.events).not.toContain('PUT');

    expect(h.storage.putObject).not.toHaveBeenCalled();
    expect(h.storage.deleteObject).not.toHaveBeenCalled();
    expect(h.persistence.persistirProtegidaR2).not.toHaveBeenCalled();

    expect(h.repository.marcarFallida).not.toHaveBeenCalled();
    expect(h.repository.marcarRequiereReconciliacion).not.toHaveBeenCalled();
  });

  it('COMMIT fallido impide PUT y persistencia documental', async () => {
    const h = setup();

    h.confirmCommit();

    const tmpRepository = (h.service as any).tmpRepository;

    jest.spyOn(tmpRepository, 'lockedBounded').mockImplementation(
      async (_key: any, work: any) => {
        const connection: any = jest.fn();

        connection.unsafe = jest.fn(async (statement: string) => {
          h.events.push(statement);

          if (statement === 'COMMIT') {
            throw new Error('P3_COMMIT_UNCERTAIN');
          }

          return [];
        });

        return work(connection);
      },
    );

    const result = await h.service.ejecutar(command);

    expect(result).toMatchObject({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(h.events).toContain('CAS_PUT_STARTED');
    expect(h.events).toContain('COMMIT');
    expect(h.events).not.toContain('PUT');

    expect(h.storage.putObject).not.toHaveBeenCalled();
    expect(h.storage.deleteObject).not.toHaveBeenCalled();
    expect(h.persistence.persistirProtegidaR2).not.toHaveBeenCalled();

    expect(h.repository.marcarFallida).not.toHaveBeenCalled();
    expect(h.repository.marcarRequiereReconciliacion).not.toHaveBeenCalled();
  });

  it('impide PUT mientras COMMIT está pendiente', async () => {
    const h = setup();

    const execution = h.service.ejecutar(command);

    try {
      for (let i = 0; i < 30 && !h.events.includes('COMMIT'); i++) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }

      expect(h.events).toContain('CAS_PUT_STARTED');
      expect(h.events).toContain('COMMIT');
      expect(h.events).not.toContain('PUT');
      expect(h.storage.putObject).not.toHaveBeenCalled();
    } finally {
      h.confirmCommit();
    }

    await expect(execution).resolves.toMatchObject({
      kind: 'CREATED',
      operacionId: 50,
      documentoId: 100,
      archivoId: 200,
    });

    expect(h.storage.putObject).toHaveBeenCalledTimes(1);

    expect(h.events.indexOf('PUT')).toBeGreaterThan(
      h.events.indexOf('COMMIT'),
    );

    expect(h.repository.marcarFallida).not.toHaveBeenCalled();
    expect(h.repository.marcarRequiereReconciliacion).not.toHaveBeenCalled();
  });
});
