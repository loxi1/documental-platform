jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
jest.mock('@documental/database', () => ({
  sql: {},
}));

import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ArchivadoRuntimeService } from '../documentos/archivado/archivado-runtime.service';

import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import {
  R2CargaSeguraStorage,
} from '../documentos/carga-segura/carga-segura.storage';

import {
  ExpedientesImportacionRepository,
} from './expedientes-importacion.repository';

import {
  ExpedientesImportacionService,
  type ImportarExpedientesCsvInput,
} from './expedientes-importacion.service';

describe('ExpedientesImportacionService', () => {
  const repository = {
    reservar: jest.fn(),
    registrarR2Verificado: jest.fn(),
    confirmar: jest.fn(),
    registrarNasVerificado: jest.fn(),
    registrarEventoArchivado: jest.fn(),
    registrarErrorNas: jest.fn(),
  };

  const archivado = { archivarImportacionCsv: jest.fn() };
  const send = jest.fn();

  const storage = {
    putObject: jest.fn(),
    deleteObject: jest.fn(),
    getArchivadoClient: jest.fn(() => ({ send })),
  };

  const config = {
    get: jest.fn(),
  };

  const service = new ExpedientesImportacionService(
    repository as unknown as ExpedientesImportacionRepository,
    storage as unknown as R2CargaSeguraStorage,
    config as unknown as ConfigService,
    archivado as unknown as ArchivadoRuntimeService,
  );

  const contenido = Buffer.from(
    'codigo_expediente,descripcion\n' +
    '000001,ADMINISTRACIÓN\n' +
    '000002,OPERACIONES\n',
    'utf8',
  );

  const sha256 = createHash('sha256')
    .update(contenido)
    .digest('hex');

  const input: ImportarExpedientesCsvInput = {
    solicitudId: 'a1000000-0000-4000-8000-000000000001',

    contexto: {
      workspaceId: 1,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      usuarioId: 10,
      usuarioEmail: 'test@example.invalid',
      perfil: 'compras',
      requestId: null,
      sessionContextId: null,
    },

    nombreOriginal: 'centros-costo.csv',
    contenido,
  };

  const storageKey =
    'documentos/2026/11/BBTI/CENTROS_COSTO/' +
    'CENTROS_COSTO_20261126_162242381.csv';

  function reserva(
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: '100',
      solicitud_id: input.solicitudId,
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,

      storage_key: storageKey,
      r2_cuenta: 'test-account',
      r2_bucket: 'test-bucket',

      sha256, tamano_bytes: contenido.length,
      estado_importacion: 'pendiente',
      r2_estado: 'pendiente',
      nas_estado: 'pendiente',
      storage_provider: null,

      total_registros: 2,
      registros_insertados: 0,
      registros_existentes: 0,
      registros_modificados: 0,
      registros_duplicados_csv: 0,

      ...overrides,
    };
  }

  function confirmada(
    overrides: Record<string, unknown> = {},
  ) {
    return reserva({
      confirmado_en: new Date('2026-11-26T16:00:00Z'),
      estado_importacion: 'confirmada',
      r2_estado: 'verificado',
      storage_provider: 'R2',
      registros_insertados: 1,
      registros_existentes: 1,
      ...overrides,
    });
  }

  function objetoR2(
    overrides: Record<string, unknown> = {},
  ) {
    return {
      Body: Readable.from([contenido]),
      ContentLength: contenido.length,
      Metadata: { sha256 },
      ETag: '"test-etag"',
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();

    config.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        R2_ACCOUNT_ID: 'test-account',
        R2_BUCKET: 'test-bucket',
      };

      return values[key];
    });

    storage.getArchivadoClient.mockReturnValue({ send });

    repository.reservar.mockResolvedValue(reserva());

    storage.putObject.mockResolvedValue({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'test-bucket',
      key: storageKey,
      preexisting: false,
    });

    send.mockResolvedValue(objetoR2());

    repository.registrarR2Verificado.mockResolvedValue(
      reserva({
        r2_estado: 'verificado',
        storage_provider: 'R2',
      }),
    );

    repository.confirmar.mockResolvedValue(confirmada());
    archivado.archivarImportacionCsv.mockRejectedValue(new Error('ARCHIVADO_NO_HABILITADO'));
    repository.registrarErrorNas.mockImplementation(async()=>{
      const calls=repository.confirmar.mock.results;
      return await (calls.length?calls[calls.length-1].value:repository.reservar.mock.results[repository.reservar.mock.results.length-1].value);
    });
  });

  it('importa el CSV original y devuelve el resultado', async () => {
    const result = await service.importar(input);

    expect(result).toMatchObject({
      importacionId: '100',
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      totalRegistros: 2,
      registrosInsertados: 1,
      registrosExistentes: 1,
      registrosDuplicadosCsv: 0,
      registrosModificados: 0,
      estado: 'confirmada',
      storageProvider: 'R2',
    });

    expect(storage.putObject).toHaveBeenCalledWith({
      provider: 'r2',
      bucket: 'test-bucket',
      key: storageKey,
      body: contenido,
      contentType: 'text/csv',
      hashSha256: sha256,
    });

    expect(repository.registrarR2Verificado)
      .toHaveBeenCalledWith(
        expect.anything(),
        {
          cuenta: 'test-account',
          bucket: 'test-bucket',
          storageKey,
          sha256,
          tamanoBytes: contenido.length,
          etag: '"test-etag"',
        },
      );

    const order = [
      repository.reservar.mock.invocationCallOrder[0],
      storage.putObject.mock.invocationCallOrder[0],
      send.mock.invocationCallOrder[0],
      repository.registrarR2Verificado
        .mock.invocationCallOrder[0],
      repository.confirmar.mock.invocationCallOrder[0],
    ];

    expect(order).toEqual(
      [...order].sort((a, b) => a - b),
    );
  });

  it('preserva los codigos con ceros iniciales', async () => {
    await service.importar(input);

    expect(repository.reservar).toHaveBeenCalledWith(
      expect.objectContaining({
        csv: expect.objectContaining({
          rows: [
            {
              codigo_expediente: '000001',
              descripcion: 'ADMINISTRACIÓN',
            },
            {
              codigo_expediente: '000002',
              descripcion: 'OPERACIONES',
            },
          ],
        }),
      }),
    );
  });

  it('rechaza CSV invalido sin reservar ni almacenar', async () => {
    await expect(
      service.importar({
        ...input,
        contenido: Buffer.from('archivo invalido'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('rechaza contexto empresarial invalido', async () => {
    await expect(
      service.importar({
        ...input,
        contexto: {
          ...input.contexto,
          clienteDestinoId: 0,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('rechaza archivo sin extension CSV', async () => {
    await expect(
      service.importar({
        ...input,
        nombreOriginal: 'archivo.pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('rechaza solicitud invalida', async () => {
    await expect(
      service.importar({
        ...input,
        solicitudId: 'invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('rechaza archivo vacio', async () => {
    await expect(
      service.importar({
        ...input,
        contenido: Buffer.alloc(0),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('rechaza archivo superior al limite', async () => {
    await expect(
      service.importar({
        ...input,
        contenido: Buffer.alloc(2 * 1024 * 1024 + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('rechaza configuracion R2 incompleta', async () => {
    config.get.mockReturnValue(undefined);

    await expect(
      service.importar(input),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(repository.reservar).not.toHaveBeenCalled();
  });

  it('no almacena cuando falla la reserva', async () => {
    repository.reservar.mockRejectedValue(
      new Error('RESERVA_FALLIDA'),
    );

    await expect(
      service.importar(input),
    ).rejects.toThrow('RESERVA_FALLIDA');

    expect(storage.putObject).not.toHaveBeenCalled();
    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('no confirma cuando R2 falla', async () => {
    storage.putObject.mockRejectedValue(
      new Error('R2_NO_DISPONIBLE'),
    );

    await expect(
      service.importar(input),
    ).rejects.toThrow('R2_NO_DISPONIBLE');

    expect(send).not.toHaveBeenCalled();

    expect(repository.registrarR2Verificado)
      .not.toHaveBeenCalled();

    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('rechaza una reserva de otro bucket', async () => {
    repository.reservar.mockResolvedValue(
      reserva({ r2_bucket: 'otro-bucket' }),
    );

    await expect(
      service.importar(input),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(storage.putObject).not.toHaveBeenCalled();
    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('rechaza evidencia con tamano incorrecto', async () => {
    send.mockResolvedValue(
      objetoR2({
        ContentLength: contenido.length + 1,
      }),
    );

    await expect(
      service.importar(input),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('rechaza bytes alterados aunque coincida la metadata', async () => {
    const alterado = Buffer.from(contenido);

    alterado[0] ^= 1;

    send.mockResolvedValue(
      objetoR2({
        Body: Readable.from([alterado]),
      }),
    );

    await expect(
      service.importar(input),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.registrarR2Verificado)
      .not.toHaveBeenCalled();

    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('reutiliza el archivo previamente verificado', async () => {
    repository.reservar.mockResolvedValue(
      reserva({
        r2_estado: 'verificado',
        storage_provider: 'R2',
      }),
    );

    await service.importar(input);

    expect(storage.putObject).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(repository.confirmar).toHaveBeenCalledTimes(1);
  });

  it('devuelve una solicitud confirmada sin repetir operaciones', async () => {
    repository.reservar.mockResolvedValue(confirmada());

    const result = await service.importar(input);

    expect(result.estado).toBe('confirmada');

    expect(storage.putObject).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(repository.confirmar).not.toHaveBeenCalled();
  });

  it('acepta una importacion sin centros de costo nuevos', async () => {
    repository.confirmar.mockResolvedValue(
      confirmada({
        registros_insertados: 0,
        registros_existentes: 2,
      }),
    );

    const result = await service.importar(input);

    expect(result.registrosInsertados).toBe(0);
    expect(result.registrosExistentes).toBe(2);
    expect(result.estado).toBe('confirmada');
  });

  it('devuelve el contador real de descripciones modificadas', async () => {
    repository.confirmar.mockResolvedValue(
      confirmada({
        registros_insertados: 0,
        registros_existentes: 1,
        registros_modificados: 1,
      }),
    );

    expect(await service.importar(input)).toMatchObject({
      registrosInsertados: 0,
      registrosExistentes: 1,
      registrosModificados: 1,
      estado: 'confirmada',
    });
  });

  it('reintento confirmado conserva modificaciones historicas', async () => {
    repository.reservar.mockResolvedValue(
      confirmada({
        registros_insertados: 0,
        registros_existentes: 0,
        registros_modificados: 2,
        nas_estado: 'verificado',
        storage_provider: 'NAS',
        r2_estado: 'eliminado',
      }),
    );

    expect(await service.importar(input)).toMatchObject({
      registrosInsertados: 0,
      registrosExistentes: 0,
      registrosModificados: 2,
      estado: 'confirmada',
    });

    expect(repository.confirmar).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(archivado.archivarImportacionCsv).not.toHaveBeenCalled();
  });

  it('propaga el fallo SQL posterior al almacenamiento', async () => {
    repository.confirmar.mockRejectedValue(
      new Error('CONFIRMACION_SQL_FALLIDA'),
    );

    await expect(
      service.importar(input),
    ).rejects.toThrow('CONFIRMACION_SQL_FALLIDA');

    expect(storage.putObject).toHaveBeenCalledTimes(1);

    expect(repository.registrarR2Verificado)
      .toHaveBeenCalledTimes(1);
  });

  function nasExitoso(){
    archivado.archivarImportacionCsv.mockImplementation(async(data,persistir)=>{const proof={...data,nasDestino:'SYNOLOGY_DEV',nasSha256:data.sha256,nasTamanoBytes:data.tamanoBytes};await persistir('NAS_VERIFICADO',proof,{});return proof;});
    repository.registrarEventoArchivado.mockResolvedValue(confirmada({nas_estado:'verificado',storage_provider:'NAS'}));
  }
  it('archiva despues del commit y registra NAS solo con la prueba institucional',async()=>{
    nasExitoso();const result=await service.importar(input);
    expect(result).toMatchObject({estado:'confirmada',nasEstado:'verificado',storageProvider:'NAS'});
    expect(archivado.archivarImportacionCsv).toHaveBeenCalledWith({origen:'EXPEDIENTES_IMPORTACION',importacionId:'100',
      solicitudId:input.solicitudId,empresaCodigo:'BBTI',cuenta:'test-account',bucket:'test-bucket',storageKey,sha256,tamanoBytes:contenido.length,workspaceId:1,clienteDestinoId:2,usuarioId:10},expect.any(Function));
    const orden=[repository.confirmar.mock.invocationCallOrder[0],archivado.archivarImportacionCsv.mock.invocationCallOrder[0],repository.registrarEventoArchivado.mock.invocationCallOrder[0]];
    expect(orden).toEqual([...orden].sort((a,b)=>a-b));expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('un commit rechazado nunca inicia NAS',async()=>{
    repository.confirmar.mockRejectedValue(new Error('SQL_ROLLBACK'));
    await expect(service.importar(input)).rejects.toThrow('SQL_ROLLBACK');expect(archivado.archivarImportacionCsv).not.toHaveBeenCalled();
  });
  it('conserva R2 e importacion confirmada si NAS falla',async()=>{
    archivado.archivarImportacionCsv.mockRejectedValue(new Error('ARCHIVADO_SMB_IO_FAILED'));
    expect(await service.importar(input)).toMatchObject({estado:'confirmada',nasEstado:'pendiente',storageProvider:'R2'});
    expect(repository.registrarErrorNas).toHaveBeenCalledWith(expect.anything(),'ARCHIVADO_SMB_IO_FAILED');
    expect(repository.registrarNasVerificado).not.toHaveBeenCalled();expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('integridad incorrecta no acredita disponibilidad NAS',async()=>{
    archivado.archivarImportacionCsv.mockRejectedValue(new Error('ARCHIVADO_INTEGRIDAD_NO_COINCIDE'));
    expect(await service.importar(input)).toMatchObject({storageProvider:'R2',nasEstado:'pendiente'});
    expect(repository.registrarNasVerificado).not.toHaveBeenCalled();expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('reintento confirmado recupera solo NAS y conserva exactamente la ruta persistida',async()=>{
    nasExitoso();const original=storageKey.replace('/2026/11/','/2025/01/').replace('20261126','20250101');
    repository.reservar.mockResolvedValue(confirmada({storage_key:original}));
    await service.importar(input);
    expect(archivado.archivarImportacionCsv).toHaveBeenCalledWith(expect.objectContaining({storageKey:original,importacionId:'100'}),expect.any(Function));
    expect(repository.confirmar).not.toHaveBeenCalled();expect(repository.registrarR2Verificado).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('solicitud ya archivada y eliminada no vuelve a transferir',async()=>{
    repository.reservar.mockResolvedValue(confirmada({nas_estado:'verificado',storage_provider:'NAS',r2_estado:'eliminado'}));
    expect(await service.importar(input)).toMatchObject({nasEstado:'verificado',storageProvider:'NAS'});
    expect(archivado.archivarImportacionCsv).not.toHaveBeenCalled();expect(repository.confirmar).not.toHaveBeenCalled();expect(storage.putObject).not.toHaveBeenCalled();
  });
  it('no declara NAS si falla la persistencia de su verificacion',async()=>{
    nasExitoso();repository.registrarEventoArchivado.mockRejectedValue(new Error('SQL_UNAVAILABLE'));
    expect(await service.importar(input)).toMatchObject({estado:'confirmada',storageProvider:'R2',nasEstado:'pendiente'});
    expect(repository.registrarErrorNas).toHaveBeenCalledWith(expect.anything(),'IMPORTACION_NAS_FALLIDA');
  });

  it('DELETE incierto preserva NAS y la importacion confirmada sin nuevo PUT',async()=>{
    repository.reservar.mockResolvedValue(confirmada({nas_estado:'verificado',storage_provider:'NAS'}));
    repository.registrarEventoArchivado.mockImplementation(async(_command,event)=>confirmada({nas_estado:'verificado',storage_provider:'NAS',r2_estado:event==='DELETE_INCIERTO'?'eliminacion_incierta':'eliminacion_pendiente'}));
    archivado.archivarImportacionCsv.mockImplementation(async(data,persist)=>{
      await persist('DELETE_INTENT',{...data,nasDestino:'SYNOLOGY_DEV'},{});
      await persist('DELETE_INCIERTO',{...data,nasDestino:'SYNOLOGY_DEV'},{});throw new Error('LOST_DELETE_RESPONSE');
    });
    expect(await service.importar(input)).toMatchObject({estado:'confirmada',storageProvider:'NAS',nasEstado:'verificado'});
    expect(repository.confirmar).not.toHaveBeenCalled();expect(storage.putObject).not.toHaveBeenCalled();
    expect(repository.registrarErrorNas).not.toHaveBeenCalled();
  });
});
