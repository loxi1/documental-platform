import { sql } from '@documental/database';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('ContenedorOperativoRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  it('crea un contenedor operativo', async () => {
    const row = {
      id: 1,
      empresaCodigo: 'BBTI',
      tipoContexto: 'CENTRO_COSTO_OP',
      codigo: '050201',
      estado: 'activo',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new ContenedorOperativoRepository();
    const result = await repository.crear({
      empresaCodigo: 'BBTI',
      tipoContexto: 'CENTRO_COSTO_OP',
      codigo: '050201',
      metadata: {},
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('busca por id y devuelve null si no existe', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new ContenedorOperativoRepository();
    const result = await repository.buscarPorId(999);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
