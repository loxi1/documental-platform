import type {
  ContenedorOperativoRow,
  DocumentoOperativoPrincipalRow,
  GrupoFacturaDocumentoRow,
  GrupoFacturaRow,
} from '../documental-v2.types';
import type {
  AdjuntosNoClasificadosCompatibilidadView,
  ContenedorOperativoCompatibilidadView,
  DocumentoOperativoPrincipalCompatibilidadView,
  ExpedienteV1ComoV2CompatibilidadView,
  GrupoFacturaCompatibilidadView,
  GrupoFacturaDocumentoCompatibilidadView,
} from '../adapters/v1-v2-compatibility.types';

export type WorkspaceDocumentalV2Origen = {
  modeloEntrada: 'V1';
  expedienteId: number;
  modo: 'lectura';
  adaptador: 'V1V2CompatibilityAdapter';
  casoUso: 'WorkspaceDocumentalV2UseCase';
};

export type EstadoPersistenciaV2 = 'persistido' | 'no_persistido';

export type EntidadWorkspaceV2<TVista, TPersistida> = {
  estadoPersistencia: EstadoPersistenciaV2;
  vista: TVista;
  persistido: TPersistida | null;
};

export type DocumentoOperativoPrincipalWorkspaceV2 = EntidadWorkspaceV2<
  DocumentoOperativoPrincipalCompatibilidadView,
  DocumentoOperativoPrincipalRow
>;

export type GrupoFacturaDocumentoWorkspaceV2 = EntidadWorkspaceV2<
  GrupoFacturaDocumentoCompatibilidadView,
  GrupoFacturaDocumentoRow
>;

export type GrupoFacturaWorkspaceV2 = EntidadWorkspaceV2<GrupoFacturaCompatibilidadView, GrupoFacturaRow> & {
  documentos: GrupoFacturaDocumentoWorkspaceV2[];
};

export type AdjuntosNoClasificadosWorkspaceV2 = EntidadWorkspaceV2<
  AdjuntosNoClasificadosCompatibilidadView,
  GrupoFacturaDocumentoRow
>;

export type WorkspaceDocumentalV2Resumen = {
  documentosOperativosPrincipales: number;
  documentosOperativosPrincipalesPersistidos: number;
  gruposFactura: number;
  gruposFacturaPersistidos: number;
  documentosGrupoFactura: number;
  documentosGrupoFacturaPersistidos: number;
  adjuntosNoClasificados: number;
  advertencias: number;
};

export type WorkspaceDocumentalV2View = {
  origen: WorkspaceDocumentalV2Origen;
  compatibilidad: ExpedienteV1ComoV2CompatibilidadView;
  contenedorOperativo: EntidadWorkspaceV2<
    ContenedorOperativoCompatibilidadView,
    ContenedorOperativoRow
  >;
  documentosOperativosPrincipales: DocumentoOperativoPrincipalWorkspaceV2[];
  gruposFactura: GrupoFacturaWorkspaceV2[];
  adjuntosNoClasificados: AdjuntosNoClasificadosWorkspaceV2[];
  advertencias: string[];
  resumen: WorkspaceDocumentalV2Resumen;
};
