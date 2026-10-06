import { ConfigBeneficiariosRendicionOpRepository } from './config-beneficiarios-rendicion-op.repository';

describe('ConfigBeneficiariosRendicionOpRepository', () => {
  const repo = new ConfigBeneficiariosRendicionOpRepository();

  it('lista sólo configuración activa, usuario activo y contexto/global', async () => {
    const tx = jest.fn().mockResolvedValue([
      { usuarioId: '5' },
    ]);

    const rows = await repo.listarActivos(7, tx as any);

    expect(rows).toEqual([{ usuarioId: 5 }]);

    const strings = tx.mock.calls[0][0]
      .map((x: unknown) => String(x))
      .join(' ');

    expect(strings).toContain('cr.activo = true');
    expect(strings).toContain("u.estado = 'activo'");
    expect(strings).toContain('cr.contenedor_operativo_id =');
    expect(strings).toContain('cr.contenedor_operativo_id IS NULL');
    expect(strings).toContain('DISTINCT ON (cr.usuario_id)');
    expect(strings).toContain(
      '(cr.contenedor_operativo_id ='
    );
    expect(strings).toContain('DESC');
  });

  it('estaHabilitado exige config activa, usuario activo y contexto/global', async () => {
    const tx = jest.fn().mockResolvedValue([{ ok: 1 }]);

    await expect(
      repo.estaHabilitado(7, 5, tx as any),
    ).resolves.toBe(true);

    const strings = tx.mock.calls[0][0]
      .map((x: unknown) => String(x))
      .join(' ');

    expect(strings).toContain('cr.usuario_id =');
    expect(strings).toContain('cr.activo = true');
    expect(strings).toContain("u.estado = 'activo'");
    expect(strings).toContain('cr.contenedor_operativo_id =');
    expect(strings).toContain('cr.contenedor_operativo_id IS NULL');
  });

  it('estaHabilitado devuelve false sin usuario/config elegible', async () => {
    const tx = jest.fn().mockResolvedValue([]);

    await expect(
      repo.estaHabilitado(7, 99, tx as any),
    ).resolves.toBe(false);
  });
});
