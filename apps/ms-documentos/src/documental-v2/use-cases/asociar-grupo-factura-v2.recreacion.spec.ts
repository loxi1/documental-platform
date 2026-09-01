jest.mock('../contenedor-operativo.repository', () => ({}));
jest.mock('../documento-operativo-principal.repository', () => ({}));
jest.mock('../grupo-factura.repository', () => ({}));
jest.mock('../documento-existente-readonly.repository', () => ({}));
jest.mock('../auditoria-operativa-v2.repository', () => ({}));

import { AsociarGrupoFacturaV2UseCase } from './asociar-grupo-factura-v2.usecase';

describe('AsociarGrupoFacturaV2UseCase recreación', () => {
  const contenedores = { buscarPorId: jest.fn() };
  const principales = { buscarPorId: jest.fn() };
  const grupos = {
    buscarVigentePorFacturaDocumentoId: jest.fn(),
    listarHistoricosPorFacturaDocumentoId: jest.fn(),
    crear: jest.fn(),
    actualizar: jest.fn(),
  };
  const documentos = { buscarPorId: jest.fn() };
  const auditoria = { registrarCreacion: jest.fn() };

  const useCase = () =>
    new AsociarGrupoFacturaV2UseCase(
      contenedores as any,
      principales as any,
      grupos as any,
      documentos as any,
      auditoria as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    principales.buscarPorId.mockResolvedValue({
      id: 3,
      contenedorOperativoId: 2,
      documentoId: 100,
      estado: 'activo',
      esPrincipalActivo: true,
    });
    contenedores.buscarPorId.mockResolvedValue({
      id: 2,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 10,
      tipoContexto: 'expediente_v1',
      codigo: '050201',
      estado: 'activo',
    });
    documentos.buscarPorId.mockResolvedValue({
      id: 200,
      tipoDocumental: 'FACTURA',
      clienteAbreviatura: 'BBTI',
      estado: 'confirmado',
      serie: 'F001',
      numero: '123',
    });
    grupos.buscarVigentePorFacturaDocumentoId.mockResolvedValue(null);
    grupos.listarHistoricosPorFacturaDocumentoId.mockResolvedValue([8]);
    grupos.crear.mockResolvedValue({
      id: 20,
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      estado: 'pendiente_revision',
      metadata: {},
    });
    grupos.actualizar.mockResolvedValue(null);
  });

  it('crea nueva fila y audita grupos históricos', async () => {
    const result = await useCase().execute({
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      usuario: {
        id: 7,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 10,
      },
    });

    expect(result.idempotente).toBe(false);
    expect(grupos.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          resultadoOperacion: 'RECREADO',
          gruposHistoricosIds: [8],
        }),
      }),
      undefined,
    );
    expect(auditoria.registrarCreacion).toHaveBeenCalledWith(
      expect.objectContaining({
        despues: expect.objectContaining({
          gruposHistoricosIds: [8],
          recreacion: true,
        }),
      }),
      undefined,
    );
  });

  it('resuelve unique_violation idéntica como idempotente', async () => {
    grupos.crear.mockRejectedValueOnce({ code: '23505' });
    grupos.buscarVigentePorFacturaDocumentoId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 22,
        documentoOperativoPrincipalId: 3,
        facturaDocumentoId: 200,
        estado: 'pendiente_revision',
      });

    const result = await useCase().execute({
      documentoOperativoPrincipalId: 3,
      facturaDocumentoId: 200,
      usuario: {
        id: 7,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 10,
      },
    });

    expect(result.idempotente).toBe(true);
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });
});
