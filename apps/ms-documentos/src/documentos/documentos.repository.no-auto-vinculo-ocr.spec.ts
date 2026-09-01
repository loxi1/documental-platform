jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';

describe('DocumentosRepository - OCR pendiente no crea vínculo canónico', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda OCR pendiente sin consultar ni escribir expediente_documentos', async () => {
    const queries: string[] = [];
    const sqlMock = sql as unknown as jest.Mock;

    sqlMock.mockImplementation(
      async (strings: TemplateStringsArray, ..._values: unknown[]) => {
        const query = strings.join('?').replace(/\s+/g, ' ').trim();
        queries.push(query);

        if (query.includes('INSERT INTO documentos.ocr_resultados')) {
          return [
            {
              id: 96,
              archivo_id: 93,
              documento_id: 107,
              estado: 'pendiente_validacion',
              tipo_propuesto: 'OC',
              clave_documental: 'BBTI|OC|008181',
              metadata: {},
            },
          ];
        }

        return [];
      },
    );

    const result = await new DocumentosRepository().saveOcrResultado({
      archivoId: 93,
      documentoId: 107,
      tipoPropuesto: 'OC',
      estado: 'pendiente_validacion',
      confidence: 1,
      claveDocumental: null,
      metadata: {
        clienteAbreviatura: 'BBTI',
        metadata: {
          numero: '008181',
          codigoExpediente: '050201',
        },
      },
      forceReprocess: true,
    });

    expect(result.expediente).toBeNull();
    expect(result.row).toMatchObject({
      id: 96,
      documento_id: 107,
      estado: 'pendiente_validacion',
    });
    expect(
      queries.some((query) => query.includes('documentos.expediente_documentos')),
    ).toBe(false);
    expect(
      queries.some((query) => query.includes('UPDATE documentos.ocr_resultados')),
    ).toBe(false);
  });
});
