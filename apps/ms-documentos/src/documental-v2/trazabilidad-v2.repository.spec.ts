import { sql } from '@documental/database';
import { TrazabilidadV2Repository } from './trazabilidad-v2.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('TrazabilidadV2Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sql as unknown as jest.Mock).mockResolvedValue([]);
  });

  it('consulta auditoría operativa V2 por contenedor operativo y empresa', async () => {
    const repository = new TrazabilidadV2Repository();

    await expect(
      repository.listarAuditoriaOperativaPorContenedor({
        contenedorOperativoId: 2,
        empresaCodigo: 'BBTI',
      }),
    ).resolves.toEqual([]);

    expect(sql).toHaveBeenCalledTimes(1);
  });
});
