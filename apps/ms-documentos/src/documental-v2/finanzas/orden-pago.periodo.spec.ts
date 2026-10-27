jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { OrdenPagoController } from './orden-pago.controller';
const headers = { 'x-user-id': '6', 'x-workspace-id': '13', 'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2' };
describe('Bandeja Finanzas período', () => {
  const repo = { getRevisionContable: jest.fn().mockResolvedValue([]) };
  const c = new OrdenPagoController({} as any, repo as any, {} as any);
  beforeEach(() => jest.clearAllMocks());
  it('sin período no invoca repositorio', async () => { expect(await c.bandeja(headers, { q: 'ABC' })).toEqual({ items: [] }); expect(repo.getRevisionContable).not.toHaveBeenCalled(); });
  it.each([{ anio: '2026' }, { mes: '2' }, { anio: '2026', mes: '13' }, { anio: '20x6', mes: '2' }])('rechaza período incompleto/inválido %j', async query => { await expect(c.bandeja(headers, query as Record<string, string>)).rejects.toThrow(); expect(repo.getRevisionContable).not.toHaveBeenCalled(); });
  it('propaga período y scope autenticado', async () => { await c.bandeja(headers, { anio: '2026', mes: '2', q: 'ABC', limit: '26', offset: '25', soloPendientesFinanzas: 'true' }); expect(repo.getRevisionContable).toHaveBeenCalledWith({ empresa: 'BBTI', anio: 2026, mes: 2, q: 'ABC', limit: 26, offset: 25, soloPendientesFinanzas: true }, expect.objectContaining({ workspaceId: 13, clienteDestinoId: 2 })); });
});
