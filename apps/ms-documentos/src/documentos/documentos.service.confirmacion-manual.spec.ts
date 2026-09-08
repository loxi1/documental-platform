jest.mock('@documental/shared', () => ({
  NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' },
}));
jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { DocumentosService } from './documentos.service';

function setup() {
  const repo = {};
  const v2 = {
    executeManualFactura: jest.fn().mockResolvedValue({
      documento: { id: 10 },
      archivo: { id: 12 },
      ocrResultado: { id: 21 },
    }),
  };
  const eventos = {
    registrarEvento: jest.fn().mockResolvedValue(undefined),
  };
  const nats = {};

  const service = new DocumentosService(
    repo as any,
    v2 as any,
    eventos as any,
    nats as any,
  );

  return { service, v2, eventos };
}

const inputBase = {
  expedienteId: 7,
  documentoBaseId: 5,
  tipoRelacion: 'adjunto_factura',
  esPrincipal: false,
  orden: 10,
  metadata: {
    tipoDocumental: 'FACTURA',
    serie: 'E001',
    numero: '123',
    fechaEmision: '2026-09-08',
    rucEmisor: '20123456789',
    razonSocial: 'Proveedor SAC',
    montoTotal: 100,
    moneda: 'PEN',
  },
};

describe('2B autoridad backend en confirmacion manual', () => {
  it.each([
    'claveDocumental',
    'clienteAbreviatura',
    'codigoExpediente',
    'rucComprador',
    'documentoBaseId',
    'contextoValidacion',
  ])('rechaza metadata con campo de autoridad %s antes de V2', async campo => {
    const { service, v2 } = setup();

    await expect(
      service.confirmarFacturaManualConExpediente(
        { documentoId: 10, archivoId: 12 },
        {
          ...inputBase,
          metadata: {
            ...inputBase.metadata,
            [campo]: campo === 'contextoValidacion' ? {} : 'NO_PERMITIDO',
          },
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'METADATA_MANUAL_AUTORIDAD_PROHIBIDA',
        details: expect.objectContaining({
          campos: expect.arrayContaining([campo]),
        }),
      }),
    });

    expect(v2.executeManualFactura).not.toHaveBeenCalled();
  });

  it('metadata fuente valida llega a V2 sin campos de autoridad', async () => {
    const { service, v2 } = setup();

    await service.confirmarFacturaManualConExpediente(
      { documentoId: 10, archivoId: 12 },
      inputBase,
      { usuarioId: 3, requestId: 'req-2b' },
    );

    expect(v2.executeManualFactura).toHaveBeenCalledTimes(1);
    expect(v2.executeManualFactura).toHaveBeenCalledWith(
      { documentoId: 10, archivoId: 12 },
      expect.objectContaining({
        expedienteId: 7,
        documentoBaseId: 5,
        tipoRelacion: 'adjunto_factura',
        metadata: expect.objectContaining({
          serie: 'E001',
          numero: '123',
          rucEmisor: '20123456789',
          razonSocial: 'Proveedor SAC',
        }),
      }),
      expect.objectContaining({
        usuarioId: 3,
        requestId: 'req-2b',
      }),
    );

    const metadata =
      v2.executeManualFactura.mock.calls[0][1].metadata;

    expect(metadata).not.toHaveProperty('claveDocumental');
    expect(metadata).not.toHaveProperty('clienteAbreviatura');
    expect(metadata).not.toHaveProperty('codigoExpediente');
    expect(metadata).not.toHaveProperty('rucComprador');
    expect(metadata).not.toHaveProperty('documentoBaseId');
    expect(metadata).not.toHaveProperty('contextoValidacion');
  });
});
