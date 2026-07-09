jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { ConflictException, NotFoundException } from '@nestjs/common';

import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { GrupoFacturaService } from './grupo-factura.service';

describe('GrupoFacturaService', () => {
  const repository = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorFacturaDocumentoId: jest.fn(),
    listarPorDocumentoOperativoPrincipal: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  } as unknown as jest.Mocked<GrupoFacturaRepository>;

  const documentoOperativoPrincipalRepository = {
    buscarPorId: jest.fn(),
  } as unknown as jest.Mocked<DocumentoOperativoPrincipalRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un grupo de factura asociado a documento operativo principal activo', async () => {
    const row = { id: 1, documentoOperativoPrincipalId: 2, facturaDocumentoId: 3 };
    documentoOperativoPrincipalRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'activo' } as never);
    repository.buscarPorFacturaDocumentoId.mockResolvedValueOnce(null);
    repository.crear.mockResolvedValueOnce(row as never);

    const service = new GrupoFacturaService(repository, documentoOperativoPrincipalRepository);
    const result = await service.crear({ documentoOperativoPrincipalId: 2, facturaDocumentoId: 3 });

    expect(repository.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        documentoOperativoPrincipalId: 2,
        facturaDocumentoId: 3,
        estado: 'pendiente_revision',
      }),
    );
    expect(result).toBe(row);
  });

  it('bloquea factura con grupo vigente', async () => {
    documentoOperativoPrincipalRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'activo' } as never);
    repository.buscarPorFacturaDocumentoId.mockResolvedValueOnce({ id: 8, estado: 'pendiente_revision' } as never);

    const service = new GrupoFacturaService(repository, documentoOperativoPrincipalRepository);

    await expect(
      service.crear({ documentoOperativoPrincipalId: 2, facturaDocumentoId: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.crear).not.toHaveBeenCalled();
  });

  it('bloquea grupo si no existe documento operativo principal activo', async () => {
    documentoOperativoPrincipalRepository.buscarPorId.mockResolvedValueOnce(null);

    const service = new GrupoFacturaService(repository, documentoOperativoPrincipalRepository);

    await expect(
      service.crear({ documentoOperativoPrincipalId: 2, facturaDocumentoId: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
