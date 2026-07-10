jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { sql } from '@documental/database';

import { V1DocumentalReadOnlyRepository } from './v1-documental-readonly.repository';

describe('V1DocumentalReadOnlyRepository', () => {
  const sqlMock = sql as unknown as jest.Mock;

  beforeEach(() => {
    sqlMock.mockReset();
  });

  it('lee expediente y documentos V1 sin ejecutar escrituras', async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 41,
          empresaCodigo: 'BBTI',
          codigoExpediente: '050201',
          descripcion: 'PRODUCCION C X DISTRIBUIR',
          clienteDestinoId: 2,
          estado: 'activo',
          metadata: {},
          creadoEn: null,
          actualizadoEn: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          expedienteId: 41,
          documentoId: 1,
          tipoDocumental: 'OC',
          tipoRelacion: 'principal_oc',
          esPrincipal: true,
          orden: 1,
          metadata: {},
        },
      ]);

    const repository = new V1DocumentalReadOnlyRepository();
    const result = await repository.obtenerExpedienteConDocumentos(41);

    expect(result?.expediente.id).toBe(41);
    expect(result?.documentos).toHaveLength(1);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('retorna null cuando no existe el expediente V1', async () => {
    sqlMock.mockResolvedValueOnce([]);

    const repository = new V1DocumentalReadOnlyRepository();
    const result = await repository.obtenerExpedienteConDocumentos(999);

    expect(result).toBeNull();
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});
