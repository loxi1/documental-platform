jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { sql } from '@documental/database';
import { ForbiddenException } from '@nestjs/common';
import { resolverIdentidadVersionDocumental } from './carga-segura/http/carga-segura-http.validation';
import { DocumentosUploadService } from './documentos-upload.service';
import { PeriodoDocumentalR2Repository } from './periodo-documental-r2.repository';
import { CargaSeguraService } from './carga-segura/carga-segura.service';
import { CargaSeguraRepository } from './carga-segura/carga-segura.repository';
import { calculateCargaSeguraFingerprint, calculateCargaSeguraR2Fingerprint } from './carga-segura/carga-segura.fingerprint';

const actor = { workspaceId: 1, empresaCodigo: 'BBTI', clienteDestinoId: 2, actorId: 3, requestId: 'request', correlationId: 'request' };
const headers = { workspaceId: '1', empresaCodigo: 'BBTI', clienteDestinoId: '2', actorId: undefined,
  userId: '3', requestId: 'request', correlationId: undefined };
const file = { buffer: Buffer.from('pdf'), originalname: 'test.pdf', mimetype: 'application/pdf' };
const command = { ...actor, expedienteId: 118, grupoFacturaId: 138, documentoBaseId: 486,
  idempotencyKey: 'key', canalIngreso: 'ALMACEN_LEGACY_UPLOAD_GUIA', tipoDocumental: 'GUIA_REMISION',
  tipoRelacion: 'adjunto_guia', esPrincipal: false, nombreArchivo: 'test.pdf', contentType: 'application/pdf',
  tamanoBytes: 3, archivo: file.buffer, metadata: {} };
const payload = { ...command, hashSha256: 'a'.repeat(64) };
const row = { ...actor, id: 50, expedienteId: 118, canalIngreso: command.canalIngreso, estado: 'completada',
  documentoId: 100, archivoId: 200, hashSha256: payload.hashSha256, fingerprintVersion: 'canonical-json-v1' };
const relacion = { facturaDocumentoId: 487, fechaEmision: '2026-07-21', empresaCodigo: 'BBTI',
  clienteDestinoId: 2, expedienteId: 118, integridadValida: true };

