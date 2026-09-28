import { ReciboHonorarioTempMaterializationRepository } from './recibo-honorario-temp-materialization.repository';

describe('R28-P4-P6 RECIBO_HONORARIO TEMP repository fiscal', () => {
  const actor = {
    actorId: 6,
    workspaceId: 12,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
  };

  const metadataHumana = {
    fechaEmision: '2026-09-20',
    serie: 'E001',
    numero: '123',
    rucEmisor: '20123456789',
    razonSocialEmisor: 'PROFESIONAL VALIDADO',
    moneda: 'PEN',
    descripcionServicio: 'SERVICIO VALIDADO',
    montoTotal: '150.50',
    retencion: '12.00',
    montoNeto: '138.50',
    observaciones: 'VALIDADO POR USUARIO',
  };

  const ocrCandidate = {
    confidence: 0.91,
    metadata: {
      fechaEmision: '2026-01-01',
      serie: 'OCR999',
      numero: '999999',
      rucEmisor: '20999999999',
      razonSocialEmisor: 'OCR NO AUTORIDAD',
      montoTotal: '9999.99',
    },
  };

  function setup(
    options: {
      duplicate?: boolean;
      existingOcr?: boolean;
    } = {},
  ) {
    const queries: string[] = [];

    const documento: any = {
      id: 700,
      tipo_documental: 'RECIBO_HONORARIO',
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
          tipo_propuesto: 'RECIBO_HONORARIO',
          estado: 'pendiente_validacion',
          metadata: {
            temporal: true,
            origen: 'TEMP_REGULARIZACION_OP',
          },
        }
      : null;

    let reciboHonorario: any = null;

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

        if (
          q.includes('FROM documentos.documentos') &&
          q.includes('WHERE id=?') &&
          q.includes('FOR UPDATE')
        ) {
          return [documento];
        }

        if (
          q.includes(
            'FROM documentos.documentos_archivos',
          ) &&
          q.includes('FOR UPDATE')
        ) {
          return [archivo];
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
          q.includes(
            'FROM documentos.ocr_resultados',
          ) &&
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
            tipo_propuesto:
              'RECIBO_HONORARIO',
            estado: 'pendiente_validacion',
            confidence: values[2],
            clave_documental: values[3],
            metadata: JSON.parse(values[4]),
          };

          return [{ id: 702 }];
        }

        if (
          q.startsWith(
            'UPDATE documentos.documentos SET',
          )
        ) {
          documento.estado = 'confirmado';
          documento.cliente_abreviatura =
            values[0];
          documento.tipo_documental =
            'RECIBO_HONORARIO';
          documento.razon_social_emisor =
            values[1];
          documento.serie = values[2];
          documento.numero = values[3];
          documento.clave_documental =
            values[4];
          documento.ruc_emisor = values[5];
          documento.fecha_emision = values[6];
          documento.monto_total = values[7];
          documento.metadata = JSON.parse(
            values[8],
          );

          return [{ ...documento }];
        }

        if (
          q.startsWith(
            'INSERT INTO documentos.documentos_recibo_honorario',
          )
        ) {
          reciboHonorario = {
            documento_id: values[0],
            serie: values[1],
            numero: values[2],
            ruc_emisor: values[3],
            razon_social_emisor: values[4],
            fecha_emision: values[5],
            moneda: values[6],
            descripcion_servicio: values[7],
            monto_total: values[8],
            retencion: values[9],
            monto_neto: values[10],
            observaciones: values[11],
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
            ocr.tipo_propuesto =
              'RECIBO_HONORARIO';
            ocr.clave_documental =
              values[0];
          }

          return [];
        }

        throw new Error(
          `SQL_NO_MOCKEADO: ${q}`,
        );
      },
    );

    return {
      tx,
      queries,
      documento,
      archivo,
      getOcr: () => ocr,
      getReciboHonorario: () =>
        reciboHonorario,
    };
  }

  it('confirma RH con metadata humana, clave backend, tabla RH y OCR TEMP persistido', async () => {
    const x = setup();

    const result =
      await new ReciboHonorarioTempMaterializationRepository()
        .confirmReciboHonorarioWithExecutor(
          x.tx,
          {
            documentoId: 700,
            archivoId: 701,
            actor,
            humanValidatedData:
              metadataHumana,
            ocrCandidate,
          },
        );

    expect(result.claveDocumental).toBe(
      'BBTI|RECIBO_HONORARIO|20123456789|E001|123',
    );

    expect(result.metadata).toMatchObject({
      fechaEmision: '2026-09-20',
      serie: 'E001',
      numero: '123',
      rucEmisor: '20123456789',
      razonSocialEmisor:
        'PROFESIONAL VALIDADO',
      moneda: 'PEN',
      montoTotal: '150.50',
    });

    expect(result.metadata.serie)
      .not.toBe('OCR999');
    expect(result.metadata.numero)
      .not.toBe('999999');
    expect(result.metadata.rucEmisor)
      .not.toBe('20999999999');

    expect(x.documento).toMatchObject({
      id: 700,
      estado: 'confirmado',
      tipo_documental:
        'RECIBO_HONORARIO',
      serie: 'E001',
      numero: '123',
      ruc_emisor: '20123456789',
      razon_social_emisor:
        'PROFESIONAL VALIDADO',
      clave_documental:
        'BBTI|RECIBO_HONORARIO|20123456789|E001|123',
    });

    expect(x.getReciboHonorario())
      .toEqual({
        documento_id: 700,
        serie: 'E001',
        numero: '123',
        ruc_emisor: '20123456789',
        razon_social_emisor:
          'PROFESIONAL VALIDADO',
        fecha_emision: '2026-09-20',
        moneda: 'PEN',
        descripcion_servicio:
          'SERVICIO VALIDADO',
        monto_total: '150.50',
        retencion: '12.00',
        monto_neto: '138.50',
        observaciones:
          'VALIDADO POR USUARIO',
      });

    expect(x.getOcr()).toMatchObject({
      id: 702,
      documento_id: 700,
      archivo_id: 701,
      tipo_propuesto:
        'RECIBO_HONORARIO',
      estado: 'confirmado',
      clave_documental:
        'BBTI|RECIBO_HONORARIO|20123456789|E001|123',
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
          'INSERT INTO documentos.documentos_recibo_honorario',
        ),
      ),
    ).toHaveLength(1);

    expect(
      x.queries.some(q =>
        q.includes(
          'documentos.documentos_factura',
        ),
      ),
    ).toBe(false);
  });

  it('reutiliza OCR persistente del mismo documento/archivo sin insertar otro', async () => {
    const x = setup({
      existingOcr: true,
    });

    const result =
      await new ReciboHonorarioTempMaterializationRepository()
        .confirmReciboHonorarioWithExecutor(
          x.tx,
          {
            documentoId: 700,
            archivoId: 701,
            actor,
            humanValidatedData:
              metadataHumana,
            ocrCandidate,
          },
        );

    expect(result.ocrResultadoId)
      .toBe(702);

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
        'BBTI|RECIBO_HONORARIO|20123456789|E001|123',
    });
  });

  it('rechaza clave RH duplicada antes de mutar documento, RH u OCR', async () => {
    const x = setup({
      duplicate: true,
    });

    await expect(
      new ReciboHonorarioTempMaterializationRepository()
        .confirmReciboHonorarioWithExecutor(
          x.tx,
          {
            documentoId: 700,
            archivoId: 701,
            actor,
            humanValidatedData:
              metadataHumana,
            ocrCandidate,
          },
        ),
    ).rejects.toThrow(
      'RECIBO_HONORARIO_TEMP_DOCUMENT_DUPLICATE',
    );

    expect(x.documento.estado)
      .toBe('pendiente_ocr');
    expect(x.getReciboHonorario())
      .toBeNull();
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
  });

  it('no exige expediente ni crea Factura artificial', async () => {
    const x = setup();

    const result =
      await new ReciboHonorarioTempMaterializationRepository()
        .confirmReciboHonorarioWithExecutor(
          x.tx,
          {
            documentoId: 700,
            archivoId: 701,
            actor,
            humanValidatedData:
              metadataHumana,
            ocrCandidate,
          },
        );

    expect(
      result.metadata.codigoExpediente,
    ).toBeUndefined();

    expect(
      x.queries.some(q =>
        q.includes(
          'expediente_documentos',
        ),
      ),
    ).toBe(false);

    expect(
      x.queries.some(q =>
        q.includes(
          'documentos.expedientes',
        ),
      ),
    ).toBe(false);

    expect(
      x.queries.some(q =>
        q.includes(
          'documentos.documentos_factura',
        ),
      ),
    ).toBe(false);
  });
});
