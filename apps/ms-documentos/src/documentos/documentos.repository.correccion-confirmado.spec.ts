jest.mock('@documental/database', () => ({
  sql: Object.assign(jest.fn(), {
    begin: jest.fn(),
  }),
}));

import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';

const sqlBeginMock = sql.begin as unknown as jest.Mock;

type QueryHandler = (query: string, values: unknown[]) => unknown[];

function txFrom(handler: QueryHandler) {
  return (strings: TemplateStringsArray, ...values: unknown[]) =>
    Promise.resolve(handler(strings.join('?'), values));
}

const documentoConfirmado = {
  id: 20,
  estado: 'confirmado',
  tipo_documental: 'FACTURA',
  cliente_abreviatura: 'BBTI',
  ruc_emisor: '20565747356',
  razon_social_emisor: 'BBTI S.A.C.',
  serie: 'T002',
  numero: '000000255',
  fecha_emision: '20206-04-16',
  moneda: null,
  monto_total: '444.95',
  clave_documental: 'BBTI|FACTURA|20565747356|T002|000000255',
  metadata: {
    ocr: {
      metadata: {
        qr: {
          numero: '00000254',
        },
      },
      audit: [],
    },
  },
};

const inputValido = {
  tipoDocumental: 'FACTURA',
  ocrResultadoId: 8,
  motivo: 'Corrección funcional validada por usuario',
  origen: 'CORRECCION_MANUAL_POST_CONFIRMACION',
  metadata: {
    clienteAbreviatura: 'BBTI',
    proveedor: 'OMEGA POWER S.A.C.',
    razonSocialEmisor: 'OMEGA POWER S.A.C.',
    rucEmisor: '20538549071',
    rucProveedor: '20538549071',
    rucComprador: '20565747356',
    serie: 'F002',
    numero: '00000255',
    fechaEmision: '2026-04-16',
    moneda: 'PEN',
    montoTotal: 444.95,
    correccion: {
      numeroVisible: '00000255',
      numeroQr: '00000254',
      criterio: 'NUMERO_VISIBLE_CONFIRMADO_POR_USUARIO',
    },
  },
};

