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
});
