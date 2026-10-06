import { sql } from '@documental/database';

import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('GrupoFacturaDocumentoRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  it('vincula un documento a un grupo de factura', async () => {
    const row = {
      id: 1,
      grupoFacturaId: 2,
      documentoId: 3,
      tipoRelacion: 'adjunto_guia',
      estado: 'activo',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new GrupoFacturaDocumentoRepository();
    const result = await repository.crear({
      grupoFacturaId: 2,
      documentoId: 3,
      tipoRelacion: 'adjunto_guia',
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('busca vínculo activo por documento', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new GrupoFacturaDocumentoRepository();
    const result = await repository.buscarActivoPorDocumentoId(3);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('lista ids históricos anulados del documento asociado', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 11 }, { id: 18 }]);

    const repository = new GrupoFacturaDocumentoRepository();
    const result = await repository.listarHistoricosPorDocumentoId(5);

    expect(result).toEqual([11, 18]);
  });

  describe('K10O19 read-model identity', () => {
    const ejecutarListado = async (
      serie: string | null,
      numero: string | null,
      tipoRelacion: string,
    ) => {
      let query = '';

      const executor = ((strings: TemplateStringsArray) => {
        query = strings.join('?');

        return Promise.resolve([
          {
            id: 901,
            grupoFacturaId: 77,
            documentoId: 501,
            tipoRelacion,
            estado: 'activo',
            serie,
            numero,
            metadata: {},
            creadoPor: null,
            creadoEn: new Date('2026-09-30T00:00:00.000Z'),
            actualizadoPor: null,
            actualizadoEn: null,
            anuladoPor: null,
            anuladoEn: null,
            motivoAnulacion: null,
          },
        ]);
      }) as any;

      const repository = new GrupoFacturaDocumentoRepository();
      const rows = await repository.listarPorGrupoFactura(77, executor);

      return { row: rows[0], query };
    };

    it.each([
      ['FACTURA', 'regularizador_factura', 'F099', '0047077'],
      [
        'RECIBO_HONORARIO',
        'regularizador_recibo_honorario',
        'E001',
        '1023',
      ],
    ])(
      'proyecta identidad canónica para %s',
      async (_tipo, tipoRelacion, serie, numero) => {
        const { row, query } = await ejecutarListado(
          serie,
          numero,
          tipoRelacion,
        );

        expect(row.serie).toBe(serie);
        expect(row.numero).toBe(numero);
        expect(row.grupoFacturaId).toBe(77);
        expect(row.documentoId).toBe(501);
        expect(row.tipoRelacion).toBe(tipoRelacion);
        expect(row.estado).toBe('activo');

        expect(query).toContain('d.serie AS serie');
        expect(query).toContain('d.numero AS numero');
        expect(query).toContain('LEFT JOIN documentos.documentos d');
      },
    );

    it.each([
      [null, '1023'],
      ['E001', null],
    ])(
      'preserva identidad parcial serie=%s numero=%s',
      async (serie, numero) => {
        const { row } = await ejecutarListado(
          serie,
          numero,
          'regularizador_recibo_honorario',
        );

        expect(row.serie).toBe(serie);
        expect(row.numero).toBe(numero);
      },
    );
  });

});
