jest.mock('../contenedor-operativo.repository', () => ({}));
jest.mock('../documento-operativo-principal.repository', () => ({}));
jest.mock('../documento-existente-readonly.repository', () => ({}));
jest.mock('../auditoria-operativa-v2.repository', () => ({}));

import { AsociarDocumentoPrincipalV2UseCase } from './asociar-documento-principal-v2.usecase';

describe('AsociarDocumentoPrincipalV2UseCase recreación', () => {
  const contenedores = { buscarPorId: jest.fn() };
  const principales = {
    buscarActivoPorDocumentoId: jest.fn(),
    listarHistoricosPorDocumentoId: jest.fn(),
    crear: jest.fn(),
  };
  const documentos = { buscarPorId: jest.fn() };
  const auditoria = { registrarCreacion: jest.fn() };

  const useCase = () =>
    new AsociarDocumentoPrincipalV2UseCase(
      contenedores as any,
      principales as any,
      documentos as any,
      auditoria as any,
    );

  const contenedor = {
    id: 10,
    empresaCodigo: 'BBTI',
    tipoContexto: 'expediente_v1',
    codigo: '050201',
    estado: 'activo',
  };

  const documento = {
    id: 3,
    tipoDocumental: 'OC',
    numero: '007950',
    razonSocialEmisor: 'Proveedor',
    rucEmisor: '20123456789',
    fechaEmision: '2026-07-01',
    montoTotal: 100,
    moneda: 'PEN',
    nombreArchivo: 'oc.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    contenedores.buscarPorId.mockResolvedValue(contenedor);
    documentos.buscarPorId.mockResolvedValue(documento);
    principales.buscarActivoPorDocumentoId.mockResolvedValue(null);
    principales.listarHistoricosPorDocumentoId.mockResolvedValue([4]);
    principales.crear.mockResolvedValue({
      id: 20,
      contenedorOperativoId: 10,
      documentoId: 3,
      tipoPrincipal: 'OC',
      esPrincipalActivo: true,
      estado: 'activo',
    });
  });

  it('crea una nueva fila y audita históricos', async () => {
    const result = await useCase().execute({
      contenedorOperativoId: 10,
      documentoId: 3,
      tipoPrincipal: 'OC',
      usuario: { id: 7, empresaCodigo: 'BBTI' },
    });

    expect(result.idempotente).toBe(false);
    expect(principales.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          resultadoOperacion: 'RECREADO',
          principalesHistoricosIds: [4],
        }),
      }),
    );
    expect(auditoria.registrarCreacion).toHaveBeenCalledWith(
      expect.objectContaining({
        despues: expect.objectContaining({
          principalesHistoricosIds: [4],
          recreacion: true,
        }),
      }),
    );
  });

  it('resuelve unique_violation idéntica como idempotente', async () => {
    principales.crear.mockRejectedValueOnce({ code: '23505' });
    principales.buscarActivoPorDocumentoId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 21,
        contenedorOperativoId: 10,
        documentoId: 3,
        tipoPrincipal: 'OC',
        esPrincipalActivo: true,
        estado: 'activo',
      });

    const result = await useCase().execute({
      contenedorOperativoId: 10,
      documentoId: 3,
      tipoPrincipal: 'OC',
      usuario: { id: 7, empresaCodigo: 'BBTI' },
    });

    expect(result.idempotente).toBe(true);
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
  });
});
