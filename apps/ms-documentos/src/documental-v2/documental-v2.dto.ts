import type {
  ActualizarContenedorOperativoInput,
  ActualizarDocumentoOperativoPrincipalInput,
  ActualizarGrupoFacturaDocumentoInput,
  ActualizarGrupoFacturaInput,
  BuscarContenedoresOperativosFiltro,
  CrearContenedorOperativoInput,
  CrearDocumentoOperativoPrincipalInput,
  CrearGrupoFacturaDocumentoInput,
  CrearGrupoFacturaInput,
} from './documental-v2.types';


export type CrearContenedorOperativoDto = CrearContenedorOperativoInput;
export type ActualizarContenedorOperativoDto = Omit<ActualizarContenedorOperativoInput, 'id'>;
export type BuscarContenedoresOperativosDto = BuscarContenedoresOperativosFiltro;

export type CrearDocumentoOperativoPrincipalDto = CrearDocumentoOperativoPrincipalInput;
export type ActualizarDocumentoOperativoPrincipalDto = Omit<ActualizarDocumentoOperativoPrincipalInput, 'id'>;

export type CrearGrupoFacturaDto = CrearGrupoFacturaInput;
export type ActualizarGrupoFacturaDto = Omit<ActualizarGrupoFacturaInput, 'id'>;

export type CrearGrupoFacturaDocumentoDto = CrearGrupoFacturaDocumentoInput;
export type ActualizarGrupoFacturaDocumentoDto = Omit<ActualizarGrupoFacturaDocumentoInput, 'id'>;

export type AnularDocumentalV2Dto = {
  usuarioId?: number | null;
  motivo?: string | null;
};

export type AsociarDocumentoPrincipalV2Dto = {
  contenedorOperativoId: number;
  documentoId: number;
  tipoPrincipal: string;
};

export type BuscarDocumentosCandidatosPrincipalDto = {
  empresaCodigo: string;
  tipoPrincipal: string;
  q?: string;
  estado?: string;
  limit?: number | string;
};
