export interface DashboardContableTotales {
  expedientes?: number | string;
  facturas?: number | string;
  montoFacturado?: number | string;
  alertasActivas?: number | string;
  [key: string]: unknown;
}

export interface DashboardContableResponse {
  empresa?: string;
  anio?: number | string;
  mes?: number | string;
  totales?: DashboardContableTotales;
  [key: string]: unknown;
}

export interface DashboardContableParams {
  empresa: string;
  anio: number | string;
  mes: number | string;
}
