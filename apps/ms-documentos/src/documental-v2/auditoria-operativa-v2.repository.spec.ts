import { sql } from '@documental/database';
import { AuditoriaOperativaV2Repository } from './auditoria-operativa-v2.repository';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('AuditoriaOperativaV2Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra una creación real en core.auditoria_eventos', async () => {
    const repository = new AuditoriaOperativaV2Repository();

    await repository.registrarCreacion({
      accion: 'GRUPO_FACTURA_CREADO',
      entidad: 'grupo_factura',
      entidadId: 2,
      descripcion: 'Grupo de Factura creado desde operación V2.',
      empresaCodigo: 'BBTI',
      usuario: {
        id: 1,
        email: 'admin@documental.local',
        workspaceId: 1,
        requestId: '11111111-1111-1111-1111-111111111111',
        correlationId: '22222222-2222-2222-2222-222222222222',
        origen: 'api-gateway',
        sistemaCodigo: 'DOCUMENTAL',
        perfilCodigo: 'admin',
      },
      despues: {
        grupoFacturaId: 2,
        facturaDocumentoId: 910002,
      },
    });

    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('registra una anulación usando el ejecutor transaccional recibido', async () => {
    const executor = jest.fn().mockResolvedValue([]);
    const repository = new AuditoriaOperativaV2Repository();

    await repository.registrarAnulacionConEjecutor(executor, {
      accion: 'ANULAR_CONTENEDOR_OPERATIVO',
      entidad: 'contenedor_operativo',
      entidadId: 4,
      descripcion: 'Contenedor Operativo anulado desde operación V2.',
      empresaCodigo: 'BBTI',
      usuario: {
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
      },
      antes: {
        id: 4,
        estado: 'activo',
      },
      despues: {
        id: 4,
        estado: 'anulado',
        contenedorOperativoId: 4,
      },
    });

    expect(executor).toHaveBeenCalledTimes(1);

    const values = executor.mock.calls[0].slice(1);

    expect(values).toContain('ANULAR_CONTENEDOR_OPERATIVO');
    expect(values).toContain('contenedor_operativo');
    expect(values).toContain('4');
    expect(values).toContain('BBTI');

    const jsonValues = values
      .filter((value) => typeof value === 'string')
      .map((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    expect(jsonValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 4,
          estado: 'activo',
        }),
        expect.objectContaining({
          id: 4,
          estado: 'anulado',
          contenedorOperativoId: 4,
          resultadoOperacion: 'ANULADO',
        }),
      ]),
    );
  });

});
