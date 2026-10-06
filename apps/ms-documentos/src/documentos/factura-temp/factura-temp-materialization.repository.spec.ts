import { FacturaTempMaterializationRepository } from './factura-temp-materialization.repository';

describe('R26-D2 FACTURA TEMP repository fiscal', () => {
  const actor = {
    actorId: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
  };

  const metadataHumana = {
    fechaEmision: '2026-09-20',
    serie: 'F001',
    numero: '123',
    rucProveedor: '20123456789',
    proveedor: 'PROVEEDOR VALIDADO SAC',
    montoTotal: '150.50',
  };

  const ocrCandidate = {
    confidence: 0.91,
    metadata: {
      fechaEmision: '2026-01-01',
      serie: 'OCR999',
      numero: '999999',
      rucProveedor: '20999999999',
      proveedor: 'OCR NO AUTORIDAD SAC',
      montoTotal: '9999.99',
    },
  };

  function setup(options: {
    duplicate?: boolean;
    existingOcr?: boolean;
  } = {}) {
    const queries: string[] = [];
    const valuesByQuery: any[][] = [];

    const documento: any = {
      id: 700,
      tipo_documental: 'FACTURA',
      estado: 'pendiente_ocr',
      workspace_id: 12,
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,
      metadata: {
        origen: 'TEMP_REGULARIZACION_OP',
        tempId: 50,
      },
    };

    const archivo: any = {
      id: 701,
      documento_id: 700,
      estado: 'activo',
    };

    let ocr: any = options.existingOcr
      ? {
          id: 702,
          documento_id: 700,
          archivo_id: 701,
          tipo_propuesto: 'FACTURA',
          estado: 'pendiente_validacion',
          metadata: {
            temporal: true,
            origen: 'TEMP_REGULARIZACION_OP',
          },
        }
      : null;

    let factura: any = null;

    const tx: any = jest.fn(
      async (
        strings: TemplateStringsArray,
        ...values: any[]
      ) => {
        const q = strings
          .join('?')
          .replace(/\s+/g, ' ')
          .trim();

        queries.push(q);
        valuesByQuery.push(values);

        if (
          q.includes('FROM documentos.documentos') &&
          q.includes('WHERE id=?') &&
          q.includes('FOR UPDATE')
        ) {
          return [documento];
        }

        if (
          q.includes('FROM documentos.documentos_archivos') &&
          q.includes('FOR UPDATE')
        ) {
          return [archivo];
        }

        if (q.includes('FROM core.proveedores')) {
          return [];
        }

        if (
          q.includes('FROM documentos.documentos d') &&
          q.includes('ocr_existente')
        ) {
          return options.duplicate
            ? [{ id: 999 }]
            : [];
        }

        if (
          q.includes('FROM documentos.ocr_resultados') &&
          q.includes('documento_id=?') &&
          q.includes('archivo_id=?') &&
          q.includes('FOR UPDATE')
        ) {
          return ocr ? [{ id: ocr.id }] : [];
        }

        if (
          q.startsWith(
            'INSERT INTO documentos.ocr_resultados',
          )
        ) {
          ocr = {
            id: 702,
            documento_id: 700,
            archivo_id: 701,
            tipo_propuesto: 'FACTURA',
            estado: 'pendiente_validacion',
            confidence: values[2],
            clave_documental: values[3],
            metadata: JSON.parse(values[4]),
          };

          return [{ id: 702 }];
        }

        if (
          q.startsWith('UPDATE documentos.documentos SET')
        ) {
          documento.estado = 'confirmado';
          documento.tipo_documental = 'FACTURA';
          documento.razon_social_emisor = values[0];
          documento.serie = values[1];
          documento.numero = values[2];
          documento.clave_documental = values[3];
          documento.ruc_emisor = values[4];
          documento.fecha_emision = values[5];
          documento.moneda = values[6];
          documento.monto_total = values[7];
          documento.metadata = JSON.parse(values[8]);

          return [{ ...documento }];
        }

        if (
          q.startsWith(
            'INSERT INTO documentos.documentos_factura',
          )
        ) {
          factura = {
            documento_id: values[0],
            ruc_emisor: values[1],
            serie: values[2],
            numero: values[3],
            fecha_emision: values[4],
            total: values[5],
          };

          return [];
        }

        if (
          q.startsWith(
            'UPDATE documentos.ocr_resultados SET',
          )
        ) {
          if (ocr) {
            ocr.estado = 'confirmado';
            ocr.tipo_propuesto = 'FACTURA';
            ocr.clave_documental = values[0];
          }

          return [];
        }

        throw new Error(`SQL_NO_MOCKEADO: ${q}`);
      },
    );

    return {
      tx,
      queries,
      valuesByQuery,
      documento,
      archivo,
      getOcr: () => ocr,
      getFactura: () => factura,
    };
  }

  it(
    'confirma FACTURA con metadata humana, clave backend, documentos_factura y OCR TEMP persistido',
    async () => {
      const x = setup();

      const result =
        await new FacturaTempMaterializationRepository()
          .confirmFacturaWithExecutor(
            x.tx,
            {
              documentoId: 700,
              archivoId: 701,
              actor,
              metadata: metadataHumana,
              ocrCandidate,
            },
          );

      expect(result.claveDocumental).toBe(
        'BBTI|FACTURA|20123456789|F001|123',
      );

      expect(result.metadata).toMatchObject({
        fechaEmision: '2026-09-20',
        serie: 'F001',
        numero: '123',
        rucProveedor: '20123456789',
        proveedor: 'PROVEEDOR VALIDADO SAC',
        montoTotal: '150.50',
      });

      expect(result.metadata.serie).not.toBe('OCR999');
      expect(result.metadata.numero).not.toBe('999999');

      expect(x.documento).toMatchObject({
        id: 700,
        estado: 'confirmado',
        serie: 'F001',
        numero: '123',
        ruc_emisor: '20123456789',
        razon_social_emisor:
          'PROVEEDOR VALIDADO SAC',
        clave_documental:
          'BBTI|FACTURA|20123456789|F001|123',
      });

      expect(x.getFactura()).toEqual({
        documento_id: 700,
        ruc_emisor: '20123456789',
        serie: 'F001',
        numero: '123',
        fecha_emision: '2026-09-20',
        total: '150.50',
      });

      expect(x.getOcr()).toMatchObject({
        id: 702,
        documento_id: 700,
        archivo_id: 701,
        tipo_propuesto: 'FACTURA',
        estado: 'confirmado',
        clave_documental:
          'BBTI|FACTURA|20123456789|F001|123',
      });

      expect(
        x.queries.filter(q =>
          q.startsWith(
            'INSERT INTO documentos.ocr_resultados',
          ),
        ),
      ).toHaveLength(1);

      expect(
        x.queries.filter(q =>
          q.startsWith(
            'INSERT INTO documentos.documentos_factura',
          ),
        ),
      ).toHaveLength(1);
    },
  );

  it(
    'reutiliza OCR persistente del mismo documento/archivo sin insertar otro',
    async () => {
      const x = setup({ existingOcr: true });

      const result =
        await new FacturaTempMaterializationRepository()
          .confirmFacturaWithExecutor(
            x.tx,
            {
              documentoId: 700,
              archivoId: 701,
              actor,
              metadata: metadataHumana,
              ocrCandidate,
            },
          );

      expect(result.ocrResultadoId).toBe(702);

      expect(
        x.queries.some(q =>
          q.startsWith(
            'INSERT INTO documentos.ocr_resultados',
          ),
        ),
      ).toBe(false);

      expect(x.getOcr()).toMatchObject({
        id: 702,
        estado: 'confirmado',
        clave_documental:
          'BBTI|FACTURA|20123456789|F001|123',
      });
    },
  );

  it(
    'rechaza clave FACTURA duplicada antes de mutar documento, factura u OCR',
    async () => {
      const x = setup({ duplicate: true });

      await expect(
        new FacturaTempMaterializationRepository()
          .confirmFacturaWithExecutor(
            x.tx,
            {
              documentoId: 700,
              archivoId: 701,
              actor,
              metadata: metadataHumana,
              ocrCandidate,
            },
          ),
      ).rejects.toThrow(
        'FACTURA_TEMP_DOCUMENT_DUPLICATE',
      );

      expect(x.documento.estado).toBe('pendiente_ocr');
      expect(x.getFactura()).toBeNull();
      expect(x.getOcr()).toBeNull();

      expect(
        x.queries.some(q =>
          q.startsWith(
            'INSERT INTO documentos.ocr_resultados',
          ),
        ),
      ).toBe(false);

      expect(
        x.queries.some(q =>
          q.startsWith(
            'UPDATE documentos.documentos SET',
          ),
        ),
      ).toBe(false);
    },
  );

  it(
    'no exige codigoExpediente ni crea vínculo de expediente',
    async () => {
      const x = setup();

      const result =
        await new FacturaTempMaterializationRepository()
          .confirmFacturaWithExecutor(
            x.tx,
            {
              documentoId: 700,
              archivoId: 701,
              actor,
              metadata: metadataHumana,
              ocrCandidate,
            },
          );

      expect(result.metadata.codigoExpediente).toBeUndefined();

      expect(
        x.queries.some(q =>
          q.includes('expediente_documentos'),
        ),
      ).toBe(false);

      expect(
        x.queries.some(q =>
          q.includes('documentos.expedientes'),
        ),
      ).toBe(false);
    },
  );
});
