export type EstadoComparacionCampo =
  | 'COINCIDE'
  | 'NO_COINCIDE'
  | 'NO_VERIFICABLE';

export type EstadoCorrespondenciaPagoFactura =
  | 'SIN_SUSTENTO'
  | 'PENDIENTE'
  | 'NO_VERIFICABLE'
  | 'OBSERVADA'
  | 'VALIDADA'
  | 'INCOMPATIBLE'
  | 'EXCEPCION_AUTORIZADA';

export type AccionDecisionCorrespondencia =
  | 'ACEPTAR'
  | 'OBSERVAR'
  | 'AUTORIZAR_EXCEPCION';

export type ValorComparable = string | number | null;

export type ComparacionCampo = {
  estado: EstadoComparacionCampo;
  factura: ValorComparable;
  pago: ValorComparable;
};

export type DatosFacturaCorrespondencia = {
  documentoId: number;
  proveedorRuc?: string | null;
  proveedorNombre?: string | null;
  moneda?: string | null;
  importe?: number | null;
  documento?: string | null;
};

export type DatosPagoCorrespondencia = {
  documentoId: number;
  proveedorRuc?: string | null;
  proveedorNombre?: string | null;
  moneda?: string | null;
  importe?: number | null;
  documentoReferenciado?: string | null;
};

export type EvaluacionCorrespondenciaPagoFactura = {
  estado: EstadoCorrespondenciaPagoFactura;
  facturaDocumentoId: number;
  pagoDocumentoId: number | null;
  comparaciones: {
    proveedor: ComparacionCampo;
    moneda: ComparacionCampo;
    importe: ComparacionCampo;
    documentoReferenciado: ComparacionCampo;
  };
  requiereDecisionHumana: boolean;
  permiteAsociacionOrdinaria: boolean;
  advertencias: string[];
};

export type DecisionCorrespondenciaInput = {
  accion: AccionDecisionCorrespondencia;
  motivo?: string | null;
  usuarioId: number;
  usuarioAutorizadoExcepcion?: boolean;
  fecha?: string;
};

export type DecisionCorrespondenciaResult = EvaluacionCorrespondenciaPagoFactura & {
  decision: {
    accion: AccionDecisionCorrespondencia;
    motivo: string | null;
    usuarioId: number;
    fecha: string;
  };
};

export type AuditoriaDecisionCorrespondencia = {
  facturaDocumentoId: number;
  pagoDocumentoId: number | null;
  estadoAnterior: EstadoCorrespondenciaPagoFactura;
  estadoResultante: EstadoCorrespondenciaPagoFactura;
  accion: AccionDecisionCorrespondencia;
  motivo: string | null;
  usuarioId: number;
  fecha: string;
  comparaciones: EvaluacionCorrespondenciaPagoFactura['comparaciones'];
};
