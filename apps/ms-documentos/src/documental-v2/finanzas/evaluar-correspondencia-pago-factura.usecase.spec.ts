import {
  CorrespondenciaDocumentoReadonlyPort,
  EvaluarCorrespondenciaPagoFacturaUseCase,
} from './evaluar-correspondencia-pago-factura.usecase';

class InMemoryPort extends CorrespondenciaDocumentoReadonlyPort {
  constructor(private readonly rows: Record<number, any>) {
    super();
  }

  async buscarSnapshot(documentoId: number): Promise<any | null> {
    return this.rows[documentoId] ?? null;
  }
}

describe('EvaluarCorrespondenciaPagoFacturaUseCase', () => {
  const factura = {
    id: 26,
    tipoDocumental: 'FACTURA',
    rucEmisor: '20370146994',
    razonSocialEmisor: 'CORPORACION ACEROS AREQUIPA S.A.',
    serie: 'FE65',
    numero: '0842108',
    moneda: 'USD',
    montoTotal: 9704.23,
    metadata: {},
  };

  it('adapta factura 26 y pago 29 al contrato incompatible esperado', async () => {
    const useCase = new EvaluarCorrespondenciaPagoFacturaUseCase(
      new InMemoryPort({
        26: factura,
        29: {
          id: 29,
          tipoDocumental: 'TRANSFERENCIA',
          metadata: {
            proveedorRuc: '20600000001',
            proveedorNombre: 'CIMEDISA IMPORT SAC',
            moneda: 'USD',
            montoOperacion: 2334.8,
            montoTotalDebitado: 2335.8,
            documentoReferenciado: '202693',
          },
        },
      }),
    );

    await expect(
      useCase.execute({
        facturaDocumentoId: 26,
        pagoDocumentoId: 29,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        estado: 'INCOMPATIBLE',
        facturaDocumentoId: 26,
        pagoDocumentoId: 29,
        requiereDecisionHumana: true,
        permiteAsociacionOrdinaria: false,
        comparaciones: expect.objectContaining({
          proveedor: expect.objectContaining({
            estado: 'NO_COINCIDE',
          }),
          moneda: expect.objectContaining({
            estado: 'COINCIDE',
          }),
          importe: expect.objectContaining({
            estado: 'COINCIDE',
            factura: 9704.23,
            pago: 2334.8,
          }),
          documentoReferenciado: expect.objectContaining({
            estado: 'NO_COINCIDE',
            factura: 'FE65-0842108',
            pago: '202693',
          }),
        }),
      }),
    );
  });

  it('sin pago devuelve SIN_SUSTENTO', async () => {
    const useCase = new EvaluarCorrespondenciaPagoFacturaUseCase(
      new InMemoryPort({ 26: factura }),
    );

    const result = await useCase.execute({
      facturaDocumentoId: 26,
      pagoDocumentoId: null,
    });

    expect(result.estado).toBe('SIN_SUSTENTO');
    expect(result.pagoDocumentoId).toBeNull();
  });

  it('prioriza montoOperacion y no montoTotalDebitado', async () => {
    const useCase = new EvaluarCorrespondenciaPagoFacturaUseCase(
      new InMemoryPort({
        26: {
          ...factura,
          montoTotal: 2334.8,
        },
        29: {
          id: 29,
          tipoDocumental: 'PAGO_TRANSFERENCIA',
          metadata: {
            proveedorRuc: '20370146994',
            moneda: 'USD',
            montoOperacion: 2334.8,
            montoTotalDebitado: 2335.8,
            documentoReferenciado: 'FE65-0842108',
          },
        },
      }),
    );

    const result = await useCase.execute({
      facturaDocumentoId: 26,
      pagoDocumentoId: 29,
    });

    expect(result.comparaciones.importe).toEqual({
      estado: 'COINCIDE',
      factura: 2334.8,
      pago: 2334.8,
    });
  });
});
