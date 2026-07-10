import { sql } from '@documental/database';

import { GrupoFacturaRepository } from './grupo-factura.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('GrupoFacturaRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  it('crea un grupo de factura sin duplicar metadata de factura', async () => {
    const row = {
      id: 1,
      documentoOperativoPrincipalId: 2,
      facturaDocumentoId: 3,
      estado: 'pendiente_revision',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.crear({
      documentoOperativoPrincipalId: 2,
      facturaDocumentoId: 3,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('busca por factura_documento_id', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.buscarPorFacturaDocumentoId(3);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
