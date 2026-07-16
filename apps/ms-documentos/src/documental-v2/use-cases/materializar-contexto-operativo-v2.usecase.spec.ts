jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { MaterializarContextoOperativoV2UseCase } from './materializar-contexto-operativo-v2.usecase';

describe('MaterializarContextoOperativoV2UseCase', () => {
  const expedienteBase = {
    id: 16,
    empresaCodigo: 'BBTI',
    codigoExpediente: '0501',
    descripcion: 'COSTOS DE PRODUCCION',
    clienteDestinoId: 2,
    estado: 'abierto',
    metadata: {},
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };

  const contenedorBase = {
    id: 10,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    tipoContexto: 'expediente_v1',
    codigo: '0501',
    nombre: 'COSTOS DE PRODUCCION',
    descripcion: 'COSTOS DE PRODUCCION',
    centroCostoCodigo: null,
    ordenProduccionCodigo: null,
    proyectoCodigo: null,
    estado: 'activo',
    metadata: {},
    creadoPor: 1,
    creadoEn: new Date(),
    actualizadoPor: null,
    actualizadoEn: null,
    anuladoPor: null,
    anuladoEn: null,
    motivoAnulacion: null,
  };

  const usuario = {
    id: 1,
    email: 'admin@documental.local',
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    requestId: 'req-1',
    correlationId: 'req-1',
    origen: 'api-gateway',
  };

  function buildUseCase() {
    const expedientesV1 = {
      obtenerExpedienteConDocumentos: jest.fn(),
    };

    const contenedores = {
      buscarPorClave: jest.fn(),
      crearSiNoExistePorClave: jest.fn(),
    };

    const auditoria = {
      registrarCreacion: jest.fn(),
    };

    const useCase = new MaterializarContextoOperativoV2UseCase(
      expedientesV1 as any,
      contenedores as any,
      auditoria as any,
    );

    return { useCase, expedientesV1, contenedores, auditoria };
  }

  it('materializa contexto operativo cuando no existe', async () => {
    const { useCase, expedientesV1, contenedores, auditoria } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente: expedienteBase,
      documentos: [],
    });
    contenedores.buscarPorClave.mockResolvedValueOnce(null);
    contenedores.crearSiNoExistePorClave.mockResolvedValueOnce(contenedorBase);

    const result = await useCase.execute({ expedienteId: 16, usuario });

    expect(contenedores.buscarPorClave).toHaveBeenCalledWith({
      empresaCodigo: 'BBTI',
      tipoContexto: 'expediente_v1',
      codigo: '0501',
    });
    expect(contenedores.crearSiNoExistePorClave).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        tipoContexto: 'expediente_v1',
        codigo: '0501',
        estado: 'activo',
      }),
    );
    expect(auditoria.registrarCreacion).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      expedienteId: 16,
      contenedorOperativo: {
        id: 10,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        tipoContexto: 'expediente_v1',
        codigo: '0501',
        estado: 'activo',
      },
      idempotente: false,
      workspaceDebeRefrescar: true,
    });
  });

  it('devuelve idempotente true si el contexto ya existe activo', async () => {
    const { useCase, expedientesV1, contenedores, auditoria } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente: expedienteBase,
      documentos: [],
    });
    contenedores.buscarPorClave.mockResolvedValueOnce(contenedorBase);

    const result = await useCase.execute({ expedienteId: 16, usuario });

    expect(contenedores.crearSiNoExistePorClave).not.toHaveBeenCalled();
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
    expect(result.idempotente).toBe(true);
    expect(result.workspaceDebeRefrescar).toBe(true);
  });

  it('recupera el contexto existente cuando el insert no retorna fila por conflicto concurrente', async () => {
    const { useCase, expedientesV1, contenedores, auditoria } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente: expedienteBase,
      documentos: [],
    });
    contenedores.buscarPorClave.mockResolvedValueOnce(null).mockResolvedValueOnce(contenedorBase);
    contenedores.crearSiNoExistePorClave.mockResolvedValueOnce(null);

    const result = await useCase.execute({ expedienteId: 16, usuario });

    expect(contenedores.buscarPorClave).toHaveBeenCalledTimes(2);
    expect(auditoria.registrarCreacion).not.toHaveBeenCalled();
    expect(result.idempotente).toBe(true);
    expect(result.workspaceDebeRefrescar).toBe(true);
  });

  it('rechaza si el expediente no existe', async () => {
    const { useCase, expedientesV1 } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue(null);

    await expect(useCase.execute({ expedienteId: 999, usuario })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rechaza si el expediente pertenece a otra empresa', async () => {
    const { useCase, expedientesV1 } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente: { ...expedienteBase, empresaCodigo: 'CIMA' },
      documentos: [],
    });

    await expect(useCase.execute({ expedienteId: 16, usuario })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza si el contenedor existente no está activo', async () => {
    const { useCase, expedientesV1, contenedores } = buildUseCase();

    expedientesV1.obtenerExpedienteConDocumentos.mockResolvedValue({
      expediente: expedienteBase,
      documentos: [],
    });
    contenedores.buscarPorClave.mockResolvedValueOnce({ ...contenedorBase, estado: 'anulado' });

    await expect(useCase.execute({ expedienteId: 16, usuario })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
