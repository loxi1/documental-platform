import { obtenerFechaEmisionOpPersistida } from './orden-pago-fecha-emision';

describe('obtenerFechaEmisionOpPersistida', () => {
  const actor = {
    empresaCodigo: 'BBTI',
    clienteDestinoId: 7,
  };

  const mockTx = (estado: 'confirmado' | 'pendiente') => {
    const queries: string[] = [];

    const tx = async (
      strings: TemplateStringsArray,
      ..._values: unknown[]
    ) => {
      const sql = strings.join('?');
      queries.push(sql);

      if (!/AND\s+d\.estado\s*=\s*'confirmado'/.test(sql)) {
        throw new Error('Falta guard confirmado');
      }

      return estado === 'confirmado'
        ? [{ fechaEmision: '2026-09-15' }]
        : [];
    };

    return { tx, queries };
  };

  it('rechaza OP no confirmada', async () => {
    const { tx, queries } = mockTx('pendiente');

    await expect(
      obtenerFechaEmisionOpPersistida(
        tx as Parameters<typeof obtenerFechaEmisionOpPersistida>[0],
        31,
        actor,
      ),
    ).rejects.toThrow(
      'OP_PERIODO_FECHA_INVALIDA_O_NO_DISPONIBLE',
    );

    expect(queries).toHaveLength(1);
  });

  it('acepta OP confirmada y conserva fecha persistida', async () => {
    const { tx, queries } = mockTx('confirmado');

    const fecha = await obtenerFechaEmisionOpPersistida(
      tx as Parameters<typeof obtenerFechaEmisionOpPersistida>[0],
      31,
      actor,
    );

    expect(fecha.toISOString().slice(0, 10)).toBe('2026-09-15');
    expect(queries).toHaveLength(1);
  });
});
