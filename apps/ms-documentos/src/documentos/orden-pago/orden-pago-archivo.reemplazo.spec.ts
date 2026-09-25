jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    OcrProcesarArchivo: 'ocr.procesar-archivo',
  },
}));

import { ConflictException } from '@nestjs/common';
import { OrdenPagoArchivoService } from './orden-pago-archivo.service';

describe('R23 reemplazo archivo inicial OP', () => {
  const actor: any = {
    id: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: 'req-r23',
    correlationId: 'corr-r23',
  };

  const identity = '571997eb-0175-4eb1-a287-11a8df3de272';

  const detalle = {
    ordenPagoId: 151,
    documentoId: 210,
    grupoFacturaId: 114,
    contenedorOperativoId: 7,
    archivoInicial: {
      archivoId: 441,
      nombreArchivo: 'anterior.pdf',
    },
  };

  function setup(options?: {
    alreadyCurrent?: boolean;
    foreignTemp?: boolean;
    wrongOrigin?: boolean;
  }) {
    const state: any = {
      row: {
        id: 50,
        actor_id: options?.foreignTemp ? 99 : 6,
        workspace_id: 12,
        empresa_codigo: 'BBTI',
        cliente_destino_id: 2,
        estado: 'almacenada',
        promovida_en: null,
        documento_id: null,
        archivo_id: null,
        metadata: {},
        storage_bucket: 'lab',
        storage_key: 'documentos/tmp/12/50',
        nombre_archivo_original: 'nuevo.pdf',
        content_type: 'application/pdf',
        hash_sha256: 'a'.repeat(64),
        tamano_bytes: 100,
        iniciada_en: '2026-09-25T12:00:00Z',
      },
    };

    const op: any = {
      obtenerDetalle: jest.fn(async () => structuredClone(detalle)),
    };

    const repository: any = {
      assertReplacementClaim: jest.fn(),
      reserveReplacement: jest.fn(async (_tx, row, ids, key, destination) => {
        row.documento_id = ids.documentoId;
        row.metadata = {
          ...row.metadata,
          destinoReservado: destination,
          promocionIdentity: key,
          integration: {
            consumer: 'OP_INITIAL_FILE_REPLACEMENT',
            identity: key,
            completed: false,
          },
        };
      }),
      completeReplacementCandidate: jest.fn(
        async (_tx, row, ids, _key, destination) => {
          row.documento_id = ids.documentoId;
          row.archivo_id = 550;
          row.metadata.integration.completed = true;
          row.destino_storage_key = destination;
          return 550;
        },
      ),
    };

    const tx: any = {};

    const temps: any = {
      locked: jest.fn(async (_key: string, work: any) => {
        if (
          options?.foreignTemp &&
          state.row.actor_id !== actor.id
        ) {
          throw new ConflictException('TEMP no disponible');
        }
        return work(tx);
      }),
      transaction: jest.fn(async (_c: any, work: any) => work(tx)),
      own: jest.fn(async () => state.row),
    };

    const tmp: any = {
      promote: jest.fn(async (
        _tempId: number,
        _tmpActor: any,
        destination: string,
        integration: any,
      ) => {
        await integration.persist(tx, state.row, destination);
        return {
          estado: 'PROMOTED',
          destinoStorageKey: destination,
        };
      }),
    };

    const documentos: any = {
      obtenerEstadoArchivoVersion: jest.fn(async () => ({
        id: 550,
        documento_id: 210,
        version: options?.alreadyCurrent ? 2 : null,
        es_version_actual: options?.alreadyCurrent === true,
        estado: 'subido',
        area_origen: 'FINANZAS',
        origen_archivo: options?.wrongOrigin ? 'OTRO' : 'OP_INICIAL',
        metadata: {
          rol: 'ARCHIVO_INICIAL_OP',
          tipoPrincipal: 'ORDEN_PAGO',
        },
      })),
      agregarArchivoComoVersion: jest.fn(async () => ({
        ok: true,
        documentoId: 210,
        archivoId: 550,
        version: 2,
        esVersionActual: true,
      })),
    };

    const auditoria: any = {
      registrarEdicion: jest.fn(async () => undefined),
    };

    const service = new OrdenPagoArchivoService(
      op,
      repository,
      temps,
      tmp,
      documentos,
      auditoria,
    );

    return {
      service,
      op,
      repository,
      temps,
      tmp,
      documentos,
      auditoria,
      state,
    };
  }

  it('preserva OP/documento/grupo/contenedor y versiona el candidato sobre el mismo documento', async () => {
    const x = setup();

    const result: any = await x.service.reemplazarArchivoInicial(
      151,
      { tempId: 50 },
      identity,
      actor,
    );

    expect(x.op.obtenerDetalle).toHaveBeenCalledWith(151, actor);

    expect(x.repository.reserveReplacement).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        ordenPagoId: 151,
        documentoId: 210,
        grupoFacturaId: 114,
        contenedorOperativoId: 7,
      }),
      identity,
      expect.any(String),
    );

    expect(x.documentos.agregarArchivoComoVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        documentoId: 210,
        archivoId: 550,
        marcarComoActual: true,
        areaOrigen: 'FINANZAS',
        origenArchivo: 'OP_INICIAL',
        metadataMerge: expect.objectContaining({
          rol: 'ARCHIVO_INICIAL_OP',
          tipoPrincipal: 'ORDEN_PAGO',
          reemplazoArchivoInicial: true,
          tempId: 50,
        }),
      }),
    );

    expect(result).toMatchObject({
      ordenPagoId: 151,
      documentoId: 210,
      grupoFacturaId: 114,
      contenedorOperativoId: 7,
      idempotente: false,
      archivoInicial: {
        tempId: 50,
        archivoId: 550,
        oldArchivoId: 441,
        version: 2,
        esVersionActual: true,
      },
    });

    expect(x.auditoria.registrarEdicion).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'EDITAR_OP',
        entidad: 'documento_archivo',
        entidadId: 550,
        antes: expect.objectContaining({
          ordenPagoId: 151,
          documentoId: 210,
          grupoFacturaId: 114,
          archivoId: 441,
        }),
        despues: expect.objectContaining({
          oldArchivoId: 441,
          newArchivoId: 550,
          version: 2,
          esVersionActual: true,
          origenArchivo: 'OP_INICIAL',
        }),
      }),
    );
  });

  it('replay con candidato ya actual no genera una versión adicional', async () => {
    const x = setup({ alreadyCurrent: true });

    const result: any = await x.service.reemplazarArchivoInicial(
      151,
      { tempId: 50 },
      identity,
      actor,
    );

    expect(x.documentos.agregarArchivoComoVersion).not.toHaveBeenCalled();
    expect(x.auditoria.registrarEdicion).not.toHaveBeenCalled();
    expect(result.idempotente).toBe(true);
    expect(result.archivoInicial.archivoId).toBe(550);
    expect(result.archivoInicial.version).toBe(2);
    expect(result.archivoInicial.esVersionActual).toBe(true);
  });

  it('rechaza TEMP de otro actor antes de promover o versionar', async () => {
    const x = setup({ foreignTemp: true });

    await expect(
      x.service.reemplazarArchivoInicial(
        151,
        { tempId: 50 },
        identity,
        actor,
      ),
    ).rejects.toThrow('TEMP no disponible');

    expect(x.tmp.promote).not.toHaveBeenCalled();
    expect(x.documentos.agregarArchivoComoVersion).not.toHaveBeenCalled();
  });

  it('rechaza candidato que perdió semántica OP_INICIAL', async () => {
    const x = setup({ wrongOrigin: true });

    await expect(
      x.service.reemplazarArchivoInicial(
        151,
        { tempId: 50 },
        identity,
        actor,
      ),
    ).rejects.toThrow('OP_REPLACEMENT_FILE_CONFLICT');

    expect(x.documentos.agregarArchivoComoVersion).not.toHaveBeenCalled();
  });

  it('body no puede introducir IDs estructurales ni tenant', async () => {
    const x = setup();

    await expect(
      x.service.reemplazarArchivoInicial(
        151,
        {
          tempId: 50,
          documentoId: 999,
          grupoFacturaId: 999,
          empresaCodigo: 'OTRA',
        },
        identity,
        actor,
      ),
    ).rejects.toThrow('Reemplazo requiere únicamente tempId');

    expect(x.op.obtenerDetalle).not.toHaveBeenCalled();
    expect(x.tmp.promote).not.toHaveBeenCalled();
  });
});
