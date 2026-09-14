jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { BuscarContextosOpService } from './buscar-contextos-op.service';

describe('Selección autorizada de contexto OP', () => {
  const actor = { id: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2 };
  const listar = jest.fn();
  const service = new BuscarContextosOpService({ listar } as any);
  beforeEach(() => { jest.clearAllMocks(); listar.mockResolvedValue({ items: [] }); });
  it.each(['', '0', ' '])('no consulta sin búsqueda suficiente: %s', async q => {
    expect(await service.buscar(actor, { q })).toEqual({ items: [] });
    expect(listar).not.toHaveBeenCalled();
  });
  it.each(['999', 'NaN', '-1', '1.5', 'Infinity'])('limita entradas no confiables: %s', async limit => {
    await service.buscar(actor, { q: '050', limit });
    expect(listar).toHaveBeenCalledWith({ empresaCodigo: 'BBTI', clienteDestinoId: 2,
      estado: 'activo', q: '050', limit: 10, offset: 0 });
  });
  it('proyecta solo identidad real y etiquetas, sin datos documentales', async () => {
    listar.mockResolvedValue({ items: [{ id: '93', expedienteV1Id: '12', codigo: '050',
      descripcion: 'Descripción', nombre: 'Nombre', metadata: { secreto: 'no exponer' } }] });
    expect(await service.buscar(actor, { q: '050', limit: '3' })).toEqual({ items: [
      { contenedorOperativoId: 93, expedienteId: 12, codigo: '050', descripcion: 'Descripción' }] });
    expect(listar.mock.calls[0][0].limit).toBe(3);
  });
  it('rechaza workspace sin cliente para evitar listado sin aislamiento', async () => {
    await expect(service.buscar({ ...actor, clienteDestinoId: null }, { q: '050' })).rejects.toThrow('Workspace sin cliente');
    expect(listar).not.toHaveBeenCalled();
  });
});
