export type JsonObject = Record<string, unknown>;

export type EstadoDocumentalV2 = 'activo' | 'anulado' | 'pendiente_revision' | string;

export type ContenedorOperativoRow = {
  id: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  tipoContexto: string;
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  centroCostoCodigo: string | null;
  ordenProduccionCodigo: string | null;
  proyectoCodigo: string | null;
  estado: string;
  metadata: JsonObject;
  creadoPor: number | null;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
  anuladoPor: number | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
};

export type CrearContenedorOperativoInput = {
  empresaCodigo: string;
  clienteDestinoId?: number | null;
  tipoContexto: string;
  codigo: string;
  nombre?: string | null;
  descripcion?: string | null;
  centroCostoCodigo?: string | null;
  ordenProduccionCodigo?: string | null;
  proyectoCodigo?: string | null;
  estado?: string;
  metadata?: JsonObject;
  creadoPor?: number | null;
};

export type ActualizarContenedorOperativoInput = {
  id: number;
  nombre?: string | null;
  descripcion?: string | null;
  centroCostoCodigo?: string | null;
  ordenProduccionCodigo?: string | null;
  proyectoCodigo?: string | null;
  estado?: string;
  metadata?: JsonObject;
  actualizadoPor?: number | null;
};

export type BuscarContenedoresOperativosFiltro = {
  empresaCodigo?: string | null;
  clienteDestinoId?: number | null;
  tipoContexto?: string | null;
  estado?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
};

export type DocumentoOperativoPrincipalRow = {
  id: number;
  contenedorOperativoId: number;
  documentoId: number;
  tipoPrincipal: string;
  esPrincipalActivo: boolean;
  estado: string;
  metadata: JsonObject;
  creadoPor: number | null;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
  anuladoPor: number | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
};

export type CrearDocumentoOperativoPrincipalInput = {
  contenedorOperativoId: number;
  documentoId: number;
  tipoPrincipal: string;
  esPrincipalActivo?: boolean;
  estado?: string;
  metadata?: JsonObject;
  creadoPor?: number | null;
};

export type ActualizarDocumentoOperativoPrincipalInput = {
  id: number;
  tipoPrincipal?: string;
  esPrincipalActivo?: boolean;
  estado?: string;
  metadata?: JsonObject;
  actualizadoPor?: number | null;
};

export type GrupoFacturaRow = {
  id: number;
  documentoOperativoPrincipalId: number;
  facturaDocumentoId: number;
  estado: string;
  metadata: JsonObject;
  creadoPor: number | null;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
  anuladoPor: number | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
};

export type CrearGrupoFacturaInput = {
  documentoOperativoPrincipalId: number;
  facturaDocumentoId: number;
  estado?: string;
  metadata?: JsonObject;
  creadoPor?: number | null;
};

export type ActualizarGrupoFacturaInput = {
  id: number;
  estado?: string;
  metadata?: JsonObject;
  actualizadoPor?: number | null;
};

export type GrupoFacturaDocumentoRow = {
  id: number;
  grupoFacturaId: number;
  documentoId: number;
  tipoRelacion: string;
  estado: string;
  metadata: JsonObject;
  creadoPor: number | null;
  creadoEn: Date;
  actualizadoPor: number | null;
  actualizadoEn: Date | null;
  anuladoPor: number | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
};

export type CrearGrupoFacturaDocumentoInput = {
  grupoFacturaId: number;
  documentoId: number;
  tipoRelacion: string;
  estado?: string;
  metadata?: JsonObject;
  creadoPor?: number | null;
};

export type ActualizarGrupoFacturaDocumentoInput = {
  id: number;
  tipoRelacion?: string;
  estado?: string;
  metadata?: JsonObject;
  actualizadoPor?: number | null;
};
