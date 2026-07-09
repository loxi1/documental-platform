jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { V1V2CompatibilityAdapter } from './v1-v2-compatibility.adapter';
import type {
  V1DocumentoExpedienteRow,
  V1ExpedienteBaseRow,
} from './v1-v2-compatibility.types';

describe('V1V2CompatibilityAdapter', () => {
  const repository = {
    obtenerExpedienteConDocumentos: jest.fn(),
  };

  const expediente: V1ExpedienteBaseRow = {
    id: 41,
    empresaCodigo: 'BBTI',
    codigoExpediente: '050201',
    descripcion: 'PRODUCCION C X DISTRIBUIR',
    clienteDestinoId: 2,
    estado: 'activo',
    metadata: { centroCostoCodigo: '050201' },
    creadoEn: null,
    actualizadoEn: null,
  };

  const baseDocumento = (
    overrides: Partial<V1DocumentoExpedienteRow>,
  ): V1DocumentoExpedienteRow => ({
    expedienteId: 41,
    documentoId: 1,
    tipoRelacion: null,
    esPrincipal: false,
    orden: 1,
    clienteAbreviatura: 'BBTI',
    tipoDocumental: 'OC',
    rucEmisor: null,
    razonSocialEmisor: null,
    serie: null,
    numero: '007950',
    claveDocumental: 'BBTI|OC|007950',
    estado: 'confirmado',
    fechaEmision: null,
    moneda: null,
    montoTotal: null,
    metadata: {},
    archivoId: null,
    nombreArchivo: null,
    storageProvider: null,
    storageBucket: null,
    storageKey: null,
    archivoEstado: null,
    areaOrigen: null,
    ...overrides,
  });

  beforeEach(() => {
    repository.obtenerExpedienteConDocumentos.mockReset();
  });

  it('construye una vista V2 de solo lectura desde un expediente V1 con una factura', async () => {
    repository.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente,
      documentos: [
        baseDocumento({
          documentoId: 1,
          tipoDocumental: 'OC',
          tipoRelacion: 'principal_oc',
          esPrincipal: true,
        }),
        baseDocumento({
          documentoId: 2,
          tipoDocumental: 'FACTURA',
          tipoRelacion: 'adjunto_factura',
          orden: 2,
        }),
        baseDocumento({
          documentoId: 3,
          tipoDocumental: 'GUIA_REMISION',
          tipoRelacion: 'adjunto_guia',
          orden: 3,
        }),
      ],
    });

    const adapter = new V1V2CompatibilityAdapter(repository as any);

    const result = await adapter.construirVistaV2DesdeExpedienteV1(41);

    expect(result.contenedorOperativo).toMatchObject({
      empresaCodigo: 'BBTI',
      tipoContexto: 'expediente_v1',
      codigo: '050201',
    });
    expect(result.documentosOperativosPrincipales).toHaveLength(1);
    expect(result.documentosOperativosPrincipales[0]).toMatchObject({
      documentoId: 1,
      tipoPrincipal: 'OC',
      esPrincipalActivo: true,
    });
    expect(result.gruposFactura).toHaveLength(1);
    expect(result.gruposFactura[0]).toMatchObject({
      facturaDocumentoId: 2,
      documentoOperativoPrincipalDocumentoId: 1,
    });
    expect(result.gruposFactura[0].documentos).toHaveLength(1);
    expect(result.gruposFactura[0].documentos[0]).toMatchObject({
      documentoId: 3,
      tipoRelacion: 'adjunto_guia',
    });
    expect(result.adjuntosNoClasificados).toHaveLength(0);
  });

  it('no asigna adjuntos automáticamente cuando existen múltiples facturas', () => {
    const adapter = new V1V2CompatibilityAdapter(repository as any);

    const result = adapter.construirDesdeDatos(expediente, [
      baseDocumento({
        documentoId: 1,
        tipoDocumental: 'OC',
        tipoRelacion: 'principal_oc',
        esPrincipal: true,
      }),
      baseDocumento({ documentoId: 2, tipoDocumental: 'FACTURA', orden: 2 }),
      baseDocumento({ documentoId: 4, tipoDocumental: 'FACTURA', orden: 3 }),
      baseDocumento({ documentoId: 3, tipoDocumental: 'GUIA_REMISION', orden: 4 }),
    ]);

    expect(result.gruposFactura).toHaveLength(2);
    expect(result.gruposFactura[0].documentos).toHaveLength(0);
    expect(result.adjuntosNoClasificados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentoId: 3,
          motivo: 'MULTIPLES_FACTURAS',
        }),
      ]),
    );
    expect(result.advertencias).toContain(
      'EXPEDIENTE_V1_CON_MULTIPLES_FACTURAS_REQUIERE_ASIGNACION_EXPLICITA',
    );
  });
});
