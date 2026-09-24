import { sql } from '@documental/database';

import { GrupoFacturaRepository } from './grupo-factura.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('GrupoFacturaRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  describe('G3 normalización bigint de expedienteId', () => {
    const actor = {
      id: 3,
      workspaceId: 12,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    };

    const rowBase = {
      origenObligacion: 'ORDEN_PAGO',
      facturaDocumentoId: null,
      principalId: '601',
      tipoPrincipal: 'ORDEN_PAGO',
      documentoPrincipalId: '46',
      contenedorId: '501',
    };

    it('T1: raw expedienteId string se normaliza a number seguro', async () => {
      sqlMock.mockResolvedValueOnce([
        { ...rowBase, expedienteId: '26' },
      ]);

      const result =
        await new GrupoFacturaRepository().buscarObligacionScoped(
          701,
          actor,
          sqlMock as any,
        );

      expect(result?.expedienteId).toBe(26);
      expect(typeof result?.expedienteId).toBe('number');
    });

    it('T3: raw expedienteId null conserva null', async () => {
      sqlMock.mockResolvedValueOnce([
        { ...rowBase, expedienteId: null },
      ]);

      const result =
        await new GrupoFacturaRepository().buscarObligacionScoped(
          701,
          actor,
          sqlMock as any,
        );

      expect(result?.expedienteId).toBeNull();
    });

    it.each([
      ['T4 no numérico', 'abc'],
      ['T5 no entero', '26.5'],
      ['T6 unsafe integer', String(Number.MAX_SAFE_INTEGER + 1)],
    ])('%s falla cerrado', async (_caso, expedienteId) => {
      sqlMock.mockResolvedValueOnce([
        { ...rowBase, expedienteId },
      ]);

      await expect(
        new GrupoFacturaRepository().buscarObligacionScoped(
          701,
          actor,
          sqlMock as any,
        ),
      ).rejects.toThrow(
        'expedienteId persistido fuera del contrato numérico seguro',
      );
    });
  });

  it('crea un grupo de factura sin duplicar metadata de factura', async () => {
    const row = {
      id: 1,
      documentoOperativoPrincipalId: 2,
      facturaDocumentoId: 3,
      estado: 'pendiente_revision',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.crear({
      documentoOperativoPrincipalId: 2,
      facturaDocumentoId: 3,
    });

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('busca por factura_documento_id', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.buscarPorFacturaDocumentoId(3);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('busca únicamente el Grupo vigente por factura', async () => {
    const row = {
      id: 31,
      documentoOperativoPrincipalId: 21,
      facturaDocumentoId: 4,
      estado: 'pendiente_revision',
      metadata: {},
    };
    sqlMock.mockResolvedValueOnce([row]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.buscarVigentePorFacturaDocumentoId(4);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(row);
  });

  it('lista ids históricos anulados de la factura fundadora', async () => {
    sqlMock.mockResolvedValueOnce([{ id: 9 }, { id: 14 }]);

    const repository = new GrupoFacturaRepository();
    const result = await repository.listarHistoricosPorFacturaDocumentoId(4);

    expect(result).toEqual([9, 14]);
  });
});
