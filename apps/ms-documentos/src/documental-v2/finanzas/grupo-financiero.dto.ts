export type ObligacionGrupoRow = {
  origenObligacion: 'FACTURA' | 'ORDEN_PAGO';
  principalId: number;
  tipoPrincipal: string;
  documentoPrincipalId: number;
  facturaDocumentoId: number | null;
  contenedorId: number;
  expedienteId: number | null;
};

export type SustentoFinanciero = {
  vinculoId: number | null;
  documentoId: number;
  archivoId: number | null;
  banco: string | null;
  fecha: string | null;
  monto: string | null;
  moneda: string | null;
  numeroReferencia: string | null;
  observacion: string | null;
  estado: 'activo' | 'observado' | 'anulado';
  motivo: string | null;
};

export type PagoGrupoReadRow = {
  vinculoId: number | null;
  documentoId: number;
  archivoId: number | null;
  estadoVinculo: string | null;
  estadoDocumento: string;
  metadata: Record<string, any>;
  monto: string | null;
  moneda: string | null;
  numero: string | null;
  fecha: string | null;
  motivo: string | null;
  fechaAnulacion: string | null;
  decision?: Record<string, any>;
  grupoArchivo?: string | null;
};

export type ResumenFinancieroGrupo = {
  grupoFacturaId: number;
  origenObligacion: 'FACTURA' | 'ORDEN_PAGO';
  obligacion: { tipo: 'FACTURA' | 'ORDEN_PAGO'; documentoId: number; referencia: string | null; monto: string; moneda: string };
  pago: { pagado: string; saldo: string; estado: 'COMPLETO' | 'PENDIENTE DE PAGO' | 'SIN PAGOS' };
  sustentosActivos: SustentoFinanciero[];
  sustentosObservados: SustentoFinanciero[];
  sustentosAnulados: SustentoFinanciero[];
};
