import { ForbiddenException, NotFoundException } from '@nestjs/common';
jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));
import { ConsultarTrazabilidadV2UseCase } from './consultar-trazabilidad-v2.usecase';

describe('ConsultarTrazabilidadV2UseCase', () => {
  const contenedores = {
    buscarPorId: jest.fn(),
  };

  const trazabilidadRepository = {
    listarAuditoriaOperativaPorContenedor: jest.fn(),
  };

  const projectionMapper = {
    construirRespuesta: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildUseCase = () =>
    new ConsultarTrazabilidadV2UseCase(
      contenedores as any,
      trazabilidadRepository as any,
      projectionMapper as any,
    );

  it('consulta trazabilidad por contenedor operativo autorizado', async () => {
    contenedores.buscarPorId.mockResolvedValue({
      id: 2,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    });
    trazabilidadRepository.listarAuditoriaOperativaPorContenedor.mockResolvedValue([
      { id: 348 },
    ]);
    projectionMapper.construirRespuesta.mockReturnValue({
      version: 1,
      contenedorOperativoId: 2,
      items: [],
      cobertura: { auditoria: true, documentoEventos: false, parcial: true },
      advertencias: ['SIN_EVENTOS_DOCUMENTALES'],
    });

    const result = await buildUseCase().execute({
      contenedorOperativoId: 2,
      usuario: {
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
    });

    expect(contenedores.buscarPorId).toHaveBeenCalledWith(2);
    expect(trazabilidadRepository.listarAuditoriaOperativaPorContenedor).toHaveBeenCalledWith({
      contenedorOperativoId: 2,
      empresaCodigo: 'BBTI',
    });
    expect(projectionMapper.construirRespuesta).toHaveBeenCalledWith({
      contenedorOperativoId: 2,
      auditoriaRows: [{ id: 348 }],
      documentoEventosOperativoDisponible: false,
    });
    expect(result.version).toBe(1);
  });

  it('lanza 404 si el contenedor operativo no existe', async () => {
    contenedores.buscarPorId.mockResolvedValue(null);

    await expect(
      buildUseCase().execute({ contenedorOperativoId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza 403 si la empresa del contexto no coincide', async () => {
    contenedores.buscarPorId.mockResolvedValue({
      id: 2,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    });

    await expect(
      buildUseCase().execute({
        contenedorOperativoId: 2,
        usuario: { empresaCodigo: 'CIMA', clienteDestinoId: 2 },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lanza 403 si el cliente destino del contexto no coincide', async () => {
    contenedores.buscarPorId.mockResolvedValue({
      id: 2,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    });

    await expect(
      buildUseCase().execute({
        contenedorOperativoId: 2,
        usuario: { empresaCodigo: 'BBTI', clienteDestinoId: 99 },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
