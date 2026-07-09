import type { JsonObject } from '../documental-v2.types';

export type V1ExpedienteBaseRow = {
  id: number;
  empresaCodigo: string;
  codigoExpediente: string;
  descripcion: string | null;
  clienteDestinoId: number | null;
  estado: string;
  metadata: JsonObject;
  creadoEn: Date | string | null;
  actualizadoEn: Date | string | null;
};

export type V1DocumentoExpedienteRow = {
  expedienteId: number;
  documentoId: number;
  tipoRelacion: string | null;
  esPrincipal: boolean;
  orden: number | null;
  clienteAbreviatura: string | null;
  tipoDocumental: string | null;
  rucEmisor: string | null;
  razonSocialEmisor: string | null;
  serie: string | null;
  numero: string | null;
  claveDocumental: string | null;
  estado: string | null;
  fechaEmision: Date | string | null;
  moneda: string | null;
  montoTotal: string | number | null;
  metadata: JsonObject;
  archivoId: number | null;
  nombreArchivo: string | null;
  storageProvider: string | null;
  storageBucket: string | null;
  storageKey: string | null;
  archivoEstado: string | null;
  areaOrigen: string | null;
};

export type V1ExpedienteConDocumentos = {
  expediente: V1ExpedienteBaseRow;
  documentos: V1DocumentoExpedienteRow[];
};

export type CompatibilidadV2Origen = {
  modelo: 'V1';
  expedienteId: number;
  modo: 'lectura';
};

export type ContenedorOperativoCompatibilidadView = {
  empresaCodigo: string;
  clienteDestinoId: number | null;
  tipoContexto: 'expediente_v1';
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  centroCostoCodigo: string | null;
  ordenProduccionCodigo: string | null;
  proyectoCodigo: string | null;
  estado: string;
  clienteDestinoNombre?: string | null;
  tipoContextoLabel?: string | null;
  periodoRevision?: string | null;
  fechaCreacion?: string | null;
  metadata: JsonObject;
  origen: CompatibilidadV2Origen;
};

export type DocumentoOperativoPrincipalCompatibilidadView = {
  documentoId: number;
  tipoPrincipal: string;
  esPrincipalActivo: boolean;
  estado: string;
  numeroDocumento?: string | null;
  titulo?: string | null;
  proveedorNombre?: string | null;
  proveedorRuc?: string | null;
  fechaEmision?: string | null;
  montoTotal?: number | null;
  moneda?: string | null;
  nombreArchivo?: string | null;
  tipoDocumentalLabel?: string | null;
  metadata: JsonObject;
  origen: CompatibilidadV2Origen & {
    tipoRelacionV1: string | null;
    esPrincipalV1: boolean;
  };
};

export type GrupoFacturaDocumentoCompatibilidadView = {
  documentoId: number;
  tipoRelacion: string;
  estado: string;
  tipoDocumental?: string | null;
  tipoDocumentalLabel?: string | null;
  serie?: string | null;
  numero?: string | null;
  documentoLabel?: string | null;
  fechaEmision?: string | null;
  nombreArchivo?: string | null;
  metadata: JsonObject;
  origen: CompatibilidadV2Origen & {
    tipoDocumentalV1: string | null;
    tipoRelacionV1: string | null;
  };
};

export type GrupoFacturaCompatibilidadView = {
  facturaDocumentoId: number;
  documentoOperativoPrincipalDocumentoId: number | null;
  estado: 'pendiente_revision';
  facturaSerie?: string | null;
  facturaNumero?: string | null;
  facturaLabel?: string | null;
  proveedorNombre?: string | null;
  proveedorRuc?: string | null;
  fechaEmision?: string | null;
  importeTotal?: number | null;
  moneda?: string | null;
  estadoRevisionLabel?: string | null;
  metadata: JsonObject;
  documentos: GrupoFacturaDocumentoCompatibilidadView[];
  origen: CompatibilidadV2Origen & {
    tipoDocumentalV1: string | null;
    tipoRelacionV1: string | null;
  };
};

export type AdjuntosNoClasificadosCompatibilidadView = {
  documentoId: number;
  tipoRelacionSugerida: string;
  motivo: 'SIN_FACTURA' | 'MULTIPLES_FACTURAS' | 'DOCUMENTO_PRINCIPAL';
  tipoDocumental?: string | null;
  tipoDocumentalLabel?: string | null;
  serie?: string | null;
  numero?: string | null;
  documentoLabel?: string | null;
  fechaEmision?: string | null;
  estado?: string | null;
  nombreArchivo?: string | null;
  metadata: JsonObject;
  origen: CompatibilidadV2Origen & {
    tipoDocumentalV1: string | null;
    tipoRelacionV1: string | null;
  };
};

export type ExpedienteV1ComoV2CompatibilidadView = {
  origen: CompatibilidadV2Origen;
  contenedorOperativo: ContenedorOperativoCompatibilidadView;
  documentosOperativosPrincipales: DocumentoOperativoPrincipalCompatibilidadView[];
  gruposFactura: GrupoFacturaCompatibilidadView[];
  adjuntosNoClasificados: AdjuntosNoClasificadosCompatibilidadView[];
  advertencias: string[];
};
