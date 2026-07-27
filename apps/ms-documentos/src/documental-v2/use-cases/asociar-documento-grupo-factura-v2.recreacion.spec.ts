jest.mock('../contenedor-operativo.repository', () => ({}));
jest.mock('../documento-operativo-principal.repository', () => ({}));
jest.mock('../grupo-factura.repository', () => ({}));
jest.mock('../grupo-factura-documento.repository', () => ({}));
jest.mock('../documento-existente-readonly.repository', () => ({}));
jest.mock('../auditoria-operativa-v2.repository', () => ({}));

import { AsociarDocumentoGrupoFacturaV2UseCase } from './asociar-documento-grupo-factura-v2.usecase';

describe('AsociarDocumentoGrupoFacturaV2UseCase recreación', () => {
  const contenedores = { buscarPorId: jest.fn() };
  const principales = { buscarPorId: jest.fn() };
  const grupos = { buscarPorId: jest.fn() };
  const relaciones = {
    buscarActivoPorDocumentoId: jest.fn(),
    listarHistoricosPorDocumentoId: jest.fn(),
    crear: jest.fn(),
    actualizar: jest.fn(),
  };
  const documentos = { buscarPorId: jest.fn() };
  const auditoria = { registrarCreacion: jest.fn() };

  const useCase = () =>
    new AsociarDocumentoGrupoFacturaV2UseCase(
      contenedores as any,
      principales as any,
      grupos as any,
      relaciones as any,
      documentos as any,
      auditoria as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    grupos.buscarPorId.mockResolvedValue({
      id: 30,
      documentoOperativoPrincipalId: 20,
      facturaDocumentoId: 4,
      estado: 'pendiente_revision',
    });
    principales.buscarPorId.mockResolvedValue({
      id: 20,
      contenedorOperativoId: 10,
      documentoId: 3,
      estado: 'activo',
    });
    contenedores.buscarPorId.mockResolvedValue({
      id: 10,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      estado: 'activo',
    });
    documentos.buscarPorId.mockResolvedValue({
      id: 5,
      tipoDocumental: 'NOTA_INGRESO',
      clienteAbreviatura: 'BBTI',
      estado: 'confirmado',
      numero: 'NI-01',
    });
    relaciones.buscarActivoPorDocumentoId.mockResolvedValue(null);
    relaciones.listarHistoricosPorDocumentoId.mockResolvedValue([12]);
    relaciones.crear.mockResolvedValue({
      id: 40,
      grupoFacturaId: 30,
      documentoId: 5,
      tipoRelacion: 'adjunto_nota_ingreso',
      estado: 'activo',
      metadata: {},
    });
    relaciones.actualizar.mockResolvedValue(null);
  });

  it('crea nueva fila y audita vínculos históricos', async () => {
    const result = await useCase().execute({
      grupoFacturaId: 30,
      documentoId: 5,
      tipoRelacion: 'adjunto_nota_ingreso',
      usuario: {
        id: 7,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
    });

    expect(result.idempotente).toBe(false);
    expect(relaciones.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          resultadoOperacion: 'RECREADO',
          documentosHistoricosIds: [12],
        }),
      }),
    );
    expect(auditoria.registrarCreacion).toHaveBeenCalledWith(
      expect.objectContaining({
        despues: expect.objectContaining({
          documentosHistoricosIds: [12],
          recreacion: true,
        }),
      }),
    );
  });

  it('resuelve unique_violation idéntica como idempotente', async () => {
    relaciones.crear.mockRejectedValueOnce({ code: '23505' });
    relaciones.buscarActivoPorDocumentoId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 41,
        grupoFacturaId: 30,
        documentoId: 5,
        tipoRelacion: 'adjunto_nota_ingreso',
        estado: 'activo',
      });

    const result = await useCase().execute({
      grupoFacturaId: 30,
      documentoId: 5,
      tipoRelacion: 'adjunto_nota_ingreso',
      usuario: {
        id: 7,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
    });

    expect(result.idempotente).toBe(true);
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });
});
