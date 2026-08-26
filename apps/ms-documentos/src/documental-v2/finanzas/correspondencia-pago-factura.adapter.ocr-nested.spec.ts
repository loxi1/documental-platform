import { adaptarPagoCorrespondencia } from './correspondencia-pago-factura.adapter';

describe('adaptarPagoCorrespondencia - metadata OCR confirmada', () => {
  it('prioriza metadata.ocr.metadata para datos financieros confirmados', () => {
    const result = adaptarPagoCorrespondencia({
      id: 71,
      tipoDocumental: 'TRANSFERENCIA',
      rucEmisor: null,
      razonSocialEmisor: null,
      serie: null,
      numero: null,
      fechaEmision: null,
      moneda: null,
      montoTotal: null,
      metadata: {
        origen: 'WEB_ADMIN_CARGA_GUIADA',
        expedienteId: 12,
        ocr: {
          metadata: {
            rucProveedor: '20514753483',
            proveedorNombre: 'CORPORACION PROMATISA SOCIEDAD',
            moneda: 'SOLES',
            montoTotal: '720.27',
            documentoReferenciado: 'F010-00011384',
            numeroOperacion: '92568384',
          },
        },
      },
    } as any);

    expect(result).toMatchObject({
      documentoId: 71,
      proveedorRuc: '20514753483',
      proveedorNombre: 'CORPORACION PROMATISA SOCIEDAD',
      moneda: 'SOLES',
      importe: 720.27,
      documentoReferenciado: 'F010-00011384',
    });
  });

  it('mantiene fallback al metadata raíz y columnas existentes', () => {
    const result = adaptarPagoCorrespondencia({
      id: 72,
      tipoDocumental: 'TRANSFERENCIA',
      rucEmisor: '20514753483',
      razonSocialEmisor: 'CORPORACION PROMATISA SOCIEDAD',
      serie: null,
      numero: null,
      fechaEmision: '2026-07-22',
      moneda: 'SOLES',
      montoTotal: 720.27,
      metadata: {
        comprobante: 'F010-00011384',
      },
    } as any);

    expect(result).toMatchObject({
      documentoId: 72,
      proveedorRuc: '20514753483',
      proveedorNombre: 'CORPORACION PROMATISA SOCIEDAD',
      moneda: 'SOLES',
      importe: 720.27,
      documentoReferenciado: 'F010-00011384',
    });
  });
});
