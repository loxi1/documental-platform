import { DocumentoVisualMapper } from './documento-visual.mapper';

describe('DocumentoVisualMapper', () => {
  const mapper = new DocumentoVisualMapper();

  it('enriquece un documento operativo principal desde metadata OCR normalizada', () => {
    const result = mapper.enriquecerDocumentoOperativoPrincipal({
      documentoId: 1,
      tipoPrincipal: 'OC',
      esPrincipalActivo: true,
      estado: 'confirmado',
      metadata: {
        filename: 'OC_007950.pdf',
        ocr: {
          metadata: {
            numero: '007950',
            proveedor: 'CORPORACION ACEROS AREQUIPA S.A.',
            rucProveedor: '20370146994',
            fechaEmision: '2026-04-23',
            montoTotal: '4181.92',
            moneda: 'DOLARES AMERICANOS',
            tipoDocumental: 'OC',
          },
        },
      },
      origen: {
        modelo: 'V1',
        expedienteId: 41,
        modo: 'lectura',
        tipoRelacionV1: 'principal_oc',
        esPrincipalV1: true,
      },
    });

    expect(result).toMatchObject({
      numeroDocumento: '007950',
      titulo: 'OC 007950',
      proveedorNombre: 'CORPORACION ACEROS AREQUIPA S.A.',
      proveedorRuc: '20370146994',
      fechaEmision: '2026-04-23',
      montoTotal: 4181.92,
      moneda: 'USD',
      nombreArchivo: 'OC_007950.pdf',
      tipoDocumentalLabel: 'Orden de compra',
    });
  });

  it('enriquece grupo factura desde metadata V1 sin inventar datos faltantes', () => {
    const result = mapper.enriquecerGrupoFactura({
      facturaDocumentoId: 2,
      documentoOperativoPrincipalDocumentoId: 1,
      estado: 'pendiente_revision',
      metadata: {
        compatibilidad: {
          documentoV1: {
            tipoDocumental: 'FACTURA',
            serie: 'F011',
            numero: '00001135',
            rucEmisor: '20516403650',
            razonSocialEmisor: 'COMATPE S.A.C.',
            fechaEmision: '2026-05-04',
            moneda: 'PEN',
            montoTotal: '40.00',
            nombreArchivo: 'factura_comatpe.PDF',
          },
        },
      },
      documentos: [],
      origen: {
        modelo: 'V1',
        expedienteId: 41,
        modo: 'lectura',
        tipoDocumentalV1: 'FACTURA',
        tipoRelacionV1: 'adjunto_factura',
      },
    });

    expect(result).toMatchObject({
      facturaSerie: 'F011',
      facturaNumero: '00001135',
      facturaLabel: 'Factura F011-00001135',
      proveedorNombre: 'COMATPE S.A.C.',
      proveedorRuc: '20516403650',
      fechaEmision: '2026-05-04',
      importeTotal: 40,
      moneda: 'PEN',
      estadoRevisionLabel: 'Pendiente de revisión',
    });
  });
});
