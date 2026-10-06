jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';

describe('DocumentosRepository / mantenimiento proveedores', () => {
  const sqlMock = sql as jest.Mock;

  const makeRepository = () => {
    const repo = new DocumentosRepository(
      {} as any,
      {} as any,
    );

    return repo;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista exclusivamente desde core.proveedores sin consultar proveedor externo', async () => {
    const repo = makeRepository();

    const externo = jest
      .spyOn(repo as any, 'fetchProveedorRucExterno')
      .mockResolvedValue(null);

    sqlMock
      .mockResolvedValueOnce([
        {
          id: 1,
          ruc: '20123456789',
          razonSocial: 'Proveedor SAC',
          direccion: 'Lima',
          tipoPersona: 'JURIDICA',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await repo.findProveedoresMantenimiento({
      q: 'Proveedor',
      page: 1,
      pageSize: 25,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(externo).not.toHaveBeenCalled();

    const sqlText = sqlMock.mock.calls
      .map((call) => String(call[0]))
      .join('\n');

    expect(sqlText).toContain('core.proveedores');
  });

  it('normaliza paginación inválida sin propagar NaN al SQL', async () => {
    const repo = makeRepository();

    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    const result = await repo.findProveedoresMantenimiento({
      page: Number.NaN,
      pageSize: Number.NaN,
      offset: Number.NaN,
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.offset).toBe(0);

    const values = sqlMock.mock.calls.flatMap((call) => call.slice(1));

    expect(values.some((value) => Number.isNaN(value))).toBe(false);
  });

  it('detalle consulta core.proveedores y no activa fallback externo', async () => {
    const repo = makeRepository();

    const externo = jest
      .spyOn(repo as any, 'fetchProveedorRucExterno')
      .mockResolvedValue(null);

    sqlMock.mockResolvedValueOnce([
      {
        id: 7,
        ruc: '20123456789',
        razonSocial: 'Proveedor SAC',
        direccion: null,
        tipoPersona: 'JURIDICA',
      },
    ]);

    const result = await repo.findProveedorMantenimientoById(7);

    expect(result?.id).toBe(7);
    expect(externo).not.toHaveBeenCalled();

    const sqlText = String(sqlMock.mock.calls[0][0]);
    expect(sqlText).toContain('core.proveedores');
  });

  it('crea directamente en core.proveedores sin consultar catálogo externo', async () => {
    const repo = makeRepository();

    const externo = jest
      .spyOn(repo as any, 'fetchProveedorRucExterno')
      .mockResolvedValue(null);

    sqlMock
      .mockResolvedValueOnce([{ id: 8 }])
      .mockResolvedValueOnce([
        {
          id: 8,
          ruc: '20123456789',
          razonSocial: 'Proveedor SAC',
          direccion: 'Lima',
          tipoPersona: 'JURIDICA',
        },
      ]);

    const result = await repo.createProveedorMantenimiento({
      ruc: '20123456789',
      razonSocial: 'Proveedor SAC',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    });

    expect(result?.id).toBe(8);
    expect(externo).not.toHaveBeenCalled();

    const sqlText = String(sqlMock.mock.calls[0][0]);
    expect(sqlText).toContain('INSERT INTO core.proveedores');
  });

  it('actualiza directamente core.proveedores sin consultar catálogo externo', async () => {
    const repo = makeRepository();

    const externo = jest
      .spyOn(repo as any, 'fetchProveedorRucExterno')
      .mockResolvedValue(null);

    sqlMock
      .mockResolvedValueOnce([{ id: 8 }])
      .mockResolvedValueOnce([
        {
          id: 8,
          ruc: '20123456789',
          razonSocial: 'Proveedor Editado',
          direccion: 'Lima',
          tipoPersona: 'JURIDICA',
        },
      ]);

    const result = await repo.updateProveedorMantenimiento(8, {
      ruc: '20123456789',
      razonSocial: 'Proveedor Editado',
      direccion: 'Lima',
      tipoPersona: 'JURIDICA',
    });

    expect(result?.razonSocial).toBe('Proveedor Editado');
    expect(externo).not.toHaveBeenCalled();

    const sqlText = String(sqlMock.mock.calls[0][0]);
    expect(sqlText).toContain('UPDATE core.proveedores');
  });
});
