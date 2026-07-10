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
});
