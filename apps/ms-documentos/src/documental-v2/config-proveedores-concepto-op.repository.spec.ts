import { ConfigProveedoresConceptoOpRepository } from './config-proveedores-concepto-op.repository';

describe('ConfigProveedoresConceptoOpRepository', () => {
  const repo = new ConfigProveedoresConceptoOpRepository();

  it('lista sólo configuración activa del concepto y contexto/global', async () => {
    const tx = jest.fn().mockResolvedValue([
      {
        proveedorId: '2757',
        ruc: '20254165035',
        razonSocial: 'OFICINA DE NORMALIZACION PREVISIONAL',
      },
    ]);

    const rows = await repo.listarActivos(10, 7, tx as any);

    expect(rows).toEqual([
      {
        proveedorId: 2757,
        ruc: '20254165035',
        razonSocial: 'OFICINA DE NORMALIZACION PREVISIONAL',
      },
    ]);

    const strings = tx.mock.calls[0][0]
      .map((x: unknown) => String(x))
      .join(' ');

    expect(strings).toContain('cp.concepto_id =');
    expect(strings).toContain('cp.activo = true');
    expect(strings).toContain('cp.contenedor_operativo_id =');
    expect(strings).toContain('cp.contenedor_operativo_id IS NULL');
    expect(strings).toContain('DISTINCT ON (cp.proveedor_id)');
    expect(strings).toContain(
      '(cp.contenedor_operativo_id ='
    );
    expect(strings).toContain('DESC');
  });

  it('estaHabilitado aplica concepto, proveedor, activo y contexto/global', async () => {
    const tx = jest.fn().mockResolvedValue([{ ok: 1 }]);

    await expect(
      repo.estaHabilitado(10, 7, 2757, tx as any),
    ).resolves.toBe(true);

    const strings = tx.mock.calls[0][0]
      .map((x: unknown) => String(x))
      .join(' ');

    expect(strings).toContain('cp.concepto_id =');
    expect(strings).toContain('cp.proveedor_id =');
    expect(strings).toContain('cp.activo = true');
    expect(strings).toContain('cp.contenedor_operativo_id =');
    expect(strings).toContain('cp.contenedor_operativo_id IS NULL');
  });

  it('estaHabilitado devuelve false sin configuración elegible', async () => {
    const tx = jest.fn().mockResolvedValue([]);

    await expect(
      repo.estaHabilitado(10, 7, 9999, tx as any),
    ).resolves.toBe(false);
  });
});
