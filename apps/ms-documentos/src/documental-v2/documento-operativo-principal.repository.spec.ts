import { sql } from '@documental/database';

import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('DocumentoOperativoPrincipalRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  it('crea un documento operativo principal', async () => {
    const row = {
      id: 1,
      contenedorOperativoId: 10,
      documentoId: 20,
      tipoPrincipal: 'OC',
      esPrincipalActivo: false,
      estado: 'activo',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new DocumentoOperativoPrincipalRepository();
    const result = await repository.crear({
      contenedorOperativoId: 10,
      documentoId: 20,
      tipoPrincipal: 'OC',
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('lista por contenedor', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new DocumentoOperativoPrincipalRepository();
    const result = await repository.listarPorContenedor(10);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('busca únicamente la relación principal activa por documento', async () => {
    const row = {
      id: 21,
      contenedorOperativoId: 10,
      documentoId: 3,
      tipoPrincipal: 'OC',
      esPrincipalActivo: true,
      estado: 'activo',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new DocumentoOperativoPrincipalRepository();
    const result = await repository.buscarActivoPorDocumentoId(3);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('lista ids históricos anulados del principal por documento', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 7 }, { id: 12 }]);

    const repository = new DocumentoOperativoPrincipalRepository();
    const result = await repository.listarHistoricosPorDocumentoId(3);

    expect(result).toEqual([7, 12]);
  });
});
