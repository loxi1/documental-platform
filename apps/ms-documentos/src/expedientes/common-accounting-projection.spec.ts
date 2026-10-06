import {
  mapCommonAccountingRowToLegacy,
  mapFacturaOcosToCommonAccountingRow,
  mapOrdenPagoToCommonAccountingRow,
} from './common-accounting-projection';

const factura = (overrides: Record<string, any> = {}) => ({
  factura_id: 501,
  grupo_factura_id: 81,
  documento_operativo_principal_id: 41,
  documento_principal_tipo: 'OC',
  documento_principal_numero: '008138',
  empresa_codigo_v2: 'BBTI',
  cliente_destino_id_v2: 2,
  fecha_emision: '2026-09-05',
  moneda: 'USD',
  monto_total: '100.00',
  codigo_centro_costo: 'CC-01',
  razon_social_emisor: 'Proveedor SAC',
  ruc_emisor: '20123456789',
  documentos: [],
  revision_contable: { estado: 'PENDIENTE' },
  ...overrides,
});

const op = (estadoRegularizacion: string, overrides: Record<string, any> = {}) => ({
  origen: 'ORDEN_PAGO',
  ordenPagoId: 153,
  documento_id: 700,
  grupo_factura_id: 90,
  numero: '0000000153',
  empresa_codigo: 'BBTI',
  cliente_destino_id: 2,
  fecha_emision: '2026-09-10',
  moneda: 'PEN',
  monto_total: '250.00',
  periodo_anio: 2026,
  periodo_mes: 8,
  estadoRegularizacion,
  codigo_centro_costo: 'CC-OP',
  documentos: [],
  revision_contable: { estado: 'REVISADO' },
  ...overrides,
});

describe('CommonAccountingProjection', () => {
  it('T-COMMON-01 mapea Factura OC/OS válida a CommonAccountingRow', () => {
    const row = mapFacturaOcosToCommonAccountingRow(factura());

    expect(row).toMatchObject({
      origin: 'OC_OS',
      accountingDocumentId: 501,
      groupFacturaId: 81,
      principalId: 41,
      principalType: 'OC',
      principalNumber: '008138',
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      fechaEmision: '2026-09-05',
      estadoRegularizacion: 'REGULARIZADO',
    });
  });

  it('T-COMMON-02 no colapsa dos Facturas válidas del mismo principal', () => {
    const rows = [
      mapFacturaOcosToCommonAccountingRow(
        factura({ factura_id: 501, grupo_factura_id: 81 }),
      ),
      mapFacturaOcosToCommonAccountingRow(
        factura({ factura_id: 502, grupo_factura_id: 82 }),
      ),
    ];

    expect(rows).toHaveLength(2);
    expect(rows.map(row => [row.accountingDocumentId, row.groupFacturaId])).toEqual([
      [501, 81],
      [502, 82],
    ]);
    expect(rows.every(row => row.principalId === 41)).toBe(true);
  });

  it.each(['PENDIENTE', 'NO_REQUIERE', 'REGULARIZADO'] as const)(
    'T-COMMON-03/04/05 OP %s produce una única unidad',
    estado => {
      const rows = [mapOrdenPagoToCommonAccountingRow(op(estado))];

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        origin: 'ORDEN_PAGO',
        accountingDocumentId: 700,
        groupFacturaId: 90,
        principalId: 153,
        estadoRegularizacion: estado,
      });
    },
  );

  it('T-COMMON-06 un regularizador OP permanece documento y no crea otra unidad', () => {
    const row = mapOrdenPagoToCommonAccountingRow(
      op('REGULARIZADO', {
        documentos: [
          {
            documentoId: 801,
            tipoRelacion: 'regularizador_factura',
            tipoDocumental: 'FACTURA',
          },
        ],
      }),
    );

    expect(row.accountingDocumentId).toBe(700);
    expect(row.groupFacturaId).toBe(90);
    expect(row.documents).toHaveLength(1);
  });

  it('T-COMMON-07 N pagos quedan agrupados en payments[] de una sola unidad', () => {
    const row = mapOrdenPagoToCommonAccountingRow(
      op('PENDIENTE', {
        documentos: [
          { documentoId: 901, tipoRelacion: 'adjunto_transferencia' },
          { documentoId: 902, tipoRelacion: 'adjunto_transferencia' },
          { documentoId: 903, tipoRelacion: 'adjunto_guia' },
        ],
      }),
    );

    expect(row.accountingDocumentId).toBe(700);
    expect(row.payments).toHaveLength(2);
    expect(row.documents).toHaveLength(3);
  });

  it('T-COMMON-08 el adapter recibe un documento por relación, no filas por versiones', () => {
    const row = mapFacturaOcosToCommonAccountingRow(
      factura({
        documentos: [
          {
            documentoId: 901,
            tipoRelacion: 'adjunto_guia',
            archivoId: 1002,
            version: 2,
          },
        ],
      }),
    );

    expect(row.documents).toHaveLength(1);
  });

  it('T-COMMON-12 mantiene periodo funcional independiente de fechaEmision', () => {
    const facturaRow = mapFacturaOcosToCommonAccountingRow(
      factura({ fecha_emision: '2026-09-05' }),
    );
    const opRow = mapOrdenPagoToCommonAccountingRow(
      op('PENDIENTE', {
        fecha_emision: '2026-09-10',
        periodo_anio: 2026,
        periodo_mes: 8,
      }),
    );

    expect(facturaRow.functionalPeriodYear).toBeNull();
    expect(facturaRow.functionalPeriodMonth).toBeNull();
    expect(opRow.functionalPeriodYear).toBe(2026);
    expect(opRow.functionalPeriodMonth).toBe(8);
  });

  it('T-COMMON-13 lee revisionContable ya resuelta por grupoFacturaId', () => {
    expect(
      mapFacturaOcosToCommonAccountingRow(factura()).revisionContable,
    ).toEqual({ estado: 'PENDIENTE' });

    expect(
      mapOrdenPagoToCommonAccountingRow(op('PENDIENTE')).revisionContable,
    ).toEqual({ estado: 'REVISADO' });
  });

  it('rechaza Factura sin identidad común V2', () => {
    expect(() =>
      mapFacturaOcosToCommonAccountingRow(
        factura({ grupo_factura_id: null }),
      ),
    ).toThrow('COMMON_ACCOUNTING_INVALID_GRUPO_FACTURA_ID');
  });

  it('T-COMMON-17 compatibility mapper conserva el objeto legacy observable', () => {
    const legacy = factura();
    const common = mapFacturaOcosToCommonAccountingRow(legacy);

    expect(mapCommonAccountingRowToLegacy(common, legacy)).toBe(legacy);
    expect(legacy.estadoRegularizacion).toBe('REGULARIZADO');
  });
});
