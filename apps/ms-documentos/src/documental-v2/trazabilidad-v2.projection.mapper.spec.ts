import { TrazabilidadV2ProjectionMapper } from './trazabilidad-v2.projection.mapper';

import type { TrazabilidadAuditoriaRowV2 } from './trazabilidad-v2.repository';

describe('TrazabilidadV2ProjectionMapper', () => {
  it('normaliza auditoría operativa sin exponer JSONB crudo y ordena por fecha DESC', () => {
    const mapper = new TrazabilidadV2ProjectionMapper();

    const rows: TrazabilidadAuditoriaRowV2[] = [
      {
        id: 346,
        workspaceId: 1,
        requestId: 'req-1',
        usuarioId: 1,
        empresaCodigo: 'BBTI',
        modulo: 'documental-v2',
        entidad: 'documento_operativo_principal',
        entidadId: '4',
        accion: 'ASOCIAR_DOCUMENTO_PRINCIPAL',
        descripcion: 'Documento Operativo Principal asociado desde operación V2.',
        despues: {
          usuarioEmail: 'admin@documental.local',
          correlationId: 'corr-1',
          resultadoOperacion: 'CREADO',
          origen: 'api-gateway',
          contenedorOperativoId: 2,
        },
        creadoEn: '2026-07-14T20:56:06.807Z',
      },
      {
        id: 348,
        workspaceId: 1,
        requestId: 'req-3',
        usuarioId: 1,
        empresaCodigo: 'BBTI',
        modulo: 'documental-v2',
        entidad: 'grupo_factura_documento',
        entidadId: '5',
        accion: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
        descripcion: 'Documento asociado al Grupo de Factura desde operación V2.',
        despues: {
          usuarioEmail: 'admin@documental.local',
          correlationId: 'corr-3',
          resultadoOperacion: 'CREADO',
          origen: 'api-gateway',
          contenedorOperativoId: 2,
        },
        creadoEn: '2026-07-14T21:23:43.735Z',
      },
    ];

    const response = mapper.construirRespuesta({
      contenedorOperativoId: 2,
      auditoriaRows: rows,
      documentoEventosOperativoDisponible: false,
    });

    expect(response.version).toBe(1);
    expect(response.contenedorOperativoId).toBe(2);
    expect(response.items).toHaveLength(2);
    expect(response.items[0].id).toBe('auditoria:348');
    expect(response.items[0].categoria).toBe('AUDITORIA');
    expect(response.items[0].tipo).toBe('DOCUMENTO_GRUPO_FACTURA_ASOCIADO');
    expect(response.items[0].resultado).toBe('CREADO');
    expect(response.items[0].origen).toBe('api-gateway');
    expect(response.items[0]).not.toHaveProperty('despues');
    expect(response.items[0]).not.toHaveProperty('metadata');
    expect(response.cobertura).toEqual({
      auditoria: true,
      documentoEventos: false,
      parcial: true,
    });
    expect(response.advertencias).toEqual([
      'TRAZABILIDAD_PARCIAL',
      'SIN_EVENTOS_DOCUMENTALES',
    ]);
  });

  it('devuelve advertencia normalizada cuando no hay trazabilidad operativa', () => {
    const mapper = new TrazabilidadV2ProjectionMapper();

    const response = mapper.construirRespuesta({
      contenedorOperativoId: 99,
      auditoriaRows: [],
      documentoEventosOperativoDisponible: false,
    });

    expect(response.items).toEqual([]);
    expect(response.cobertura).toEqual({
      auditoria: false,
      documentoEventos: false,
      parcial: true,
    });
    expect(response.advertencias).toEqual([
      'TRAZABILIDAD_PARCIAL',
      'SIN_EVENTOS_DOCUMENTALES',
      'SIN_TRAZABILIDAD_OPERATIVA',
    ]);
  });
});
