import { DocumentoVisualMapper } from './documento-visual.mapper';
import { WorkspaceDocumentalV2ViewMapper } from './workspace-documental-v2-view.mapper';
import type { WorkspaceDocumentalV2View } from '../use-cases/workspace-documental-v2.types';

describe('WorkspaceDocumentalV2ViewMapper', () => {
  const mapper = new WorkspaceDocumentalV2ViewMapper(new DocumentoVisualMapper());

  it('agrega campos visuales sin eliminar campos existentes del workspace', () => {
    const workspace: WorkspaceDocumentalV2View = {
      origen: {
        modeloEntrada: 'V1',
        expedienteId: 41,
        modo: 'lectura',
        adaptador: 'V1V2CompatibilityAdapter',
        casoUso: 'WorkspaceDocumentalV2UseCase',
      },
      compatibilidad: {
        origen: { modelo: 'V1', expedienteId: 41, modo: 'lectura' },
        contenedorOperativo: {
          empresaCodigo: 'BBTI',
          clienteDestinoId: 2,
          tipoContexto: 'expediente_v1',
          codigo: '050201',
          nombre: 'PRODUCCION C X DISTRIBUIR',
          descripcion: 'PRODUCCION C X DISTRIBUIR',
          centroCostoCodigo: null,
          ordenProduccionCodigo: null,
          proyectoCodigo: null,
          estado: 'abierto',
          metadata: { fechaCreacion: '2026-07-09' },
          origen: { modelo: 'V1', expedienteId: 41, modo: 'lectura' },
        },
        documentosOperativosPrincipales: [],
        gruposFactura: [],
        adjuntosNoClasificados: [],
        advertencias: [],
      },
      contenedorOperativo: {
        estadoPersistencia: 'no_persistido',
        vista: {
          empresaCodigo: 'BBTI',
          clienteDestinoId: 2,
          tipoContexto: 'expediente_v1',
          codigo: '050201',
          nombre: 'PRODUCCION C X DISTRIBUIR',
          descripcion: 'PRODUCCION C X DISTRIBUIR',
          centroCostoCodigo: null,
          ordenProduccionCodigo: null,
          proyectoCodigo: null,
          estado: 'abierto',
          metadata: { fechaCreacion: '2026-07-09' },
          origen: { modelo: 'V1', expedienteId: 41, modo: 'lectura' },
        },
        persistido: null,
      },
      documentosOperativosPrincipales: [],
      gruposFactura: [],
      adjuntosNoClasificados: [],
      advertencias: [],
      resumen: {
        documentosOperativosPrincipales: 0,
        documentosOperativosPrincipalesPersistidos: 0,
        gruposFactura: 0,
        gruposFacturaPersistidos: 0,
        documentosGrupoFactura: 0,
        documentosGrupoFacturaPersistidos: 0,
        adjuntosNoClasificados: 0,
        advertencias: 0,
      },
    };

    const result = mapper.enriquecer(workspace);

    expect(result.contenedorOperativo.vista).toMatchObject({
      empresaCodigo: 'BBTI',
      codigo: '050201',
      tipoContextoLabel: 'Expediente V1',
      fechaCreacion: '2026-07-09',
    });
    expect(result.compatibilidad.contenedorOperativo.tipoContextoLabel).toBe('Expediente V1');
  });
});
