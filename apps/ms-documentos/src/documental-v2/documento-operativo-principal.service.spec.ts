jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { ConflictException, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { DocumentoOperativoPrincipalService } from './documento-operativo-principal.service';

describe('DocumentoOperativoPrincipalService', () => {
  const repository = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorDocumentoId: jest.fn(),
    listarPorContenedor: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  } as unknown as jest.Mocked<DocumentoOperativoPrincipalRepository>;

  const contenedorRepository = {
    buscarPorId: jest.fn(),
  } as unknown as jest.Mocked<ContenedorOperativoRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un documento operativo principal asociado a contenedor activo', async () => {
    const row = { id: 1, contenedorOperativoId: 2, documentoId: 3, tipoPrincipal: 'OC' };
    contenedorRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'activo' } as never);
    repository.buscarPorDocumentoId.mockResolvedValueOnce(null);
    repository.crear.mockResolvedValueOnce(row as never);

    const service = new DocumentoOperativoPrincipalService(repository, contenedorRepository);
    const result = await service.crear({
      contenedorOperativoId: 2,
      documentoId: 3,
      tipoPrincipal: 'oc',
    });

    expect(contenedorRepository.buscarPorId).toHaveBeenCalledWith(2);
    expect(repository.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        contenedorOperativoId: 2,
        documentoId: 3,
        tipoPrincipal: 'OC',
        estado: 'activo',
      }),
    );
    expect(result).toBe(row);
  });

  it('bloquea documento operativo principal duplicado activo', async () => {
    contenedorRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'activo' } as never);
    repository.buscarPorDocumentoId.mockResolvedValueOnce({ id: 9, estado: 'activo' } as never);

    const service = new DocumentoOperativoPrincipalService(repository, contenedorRepository);

    await expect(
      service.crear({ contenedorOperativoId: 2, documentoId: 3, tipoPrincipal: 'OC' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.crear).not.toHaveBeenCalled();
  });

  it('bloquea creación si el contenedor no existe o no está activo', async () => {
    contenedorRepository.buscarPorId.mockResolvedValueOnce(null);

    const service = new DocumentoOperativoPrincipalService(repository, contenedorRepository);

    await expect(
      service.crear({ contenedorOperativoId: 2, documentoId: 3, tipoPrincipal: 'OC' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
