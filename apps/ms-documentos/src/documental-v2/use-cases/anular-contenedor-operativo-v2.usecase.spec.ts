jest.mock('@documental/database', () => ({
  sql: {
    begin: jest.fn(),
  },
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { sql } from '@documental/database';

import { AnularContenedorOperativoV2UseCase } from './anular-contenedor-operativo-v2.usecase';

describe('AnularContenedorOperativoV2UseCase', () => {
  const auditoria = {
    registrarAnulacionConEjecutor: jest.fn(),
  };

  const sqlBeginMock = sql.begin as unknown as jest.Mock;

  const contexto = {
    id: 1,
    email: 'admin@documental.local',
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    sessionContextId: 'bc8faa7a-ff31-4fd9-9014-86c92db3c3fa',
    sistemaCodigo: 'DOCUMENTAL',
    perfilCodigo: 'admin',
    requestId: 'b2ea3424-91c9-45d3-b12c-1f0fac78e6c6',
    correlationId: 'b2ea3424-91c9-45d3-b12c-1f0fac78e6c6',
    origen: 'api-gateway',
  };

  const contenedorActivo = {
    id: 4,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    tipoContexto: 'expediente_v1',
    codigo: '050106',
    nombre: 'ALMACEN Y LOGISTICA',
    descripcion: 'ALMACEN Y LOGISTICA',
    centroCostoCodigo: null,
    ordenProduccionCodigo: null,
    proyectoCodigo: null,
    estado: 'activo',
    metadata: {
      expedienteId: 17,
      sprint: '2.1B',
    },
    creadoPor: 1,
    creadoEn: new Date('2026-07-16T00:00:00.000Z'),
    actualizadoPor: null,
    actualizadoEn: null,
    anuladoPor: null,
    anuladoEn: null,
    motivoAnulacion: null,
  };

  const motivo =
    'ARTEFACTO HISTÓRICO CONTROLADO DEL SPRINT 2.1B. ' +
    'NO REPRESENTA EL CONTEXTO OPERATIVO VIGENTE DEL EXPEDIENTE 17.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function configurarTransaccion(respuestas: unknown[][]): jest.Mock {
    const tx = jest.fn();

    for (const respuesta of respuestas) {
      tx.mockResolvedValueOnce(respuesta);
    }

    sqlBeginMock.mockImplementationOnce(
      async (callback: (executor: unknown) => unknown) => callback(tx),
    );

    return tx;
  }

  it('anula un Contenedor activo sin dependencias y registra auditoría', async () => {
    const actualizado = {
      ...contenedorActivo,
      estado: 'anulado',
      actualizadoPor: 1,
      actualizadoEn: new Date('2026-07-26T20:00:00.000Z'),
      anuladoPor: 1,
      anuladoEn: new Date('2026-07-26T20:00:00.000Z'),
      motivoAnulacion: motivo,
    };

    const tx = configurarTransaccion([
      [contenedorActivo],
      [
        {
          tienePrincipales: false,
          tieneGrupos: false,
          tieneDocumentosGrupo: false,
        },
      ],
      [actualizado],
    ]);

    auditoria.registrarAnulacionConEjecutor.mockResolvedValue(undefined);

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    const result = await useCase.execute({
      contenedorOperativoId: 4,
      motivo,
      usuario: contexto,
    });

    expect(sqlBeginMock).toHaveBeenCalledTimes(1);
    expect(tx).toHaveBeenCalledTimes(3);

    expect(result).toEqual({
      contenedorOperativo: actualizado,
      idempotente: false,
      workspaceDebeRefrescar: true,
    });

    expect(auditoria.registrarAnulacionConEjecutor).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        accion: 'ANULAR_CONTENEDOR_OPERATIVO',
        entidad: 'contenedor_operativo',
        entidadId: 4,
        empresaCodigo: 'BBTI',
        usuario: contexto,
        antes: expect.objectContaining({
          id: 4,
          codigo: '050106',
          estado: 'activo',
        }),
        despues: expect.objectContaining({
          id: 4,
          codigo: '050106',
          estado: 'anulado',
          motivoAnulacion: motivo,
          contenedorOperativoId: 4,
        }),
      }),
    );
  });

  it('devuelve idempotente sin actualizar ni duplicar auditoría', async () => {
    const anulado = {
      ...contenedorActivo,
      estado: 'anulado',
      motivoAnulacion: 'Motivo original',
      anuladoPor: 1,
      anuladoEn: new Date('2026-07-25T20:00:00.000Z'),
    };

    const tx = configurarTransaccion([[anulado]]);

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    const result = await useCase.execute({
      contenedorOperativoId: 4,
      motivo: 'Motivo distinto que no debe reemplazarse',
      usuario: contexto,
    });

    expect(tx).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarAnulacionConEjecutor).not.toHaveBeenCalled();

    expect(result).toEqual({
      contenedorOperativo: anulado,
      idempotente: true,
      workspaceDebeRefrescar: false,
    });

    expect(result.contenedorOperativo.motivoAnulacion).toBe('Motivo original');
  });

  it('rechaza un Contenedor con dependencias activas', async () => {
    const tx = configurarTransaccion([
      [contenedorActivo],
      [
        {
          tienePrincipales: true,
          tieneGrupos: false,
          tieneDocumentosGrupo: false,
        },
      ],
    ]);

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    await expect(
      useCase.execute({
        contenedorOperativoId: 4,
        motivo,
        usuario: contexto,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx).toHaveBeenCalledTimes(2);
    expect(auditoria.registrarAnulacionConEjecutor).not.toHaveBeenCalled();
  });

  it('rechaza el acceso desde otra empresa', async () => {
    configurarTransaccion([[contenedorActivo]]);

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    await expect(
      useCase.execute({
        contenedorOperativoId: 4,
        motivo,
        usuario: {
          ...contexto,
          empresaCodigo: 'CIMA',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(auditoria.registrarAnulacionConEjecutor).not.toHaveBeenCalled();
  });

  it('rechaza contexto autenticado incompleto antes de iniciar transacción', async () => {
    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    await expect(
      useCase.execute({
        contenedorOperativoId: 4,
        motivo,
        usuario: {
          id: 1,
          empresaCodigo: 'BBTI',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(sqlBeginMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando el Contenedor no existe', async () => {
    configurarTransaccion([[]]);

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    await expect(
      useCase.execute({
        contenedorOperativoId: 999,
        motivo,
        usuario: contexto,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(auditoria.registrarAnulacionConEjecutor).not.toHaveBeenCalled();
  });

  it('propaga el fallo de auditoría para que la transacción haga rollback', async () => {
    const actualizado = {
      ...contenedorActivo,
      estado: 'anulado',
      motivoAnulacion: motivo,
    };

    configurarTransaccion([
      [contenedorActivo],
      [
        {
          tienePrincipales: false,
          tieneGrupos: false,
          tieneDocumentosGrupo: false,
        },
      ],
      [actualizado],
    ]);

    auditoria.registrarAnulacionConEjecutor.mockRejectedValue(
      new Error('FALLO_AUDITORIA_CONTROLADO'),
    );

    const useCase = new AnularContenedorOperativoV2UseCase(auditoria as any);

    await expect(
      useCase.execute({
        contenedorOperativoId: 4,
        motivo,
        usuario: contexto,
      }),
    ).rejects.toThrow('FALLO_AUDITORIA_CONTROLADO');
  });
});