describe('P1: identidad autenticada y versiones por relación persistida', () => {
  beforeEach(() => jest.resetAllMocks());
  it('resuelve identidad sin exigir key pública', () => {
    expect(resolverIdentidadVersionDocumental(headers)).toEqual(actor);
  });
  it.each(['workspaceId', 'clienteDestinoId', 'userId', 'empresaCodigo'] as const)('rechaza %s ausente', field => {
    expect(() => resolverIdentidadVersionDocumental({ ...headers, [field]: undefined })).toThrow();
  });
  it('rechaza actor/user incompatibles y headers múltiples', () => {
    expect(() => resolverIdentidadVersionDocumental({ ...headers, actorId: '9' })).toThrow();
    expect(() => resolverIdentidadVersionDocumental({ ...headers, workspaceId: ['1','2'] })).toThrow();
  });
  it.each(['FACTURA', 'GUIA_REMISION'])('deriva expediente único para %s', async tipo => {
    (sql as unknown as jest.Mock).mockResolvedValue([relacion]);
    await expect(new PeriodoDocumentalR2Repository().resolverParaVersion(actor, 487, tipo))
      .resolves.toMatchObject({ anio: '2026', mes: '07' });
  });
  it.each([
    [], [relacion, { ...relacion, expedienteId: 999 }], [{ ...relacion, clienteDestinoId: 9 }],
    [{ ...relacion, fechaEmision: '2026-02-31' }], [{ ...relacion, integridadValida: false }],
  ])('rechaza relaciones inválidas sin elegir primera', async (...rows: any[]) => {
    // Each table entry represents the full SQL result.
    (sql as unknown as jest.Mock).mockResolvedValue(rows);
    await expect(new PeriodoDocumentalR2Repository().resolverParaVersion(actor, 487, 'FACTURA')).rejects.toThrow();
  });
  it.each(['FACTURA','GUIA_REMISION'])('usa periodo para candidata %s sin promover', async tipo => {
    const period = { resolverParaVersion: jest.fn().mockResolvedValue({ fecha: new Date('2026-07-21T00:00:00Z') }) };
    const svc = new DocumentosUploadService({} as any, {} as any, {} as any, period as any, {} as any);
    const put = jest.spyOn(svc as any, 'subirAR2').mockResolvedValue(undefined);
    jest.spyOn(svc as any, 'resolveBucket').mockReturnValue('dev');
    (sql as unknown as jest.Mock).mockResolvedValueOnce([{ id: 487, tipo_documental: tipo, cliente_abreviatura: 'BBTI' }])
      .mockResolvedValueOnce([{ id: 999 }]);
    await expect(svc.subirVersionDocumentoExistente(487, file, {}, actor)).resolves.toMatchObject({ esVersionActual: false });
    expect(put.mock.calls[0][0]).toMatchObject({ storageKey: expect.stringMatching(/^documentos\/2026\/07\/BBTI\//) });
    expect(period.resolverParaVersion).toHaveBeenCalledWith(actor, 487, tipo);
    const queries = (sql as unknown as jest.Mock).mock.calls.map(c => c[0].join(' ')).join('\n');
    expect(queries).not.toMatch(/UPDATE|DELETE/);
  });
  it.each([{ workspaceId: 9 }, { clienteDestinoId: 9 }, { empresaCodigo: 'OTRA' }, { actorId: 9 }])('body no reemplaza identidad %j', async input => {
    const svc = new DocumentosUploadService({} as any, {} as any, {} as any, {} as any);
    const put = jest.spyOn(svc as any, 'subirAR2');
    await expect(svc.subirVersionDocumentoExistente(487, file, input, actor)).rejects.toThrow('VERSION_CONTEXTO_INCOMPATIBLE');
    expect(sql).not.toHaveBeenCalled(); expect(put).not.toHaveBeenCalled();
  });
});

function harness(bucket: string | undefined = 'dev') {
  const repo = { reservar: jest.fn().mockResolvedValue({ kind: 'RESERVED', operacion: row }),
    marcarFallida: jest.fn().mockResolvedValue(true) };
  const storage = { putObject: jest.fn() };
  const period = { resolver: jest.fn(), verificarIdentidadGrupo: jest.fn().mockResolvedValue(true) };
  const svc = new CargaSeguraService({ get: (key: string) => key === 'DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED' ? 'true' : bucket } as any,
    repo as any, storage as any, {} as any, {} as any, period as any, {} as any);
  return { svc, repo, storage, period };
}
describe('P2/P4: compatibilidad, identidad y errores', () => {
  beforeEach(() => jest.resetAllMocks());
  it('v1 no incluye nuevos IDs; v2 distingue grupo y base', () => {
    const v1 = calculateCargaSeguraFingerprint(payload);
    expect(calculateCargaSeguraFingerprint({ ...payload, grupoFacturaId: 999 } as any)).toEqual(v1);
    const v2 = calculateCargaSeguraR2Fingerprint(payload);
    expect(v2.version).toBe('canonical-json-r2-v2');
    expect(v2.fingerprint).not.toBe(calculateCargaSeguraR2Fingerprint({ ...payload, grupoFacturaId: 999 }).fingerprint);
    expect(v2.fingerprint).not.toBe(calculateCargaSeguraR2Fingerprint({ ...payload, documentoBaseId: 999 }).fingerprint);
  });
  it.each(['canonical-json-v1','canonical-json-r2-v2','future'])('comparación persistida %s sin downgrade', version => {
    const repo = new CargaSeguraRepository() as any;
    const input = { payloadFingerprint: 'v2', legacyPayloadFingerprint: 'v1', fingerprintVersion: 'canonical-json-r2-v2' };
    expect(repo.fingerprintMatches({ fingerprintVersion: version, payloadFingerprint: version === 'canonical-json-v1' ? 'v1' : 'v2' }, input))
      .toBe(version !== 'future');
    expect(repo.fingerprintMatches({ fingerprintVersion: version, payloadFingerprint: 'other' }, input)).toBe(false);
  });
  it('bucket ausente no reserva ni PUT', async () => {
    const h = harness(''); await expect(h.svc.ejecutar(command)).rejects.toThrow();
    expect(h.repo.reservar).not.toHaveBeenCalled(); expect(h.storage.putObject).not.toHaveBeenCalled();
  });
  it.each([false, 'throw'])('bookkeeping %s preserva excepción original', async behavior => {
    const h = harness(); const original = new ForbiddenException('scope');
    h.period.resolver.mockRejectedValue(original);
    if (behavior === 'throw') h.repo.marcarFallida.mockRejectedValue(new Error('secondary'));
    else h.repo.marcarFallida.mockResolvedValue(false);
    await expect(h.svc.ejecutar(command)).rejects.toBe(original);
    expect(h.storage.putObject).not.toHaveBeenCalled();
  });
  it.each(['canonical-json-v1','canonical-json-r2-v2'])('replay %s acredita relación sin periodo ni PUT', async version => {
    const h = harness(); h.repo.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: { ...row, fingerprintVersion: version } });
    await expect(h.svc.ejecutar(command)).resolves.toMatchObject({ kind: 'REPLAYED' });
    expect(h.period.verificarIdentidadGrupo).toHaveBeenCalledWith(expect.anything(), { grupoFacturaId: 138, documentoBaseId: 486, documentoId: 100 });
    expect(h.period.resolver).not.toHaveBeenCalled(); expect(h.storage.putObject).not.toHaveBeenCalled();
  });
  it('legacy ambiguo exige reconciliación sin PUT', async () => {
    const h = harness(); h.repo.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: row });
    h.period.verificarIdentidadGrupo.mockResolvedValue(false);
    await expect(h.svc.ejecutar(command)).resolves.toMatchObject({ kind: 'RECONCILIATION_REQUIRED' });
    expect(h.storage.putObject).not.toHaveBeenCalled();
  });
  it('grupo/base ajenos no alcanzan periodo ni PUT', async () => {
    const h = harness(); h.period.verificarIdentidadGrupo.mockResolvedValue(false);
    await expect(h.svc.ejecutar(command)).rejects.toThrow();
    expect(h.period.resolver).not.toHaveBeenCalled(); expect(h.storage.putObject).not.toHaveBeenCalled();
  });
});

