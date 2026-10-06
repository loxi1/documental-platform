import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

jest.mock('@documental/shared', () => ({
  NatsSubjects: {},
}));

import { DocumentosService } from './documentos.service';

describe('DocumentosService / mantenimiento proveedores', () => {
  const makeService = (repoOverrides: Record<string, any> = {}) => {
    const repo = {
      findProveedoresMantenimiento: jest.fn(),
      findProveedorMantenimientoById: jest.fn(),
      existsProveedorRuc: jest.fn(),
      createProveedorMantenimiento: jest.fn(),
      updateProveedorMantenimiento: jest.fn(),
      ...repoOverrides,
    };

    const service = new DocumentosService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, repo };
  };

  it('delega listado con búsqueda y paginación', async () => {
    const result = {
      items: [],
      total: 0,
      page: 2,
      pageSize: 25,
      totalPages: 0,
    };

    const { service, repo } = makeService({
      findProveedoresMantenimiento: jest.fn().mockResolvedValue(result),
    });

    await expect(
      service.findProveedoresMantenimiento({
        q: '  ACME  ',
        page: 2,
        pageSize: 25,
      }),
    ).resolves.toBe(result);

    expect(repo.findProveedoresMantenimiento).toHaveBeenCalledWith({
      q: 'ACME',
      limit: undefined,
      offset: undefined,
      page: 2,
      pageSize: 25,
    });
  });

  it('devuelve detalle existente', async () => {
    const proveedor = {
      id: 7,
      ruc: '20123456789',
      razonSocial: 'Proveedor SAC',
      direccion: null,
      tipoPersona: 'JURIDICA',
    };

    const { service } = makeService({
      findProveedorMantenimientoById: jest.fn().mockResolvedValue(proveedor),
    });

    await expect(
      service.findProveedorMantenimientoById(7),
    ).resolves.toEqual(proveedor);
  });

  it('lanza 404 cuando el proveedor no existe', async () => {
    const { service } = makeService({
      findProveedorMantenimientoById: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.findProveedorMantenimientoById(999),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('crea proveedor normalizando datos', async () => {
    const creado = {
      id: 8,
      ruc: '20123456789',
      razonSocial: 'Proveedor SAC',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    };

    const { service, repo } = makeService({
      existsProveedorRuc: jest.fn().mockResolvedValue(null),
      createProveedorMantenimiento: jest.fn().mockResolvedValue(creado),
    });

    await expect(
      service.createProveedorMantenimiento({
        ruc: ' 20123456789 ',
        razonSocial: '  Proveedor SAC ',
        direccion: '  Lima ',
        tipoPersona: ' juridica ',
      }),
    ).resolves.toEqual(creado);

    expect(repo.existsProveedorRuc).toHaveBeenCalledWith('20123456789');
    expect(repo.createProveedorMantenimiento).toHaveBeenCalledWith({
      ruc: '20123456789',
      razonSocial: 'Proveedor SAC',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    });
  });

  it('rechaza RUC inválido', async () => {
    const { service } = makeService();

    await expect(
      service.createProveedorMantenimiento({
        ruc: '123',
        razonSocial: 'Proveedor',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza razón social vacía', async () => {
    const { service } = makeService();

    await expect(
      service.createProveedorMantenimiento({
        ruc: '20123456789',
        razonSocial: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza tipo de persona inválido', async () => {
    const { service } = makeService();

    await expect(
      service.createProveedorMantenimiento({
        ruc: '20123456789',
        razonSocial: 'Proveedor',
        tipoPersona: 'OTRO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza RUC duplicado con 409', async () => {
    const { service, repo } = makeService({
      existsProveedorRuc: jest.fn().mockResolvedValue({ id: 9 }),
    });

    await expect(
      service.createProveedorMantenimiento({
        ruc: '20123456789',
        razonSocial: 'Proveedor',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.createProveedorMantenimiento).not.toHaveBeenCalled();
  });

  it('actualiza parcialmente preservando campos no enviados', async () => {
    const actual = {
      id: 10,
      ruc: '20123456789',
      razonSocial: 'Proveedor Original',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    };

    const actualizado = {
      ...actual,
      razonSocial: 'Proveedor Actualizado',
    };

    const { service, repo } = makeService({
      findProveedorMantenimientoById: jest.fn().mockResolvedValue(actual),
      existsProveedorRuc: jest.fn().mockResolvedValue(null),
      updateProveedorMantenimiento: jest.fn().mockResolvedValue(actualizado),
    });

    await expect(
      service.updateProveedorMantenimiento(10, {
        razonSocial: ' Proveedor Actualizado ',
      }),
    ).resolves.toEqual(actualizado);

    expect(repo.existsProveedorRuc).toHaveBeenCalledWith(
      '20123456789',
      10,
    );

    expect(repo.updateProveedorMantenimiento).toHaveBeenCalledWith(10, {
      ruc: '20123456789',
      razonSocial: 'Proveedor Actualizado',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    });
  });
});
