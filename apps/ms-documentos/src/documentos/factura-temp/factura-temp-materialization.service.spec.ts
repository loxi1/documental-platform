jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    OcrProcesarArchivo: 'ocr.procesar-archivo',
  },
}));

jest.mock('@documental/database', () => ({ sql: {} }));

import { FacturaTempMaterializationService } from './factura-temp-materialization.service';
import {
  OP_FACTURA_REGULARIZER_MATERIALIZATION,
} from './factura-temp-materialization.repository';

describe('R26-D2 FACTURA TEMP materialization service', () => {
  const actor = {
    id: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: '11111111-1111-4111-8111-111111111111',
    correlationId: 'corr-r26-d2',
  };

  const metadataHumana = {
    fechaEmision: '2026-09-20',
    serie: 'F001',
    numero: '123',
    rucProveedor: '20123456789',
    proveedor: 'PROVEEDOR VALIDADO SAC',
    montoTotal: '150.50',
  };

  const ocrResultado = {
    ok: true,
    tipoDocumental: 'FACTURA',
    confidence: 0.97,
    metadata: {
      serie: 'OCR-SERIE',
      numero: 'OCR-NUMERO',
    },
  };

  function setup() {
    const destination =
      'documentos/carga-segura/2026/09/BBTI/50__factura.pdf';

    const row: any = {
      id: 50,
      actor_id: 6,
      workspace_id: 12,
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,
      estado: 'almacenada',
      storage_provider: 'r2',
      storage_bucket: 'data-prod',
      storage_key: 'documentos/tmp/12/50',
      nombre_archivo_original: 'factura.pdf',
      content_type: 'application/pdf',
      hash_sha256: 'a'.repeat(64),
      tamano_bytes: 1234,
      iniciada_en: '2026-09-26T12:00:00.000Z',
      expira_en: new Date(Date.now() + 60 * 60 * 1000),
      documento_id: null,
      archivo_id: null,
      destino_storage_key: null,
      metadata: {
        ocrCandidate: {
          status: 'DONE',
          tipoEsperado: 'FACTURA',
          completedAt: '2026-09-26T12:01:00.000Z',
          resultado: ocrResultado,
        },
      },
    };

    const tx: any = {};

    const repository: any = {
      reserve: jest.fn(
        async (
          _tx: any,
          current: any,
          identity: string,
          destino: string,
        ) => {
          if (current.metadata?.integration) {
            return {
              documentoId: Number(current.documento_id),
              idempotente: true,
            };
          }

          current.documento_id = 700;
          current.metadata = {
            ...current.metadata,
            destinoReservado: destino,
            promocionIdentity: identity,
            integration: {
              consumer:
                OP_FACTURA_REGULARIZER_MATERIALIZATION,
              identity,
              completed: false,
            },
          };

          return {
            documentoId: 700,
            idempotente: false,
          };
        },
      ),

      createOrReuseDocumentAndFileWithExecutor: jest.fn(
        async (_tx: any, current: any) => {
          current.archivo_id = 701;

          return {
            documentoId: 700,
            archivoId: 701,
            idempotente: false,
          };
        },
      ),

      confirmFacturaWithExecutor: jest.fn(
        async () => ({
          documentoId: 700,
          archivoId: 701,
          ocrResultadoId: 702,
          claveDocumental:
            'BBTI|FACTURA|20123456789|F001|123',
          metadata: metadataHumana,
        }),
      ),
    };

    const temps: any = {
      locked: jest.fn(
        async (_key: string, work: any) => work(tx),
      ),

      transaction: jest.fn(
        async (_c: any, work: any) => work(tx),
      ),

      own: jest.fn(async () => row),
    };

    const tmp: any = {
      deriveDestination: jest.fn(() => destination),

      promote: jest.fn(
        async (
          tempId: number,
          _tmpActor: any,
          destino: string,
          integration: any,
        ) => {
          expect(tempId).toBe(50);
          expect(destino).toBe(destination);
          expect(integration.consumer).toBe(
            OP_FACTURA_REGULARIZER_MATERIALIZATION,
          );

          await integration.persist(
            tx,
            row,
            destination,
          );

          row.destino_storage_key = destination;
          row.estado = 'completada';
          row.metadata.integration.completed = true;

          return {
            tempId: 50,
            estado: 'PROMOTED',
            destinoStorageKey: destination,
          };
        },
      ),
    };

    const service =
      new FacturaTempMaterializationService(
        repository,
        temps,
        tmp,
      );

    return {
      service,
      repository,
      temps,
      tmp,
      row,
      tx,
      destination,
    };
  }

  it(
    'materializa una FACTURA usando identidad reservada, archivo estable, OCR TEMP DONE y metadata humana',
    async () => {
      const x = setup();

      const result = await x.service.materializar(
        50,
        'factura-op-50',
        actor,
        metadataHumana,
      );

      expect(x.repository.reserve).toHaveBeenCalledTimes(1);

      expect(
        x.repository.createOrReuseDocumentAndFileWithExecutor,
      ).toHaveBeenCalledTimes(1);

      expect(
        x.repository.confirmFacturaWithExecutor,
      ).toHaveBeenCalledTimes(1);

      expect(
        x.repository.confirmFacturaWithExecutor,
      ).toHaveBeenCalledWith(
        x.tx,
        expect.objectContaining({
          documentoId: 700,
          archivoId: 701,
          metadata: metadataHumana,
          ocrCandidate: ocrResultado,
          actor: expect.objectContaining({
            actorId: 6,
            workspaceId: 12,
            empresaCodigo: 'BBTI',
            clienteDestinoId: 2,
          }),
        }),
      );

      expect(result).toMatchObject({
        tempId: 50,
        documentoId: 700,
        archivoId: 701,
      });
    },
  );

  it(
    'no usa el wrapper DONE como resultado OCR persistible',
    async () => {
      const x = setup();

      await x.service.materializar(
        50,
        'factura-op-50',
        actor,
        metadataHumana,
      );

      const payload =
        x.repository.confirmFacturaWithExecutor
          .mock.calls[0][1];

      expect(payload.ocrCandidate).toBe(ocrResultado);
      expect(payload.ocrCandidate.status).toBeUndefined();
      expect(payload.ocrCandidate.completedAt).toBeUndefined();
    },
  );

  it(
    'replay del mismo TEMP reutiliza documento y archivo sin segunda persistencia fiscal',
    async () => {
      const x = setup();

      x.tmp.promote.mockImplementation(
        async (
          tempId: number,
          _tmpActor: any,
          destino: string,
          integration: any,
        ) => {
          expect(tempId).toBe(50);
          expect(destino).toBe(x.destination);

          if (x.row.estado === 'completada') {
            return {
              tempId: 50,
              estado: 'PROMOTED',
              destinoStorageKey: x.destination,
            };
          }

          await integration.persist(
            x.tx,
            x.row,
            x.destination,
          );

          x.row.destino_storage_key =
            x.destination;
          x.row.estado = 'completada';
          x.row.metadata.integration.completed =
            true;

          return {
            tempId: 50,
            estado: 'PROMOTED',
            destinoStorageKey: x.destination,
          };
        },
      );

      const first = await x.service.materializar(
        50,
        'factura-op-50',
        actor,
        metadataHumana,
      );

      const second = await x.service.materializar(
        50,
        'factura-op-50',
        actor,
        metadataHumana,
      );

      expect(first).toMatchObject({
        tempId: 50,
        documentoId: 700,
        archivoId: 701,
      });

      expect(second).toMatchObject({
        tempId: 50,
        documentoId: 700,
        archivoId: 701,
      });

      expect(x.repository.reserve)
        .toHaveBeenCalledTimes(2);

      expect(
        x.repository.createOrReuseDocumentAndFileWithExecutor,
      ).toHaveBeenCalledTimes(1);

      expect(
        x.repository.confirmFacturaWithExecutor,
      ).toHaveBeenCalledTimes(1);

      expect(x.tmp.promote)
        .toHaveBeenCalledTimes(2);
    },
  );

  it(
    'rechaza metadata humana ausente antes de reservar o promover',
    async () => {
      const x = setup();

      await expect(
        x.service.materializar(
          50,
          'factura-op-50',
          actor,
          null as any,
        ),
      ).rejects.toThrow('FACTURA_TEMP_METADATA_REQUIRED');

      expect(x.repository.reserve).not.toHaveBeenCalled();
      expect(x.tmp.promote).not.toHaveBeenCalled();
    },
  );
});