describe('DocumentosRepository corrección post-confirmación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exige motivo para corregir un documento confirmado', async () => {
    const tx = txFrom((query) => {
      if (query.includes('FROM documentos.documentos')) {
        return [documentoConfirmado];
      }
      return [];
    });

    sqlBeginMock.mockImplementation((callback) => callback(tx));

    await expect(
      new DocumentosRepository().actualizarDocumentoManual(
        20,
        { ...inputValido, motivo: '' },
        1,
      ),
    ).rejects.toMatchObject({
      code: 'MOTIVO_CORRECCION_REQUERIDO',
    });
  });

  it('rechaza un OCR que no pertenece al documento', async () => {
    const tx = txFrom((query) => {
      if (query.includes('FROM documentos.documentos')) {
        return [documentoConfirmado];
      }
      if (query.includes('FROM documentos.ocr_resultados')) {
        return [];
      }
      return [];
    });

    sqlBeginMock.mockImplementation((callback) => callback(tx));

    await expect(
      new DocumentosRepository().actualizarDocumentoManual(
        20,
        inputValido,
        1,
      ),
    ).rejects.toMatchObject({
      code: 'OCR_RESULTADO_NO_PERTENECE_DOCUMENTO',
    });
  });

  it('bloquea una clave documental duplicada activa', async () => {
    const tx = txFrom((query) => {
      if (query.includes('FROM documentos.documentos') && query.includes('FOR UPDATE')) {
        return [documentoConfirmado];
      }
      if (query.includes('FROM documentos.ocr_resultados')) {
        return [{ id: 8, documento_id: 20, metadata: {} }];
      }
      if (query.includes('WHERE clave_documental')) {
        return [{ id: 99, estado: 'confirmado' }];
      }
      return [];
    });

    sqlBeginMock.mockImplementation((callback) => callback(tx));

    await expect(
      new DocumentosRepository().actualizarDocumentoManual(
        20,
        inputValido,
        1,
      ),
    ).rejects.toMatchObject({
      code: 'DOCUMENTO_DUPLICADO',
    });
  });

  it('actualiza documento, factura enriquecida y solo el OCR indicado', async () => {
    const queries: string[] = [];

    const tx = txFrom((query) => {
      queries.push(query);

      if (query.includes('FROM documentos.documentos') && query.includes('FOR UPDATE')) {
        return [documentoConfirmado];
      }
      if (query.includes('FROM documentos.ocr_resultados')) {
        return [{ id: 8, documento_id: 20, metadata: {} }];
      }
      if (query.includes('WHERE clave_documental')) {
        return [];
      }
      if (query.includes('UPDATE documentos.documentos')) {
        return [{ ...documentoConfirmado, serie: 'F002', numero: '00000255' }];
      }
      return [];
    });

    sqlBeginMock.mockImplementation((callback) => callback(tx));

    const result = await new DocumentosRepository().actualizarDocumentoManual(
      20,
      inputValido,
      1,
    );

    expect(result).toMatchObject({
      id: 20,
      serie: 'F002',
      numero: '00000255',
    });

    expect(queries.some((q) => q.includes('INSERT INTO documentos.documentos_factura'))).toBe(true);
    expect(
      queries.some(
        (q) =>
          q.includes('UPDATE documentos.ocr_resultados') &&
          q.includes('WHERE id =') &&
          q.includes('AND documento_id ='),
      ),
    ).toBe(true);
  });

  it('propaga el fallo transaccional y no lo convierte en éxito parcial', async () => {
    const tx = txFrom((query) => {
      if (query.includes('FROM documentos.documentos') && query.includes('FOR UPDATE')) {
        return [documentoConfirmado];
      }
      if (query.includes('FROM documentos.ocr_resultados')) {
        return [{ id: 8, documento_id: 20, metadata: {} }];
      }
      if (query.includes('WHERE clave_documental')) {
        return [];
      }
      if (query.includes('UPDATE documentos.documentos')) {
        return [{ ...documentoConfirmado, serie: 'F002' }];
      }
      if (query.includes('INSERT INTO documentos.documentos_factura')) {
        throw new Error('FALLO_FACTURA_ENRIQUECIDA');
      }
      return [];
    });

    sqlBeginMock.mockImplementation(async (callback) => callback(tx));

    await expect(
      new DocumentosRepository().actualizarDocumentoManual(
        20,
        inputValido,
        1,
      ),
    ).rejects.toThrow('FALLO_FACTURA_ENRIQUECIDA');
  });

  it('preserva la evidencia QR original mediante merge de metadata', async () => {
    let updateValues: unknown[] = [];

    const tx = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join('?');

      if (query.includes('FROM documentos.documentos') && query.includes('FOR UPDATE')) {
        return Promise.resolve([documentoConfirmado]);
      }
      if (query.includes('FROM documentos.ocr_resultados')) {
        return Promise.resolve([{ id: 8, documento_id: 20, metadata: {} }]);
      }
      if (query.includes('WHERE clave_documental')) {
        return Promise.resolve([]);
      }
      if (query.includes('UPDATE documentos.documentos')) {
        updateValues = values;
        return Promise.resolve([{ ...documentoConfirmado, serie: 'F002' }]);
      }
      return Promise.resolve([]);
    };

    sqlBeginMock.mockImplementation((callback) => callback(tx));

    await new DocumentosRepository().actualizarDocumentoManual(
      20,
      inputValido,
      1,
    );

    const serialized = updateValues
      .filter((value): value is string => typeof value === 'string')
      .find((value) => value.includes('"correccionDocumento"'));

    expect(serialized).toContain('"numero":"00000254"');
    expect(serialized).toContain('"numeroVisible":"00000255"');
    expect(serialized).toContain('"DOCUMENTO_CONFIRMADO_CORREGIDO"');
  });
});
