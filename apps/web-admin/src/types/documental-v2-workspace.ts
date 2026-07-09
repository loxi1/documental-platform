export type WorkspaceV2Primitive = string | number | boolean | null | undefined;

export type WorkspaceV2Record = Record<string, unknown>;

export type WorkspaceV2ContextoOperativo = {
  id?: string | number | null;
  expedienteId?: string | number | null;
  expediente_id?: string | number | null;
  empresa?: string | null;
  empresaCodigo?: string | null;
  empresa_codigo?: string | null;
  codigo?: string | null;
  codigoExpediente?: string | null;
  codigo_expediente?: string | null;
  codigoCentroCosto?: string | null;
  codigo_centro_costo?: string | null;
  clienteDestino?: string | null;
  cliente_destino?: string | null;
  clienteDestinoNombre?: string | null;
  cliente_destino_nombre?: string | null;
  descripcion?: string | null;
  nombre?: string | null;
  estado?: string | null;
  [key: string]: unknown;
};

export type WorkspaceV2Documento = {
  id?: string | number | null;
  documentoId?: string | number | null;
  documento_id?: string | number | null;
  archivoId?: string | number | null;
  archivo_id?: string | number | null;
  tipo?: string | null;
  tipoDocumental?: string | null;
  tipo_documental?: string | null;
  tipoRelacion?: string | null;
  tipo_relacion?: string | null;
  esPrincipal?: boolean | null;
  es_principal?: boolean | null;
  serie?: string | null;
  numero?: string | null;
  claveDocumental?: string | null;
  clave_documental?: string | null;
  proveedor?: string | null;
  rucProveedor?: string | null;
  ruc_proveedor?: string | null;
  rucEmisor?: string | null;
  ruc_emisor?: string | null;
  razonSocialEmisor?: string | null;
  razon_social_emisor?: string | null;
  fecha?: string | null;
  fechaEmision?: string | null;
  fecha_emision?: string | null;
  estado?: string | null;
  moneda?: string | null;
  monto?: string | number | null;
  montoTotal?: string | number | null;
  monto_total?: string | number | null;
  nombreArchivo?: string | null;
  nombre_archivo?: string | null;
  metadata?: WorkspaceV2Record | string | null;
  adjuntos?: WorkspaceV2Documento[];
  documentos?: WorkspaceV2Documento[];
  [key: string]: unknown;
};

export type WorkspaceV2GrupoFactura = {
  id?: string | number | null;
  grupoFacturaId?: string | number | null;
  grupo_factura_id?: string | number | null;
  factura?: WorkspaceV2Documento | null;
  documentoFactura?: WorkspaceV2Documento | null;
  documento_factura?: WorkspaceV2Documento | null;
  documentos?: WorkspaceV2Documento[];
  adjuntos?: WorkspaceV2Documento[];
  estado?: string | null;
  proveedor?: string | null;
  fecha?: string | null;
  advertencias?: WorkspaceV2Advertencia[];
  [key: string]: unknown;
};

export type WorkspaceV2Alerta = {
  id?: string | number | null;
  tipo?: string | null;
  titulo?: string | null;
  mensaje?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  creadoEn?: string | null;
  creado_en?: string | null;
  [key: string]: unknown;
};

export type WorkspaceV2Advertencia = WorkspaceV2Alerta;

export type WorkspaceDocumentalV2 = {
  id?: string | number | null;
  expedienteId?: string | number | null;
  expediente_id?: string | number | null;
  contextoOperativo?: WorkspaceV2ContextoOperativo | null;
  contexto_operativo?: WorkspaceV2ContextoOperativo | null;
  contexto?: WorkspaceV2ContextoOperativo | null;
  documentoOperativoPrincipal?: WorkspaceV2Documento | null;
  documento_operativo_principal?: WorkspaceV2Documento | null;
  documentoPrincipal?: WorkspaceV2Documento | null;
  documento_principal?: WorkspaceV2Documento | null;
  gruposFactura?: WorkspaceV2GrupoFactura[];
  grupos_factura?: WorkspaceV2GrupoFactura[];
  gruposDeFactura?: WorkspaceV2GrupoFactura[];
  grupos_de_factura?: WorkspaceV2GrupoFactura[];
  adjuntosSinClasificar?: WorkspaceV2Documento[];
  adjuntos_sin_clasificar?: WorkspaceV2Documento[];
  documentosPendientesClasificacion?: WorkspaceV2Documento[];
  documentos_pendientes_clasificacion?: WorkspaceV2Documento[];
  documentosNoClasificados?: WorkspaceV2Documento[];
  documentos_no_clasificados?: WorkspaceV2Documento[];
  alertas?: WorkspaceV2Alerta[];
  advertencias?: WorkspaceV2Advertencia[];
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};
