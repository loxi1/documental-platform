jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));

import { DocumentosRepository } from './documentos.repository';

function setup(options: {
  owner?: number;
  archivoEstado?: string;
  documentoEstado?: string;
  ocrExistente?: boolean;
} = {}) {
  const queries: string[] = [];

  const tx = jest.fn(
    async (strings: TemplateStringsArray, ..._values: any[]) => {
      const q = strings.join('?').replace(/\s+/g, ' ').trim();
      queries.push(q);

      if (q.startsWith('SELECT id, documento_id, estado FROM documentos.documentos_archivos')) {
        return [{
          id: 12,
          documento_id: options.owner ?? 10,
          estado: options.archivoEstado ?? 'activo',
        }];
      }

      if (q.startsWith('SELECT id, estado FROM documentos.documentos WHERE')) {
        return [{
          id: 10,
          estado: options.documentoEstado ?? 'pendiente_ocr',
        }];
      }

      if (q.startsWith('SELECT id, estado FROM documentos.ocr_resultados')) {
        return options.ocrExistente
          ? [{ id: 20, estado: 'pendiente_validacion' }]
          : [];
      }

      if (q.startsWith('INSERT INTO documentos.ocr_resultados')) {
        return [{
          id: 21,
          archivo_id: 12,
          documento_id: 10,
          tipo_propuesto: 'FACTURA',
          estado: 'pendiente_validacion',
          confidence: null,
          clave_documental: null,
          metadata: {
            origenValidacion: 'manual_sin_ocr',
            metadata: {},
          },
        }];
      }

      return [];
    },
  );

  return { tx, queries };
}

describe('2B validacion manual de factura persistida', () => {
  it('A/G: sin OCR crea validacion manual bajo locks archivo -> documento -> OCR', async () => {
    const { tx, queries } = setup();

    const result =
      await new DocumentosRepository().crearValidacionManualFacturaConExecutor(
        tx as any,
        { documentoId: 10, archivoId: 12 },
      );

    const locks = queries.filter((q) => q.includes('FOR UPDATE'));

    expect(locks).toHaveLength(3);
    expect(locks[0]).toContain('FROM documentos.documentos_archivos');
    expect(locks[1]).toContain('FROM documentos.documentos WHERE');
    expect(locks[2]).toContain('FROM documentos.ocr_resultados');

    expect(result).toMatchObject({
      id: 21,
      archivo_id: 12,
      documento_id: 10,
      tipo_propuesto: 'FACTURA',
      estado: 'pendiente_validacion',
      confidence: null,
      clave_documental: null,
      metadata: {
        origenValidacion: 'manual_sin_ocr',
        metadata: {},
      },
    });

    expect(
      queries.filter((q) =>
        q.startsWith('INSERT INTO documentos.ocr_resultados'),
      ),
    ).toHaveLength(1);
  });

  it('B: si aparece OCR antes de confirmar manual, aborta sin INSERT', async () => {
    const { tx, queries } = setup({ ocrExistente: true });

    await expect(
      new DocumentosRepository().crearValidacionManualFacturaConExecutor(
        tx as any,
        { documentoId: 10, archivoId: 12 },
      ),
    ).rejects.toMatchObject({
      code: 'OCR_DISPONIBLE_PARA_VALIDACION',
    });

    expect(
      queries.some((q) =>
        q.startsWith('INSERT INTO documentos.ocr_resultados'),
      ),
    ).toBe(false);
  });

  it('C: archivo reasignado aborta antes de bloquear documento/OCR', async () => {
    const { tx, queries } = setup({ owner: 99 });

    await expect(
      new DocumentosRepository().crearValidacionManualFacturaConExecutor(
        tx as any,
        { documentoId: 10, archivoId: 12 },
      ),
    ).rejects.toMatchObject({
      code: 'MANUAL_ARCHIVO_DOCUMENTO_INVALIDO',
    });

    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('documentos.documentos_archivos');
    expect(
      queries.some((q) =>
        q.startsWith('INSERT INTO documentos.ocr_resultados'),
      ),
    ).toBe(false);
  });

  it.each([
    ['anulado', 'MANUAL_DOCUMENTO_NO_ELEGIBLE'],
    ['duplicado_versionado', 'MANUAL_DOCUMENTO_NO_ELEGIBLE'],
    ['confirmado', 'MANUAL_DOCUMENTO_YA_CONFIRMADO'],
  ])(
    'D: documento %s aborta sin consultar ni insertar OCR',
    async (documentoEstado, code) => {
      const { tx, queries } = setup({ documentoEstado });

      await expect(
        new DocumentosRepository().crearValidacionManualFacturaConExecutor(
          tx as any,
          { documentoId: 10, archivoId: 12 },
        ),
      ).rejects.toMatchObject({ code });

      expect(
        queries.some((q) =>
          q.includes('FROM documentos.ocr_resultados'),
        ),
      ).toBe(false);

      expect(
        queries.some((q) =>
          q.startsWith('INSERT INTO documentos.ocr_resultados'),
        ),
      ).toBe(false);
    },
  );
});
