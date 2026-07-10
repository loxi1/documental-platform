jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { ConflictException, NotFoundException } from '@nestjs/common';

import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { GrupoFacturaDocumentoService } from './grupo-factura-documento.service';

describe('GrupoFacturaDocumentoService', () => {
  const repository = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    buscarActivoPorDocumentoId: jest.fn(),
    listarPorGrupoFactura: jest.fn(),
    actualizar: jest.fn(),
    anular: jest.fn(),
  } as unknown as jest.Mocked<GrupoFacturaDocumentoRepository>;

  const grupoFacturaRepository = {
    buscarPorId: jest.fn(),
  } as unknown as jest.Mocked<GrupoFacturaRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vincula documento a grupo de factura vigente', async () => {
    const row = { id: 1, grupoFacturaId: 2, documentoId: 3, tipoRelacion: 'guia' };
    grupoFacturaRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'pendiente_revision' } as never);
    repository.buscarActivoPorDocumentoId.mockResolvedValueOnce(null);
    repository.crear.mockResolvedValueOnce(row as never);

    const service = new GrupoFacturaDocumentoService(repository, grupoFacturaRepository);
    const result = await service.crear({ grupoFacturaId: 2, documentoId: 3, tipoRelacion: 'Guia' });

    expect(repository.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        grupoFacturaId: 2,
        documentoId: 3,
        tipoRelacion: 'guia',
        estado: 'activo',
      }),
    );
    expect(result).toBe(row);
  });

  it('bloquea documento ya vinculado a grupo activo', async () => {
    grupoFacturaRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'pendiente_revision' } as never);
    repository.buscarActivoPorDocumentoId.mockResolvedValueOnce({ id: 9, grupoFacturaId: 7 } as never);

    const service = new GrupoFacturaDocumentoService(repository, grupoFacturaRepository);

    await expect(
      service.crear({ grupoFacturaId: 2, documentoId: 3, tipoRelacion: 'guia' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.crear).not.toHaveBeenCalled();
  });

  it('bloquea vinculación si el grupo está anulado o no existe', async () => {
    grupoFacturaRepository.buscarPorId.mockResolvedValueOnce({ id: 2, estado: 'anulado' } as never);

    const service = new GrupoFacturaDocumentoService(repository, grupoFacturaRepository);

    await expect(
      service.crear({ grupoFacturaId: 2, documentoId: 3, tipoRelacion: 'guia' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
