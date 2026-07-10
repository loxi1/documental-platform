jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { ConflictException } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { ContenedorOperativoService } from './contenedor-operativo.service';

describe('ContenedorOperativoService', () => {
  const repository = {
    buscarPorClave: jest.fn(),
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    listar: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  } as unknown as jest.Mocked<ContenedorOperativoRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un contenedor operativo normalizando la clave de dominio', async () => {
    const row = { id: 1, empresaCodigo: 'BBTI', tipoContexto: 'centro_costo_op', codigo: '050201' };
    repository.buscarPorClave.mockResolvedValueOnce(null);
    repository.crear.mockResolvedValueOnce(row as never);

    const service = new ContenedorOperativoService(repository);
    const result = await service.crear({
      empresaCodigo: 'bbti',
      tipoContexto: 'Centro_Costo_OP',
      codigo: '050201',
    });

    expect(repository.buscarPorClave).toHaveBeenCalledWith({
      empresaCodigo: 'BBTI',
      tipoContexto: 'centro_costo_op',
      codigo: '050201',
    });
    expect(repository.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaCodigo: 'BBTI',
        tipoContexto: 'centro_costo_op',
        codigo: '050201',
        estado: 'activo',
      }),
    );
    expect(result).toBe(row);
  });

  it('bloquea contenedor activo duplicado', async () => {
    repository.buscarPorClave.mockResolvedValueOnce({ id: 10, estado: 'activo' } as never);

    const service = new ContenedorOperativoService(repository);

    await expect(
      service.crear({ empresaCodigo: 'BBTI', tipoContexto: 'centro_costo_op', codigo: '050201' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.crear).not.toHaveBeenCalled();
  });
});
