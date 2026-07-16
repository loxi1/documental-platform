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

  it('crea un contenedor operativo solo si no existe por clave', async () => {
    const row = {
      id: 10,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'expediente_v1',
      codigo: '0501',
      estado: 'activo',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new ContenedorOperativoRepository();
    const result = await repository.crearSiNoExistePorClave({
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'expediente_v1',
      codigo: '0501',
      nombre: 'COSTOS DE PRODUCCION',
      descripcion: 'COSTOS DE PRODUCCION',
      metadata: {
        origen: 'EXPEDIENTE_V1',
        expedienteId: 16,
      },
      creadoPor: 1,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('devuelve null cuando crearSiNoExistePorClave no inserta por conflicto de clave', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new ContenedorOperativoRepository();
    const result = await repository.crearSiNoExistePorClave({
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'expediente_v1',
      codigo: '0501',
      metadata: {},
      creadoPor: 1,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