describe('P2: prueba SQL de identidad y P4 resultado incierto', () => {
  beforeEach(() => jest.resetAllMocks());
  it.each([[], [{ grupoId: 138, baseId: 999 }], [{ grupoId: 999, baseId: 486 }],
    [{ grupoId: 138, baseId: 486 }, { grupoId: 138, baseId: 486 }]])('identidad no única o incompatible no prueba replay', async (...rows: any[]) => {
    (sql as unknown as jest.Mock).mockResolvedValue(rows);
    await expect(new PeriodoDocumentalR2Repository().verificarIdentidadGrupo(command, command)).resolves.toBe(false);
  });
  it('identidad válida usa alcance y vínculo activo, sin resolver fecha histórica', async () => {
    (sql as unknown as jest.Mock).mockResolvedValue([{ grupoId: '138', baseId: '486' }]);
    await expect(new PeriodoDocumentalR2Repository().verificarIdentidadGrupo(command,
      { grupoFacturaId: 138, documentoBaseId: 486, documentoId: 100 })).resolves.toBe(true);
    const [strings, ...values] = (sql as unknown as jest.Mock).mock.calls[0];
    const query = strings.join(' ');
    expect(query).toContain("v.estado = 'activo'"); expect(query).toContain('c.cliente_destino_id');
    expect(query).not.toMatch(/fecha_emision|LIMIT 1/); expect(values).toEqual(expect.arrayContaining([138,486,'BBTI',2,118,100]));
  });
  it('PUT incierto registra destino para reconciliación protegida P3', async () => {
    const events: string[] = [];

    const localRepo: any = {
      reservar: jest.fn(async (input: any) => ({
        kind: 'RESERVED',
        operacion: {
          ...row,
          estado: 'iniciada',
          documentoId: null,
          archivoId: null,
          metadata: input.metadata,
        },
      })),
      marcarPutStartedProtegidoR2: jest.fn(async () => {
        events.push('CAS');
        return true;
      }),
      marcarReconciliacionProtegidaR2: jest.fn(async () => {
        events.push('RECONCILIATION');
        return true;
      }),
      marcarRequiereReconciliacion: jest.fn(),
      marcarFallida: jest.fn(),
    };

    const localStorage: any = {
      putObject: jest.fn(async () => {
        events.push('PUT');
        throw new Error('timeout');
      }),
      deleteObject: jest.fn(),
    };

    const localPersistence: any = {
      persistir: jest.fn(),
      persistirProtegidaR2: jest.fn(),
    };

    const connection: any = jest.fn();
    connection.unsafe = jest.fn(async () => []);

    const tmpRepository: any = {
      lockedBounded: jest.fn(async (_key: string, work: any) =>
        work(connection),
      ),
      transaction: jest.fn(async (_connection: any, work: any) => {
        const result = await work(connection);
        events.push('COMMIT');
        return result;
      }),
    };

    const period: any = {
      resolver: jest.fn(async () => ({
        fecha: new Date('2026-07-21T00:00:00Z'),
      })),
      verificarIdentidadGrupo: jest.fn(async () => true),
    };

    const config: any = {
      get: (key: string) =>
        key === 'DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED'
          ? 'true'
          : key === 'R2_BUCKET'
            ? 'dev'
            : undefined,
    };

    const svc = new CargaSeguraService(
      config,
      localRepo,
      localStorage,
      localPersistence,
      { compensate: jest.fn() } as any,
      period,
      tmpRepository,
    );

    const result = await svc.ejecutar(command);

    expect(result).toMatchObject({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 50,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    expect(localRepo.marcarPutStartedProtegidoR2)
      .toHaveBeenCalledTimes(1);

    expect(localStorage.putObject).toHaveBeenCalledTimes(1);

    expect(localRepo.marcarReconciliacionProtegidaR2)
      .toHaveBeenCalledWith(
        connection,
        expect.objectContaining({
          operacionId: 50,
          workspaceId: 1,
          empresaCodigo: 'BBTI',
          storageBucket: 'dev',
          storageKey: 'documentos/2026/07/BBTI/50__test.pdf',
          fencingToken: expect.any(String),
          attempt: 1,
          errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
        }),
      );

    const reservationMetadata =
      localRepo.reservar.mock.calls[0][0].metadata;

    expect(reservationMetadata.r2RecoveryV1).toMatchObject({
      version: 1,
      phase: 'PRE_PUT',
      attempt: 1,
      fencingToken: expect.any(String),
    });

    expect(events.indexOf('CAS')).toBeGreaterThan(-1);
    expect(events.indexOf('PUT')).toBeGreaterThan(
      events.indexOf('COMMIT'),
    );
    expect(events.indexOf('RECONCILIATION')).toBeGreaterThan(
      events.indexOf('PUT'),
    );

    expect(localPersistence.persistir).not.toHaveBeenCalled();
    expect(localPersistence.persistirProtegidaR2)
      .not.toHaveBeenCalled();

    expect(localStorage.deleteObject).not.toHaveBeenCalled();
    expect(localRepo.marcarRequiereReconciliacion)
      .not.toHaveBeenCalled();
    expect(localRepo.marcarFallida).not.toHaveBeenCalled();
  });
});

describe('P2: contrato interno y canales', () => {
  it.each(['r2IdentityV2','r2RecoveryV1'])('rechaza metadata cliente %s', async key => {
    const h = harness();
    await expect(h.svc.ejecutar({ ...command, metadata: { [key]: {} } })).rejects.toThrow();
    expect(h.repo.reservar).not.toHaveBeenCalled();
  });
  it('nueva Guía reserva v2 y protocolo P3; rechaza identidad incompatible', async () => {
    const h = harness(); h.period.verificarIdentidadGrupo.mockResolvedValue(false);
    await expect(h.svc.ejecutar(command)).rejects.toThrow();
    expect(h.repo.reservar).toHaveBeenCalledWith(expect.objectContaining({
      fingerprintVersion: 'canonical-json-r2-v2',
      metadata: expect.objectContaining({
        r2IdentityV2: expect.objectContaining({
          version: 2, grupoFacturaId: 138, documentoBaseId: 486,
        }),
        r2RecoveryV1: expect.objectContaining({
          version: 1,
          phase: 'PRE_PUT',
          attempt: 1,
          fencingToken: expect.any(String),
        }),
      }),
    }));
    expect(h.storage.putObject).not.toHaveBeenCalled();
  });
  it('otros canales conservan v1', async () => {
    const h = harness(); h.repo.reservar.mockResolvedValue({ kind: 'REPLAYED', operacion: row });
    await h.svc.ejecutar({ ...command, canalIngreso: 'WEB_ADMIN_GUIADO' });
    expect(h.repo.reservar).toHaveBeenCalledWith(expect.objectContaining({ fingerprintVersion: 'canonical-json-v1' }));
    expect(h.period.verificarIdentidadGrupo).not.toHaveBeenCalled();
  });
});
