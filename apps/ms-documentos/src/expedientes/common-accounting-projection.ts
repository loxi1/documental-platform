export type CommonAccountingOrigin = 'OC_OS' | 'ORDEN_PAGO';

export type CommonAccountingRegularizationState =
  | 'REGULARIZADO'
  | 'PENDIENTE'
  | 'NO_REQUIERE';

export type CommonAccountingRow = {
  origin: CommonAccountingOrigin;
  accountingDocumentId: number;
  groupFacturaId: number;
  principalId: number | null;
  principalType: 'OC' | 'OS' | 'ORDEN_PAGO';
  principalNumber: string | null;

  empresaCodigo: string;
  clienteDestinoId: number | null;

  fechaEmision: unknown;
  moneda: string | null;
  montoTotal: unknown;
  functionalPeriodYear: number | null;
  functionalPeriodMonth: number | null;

  estadoRegularizacion: CommonAccountingRegularizationState;

  centroCostoCodigo: string | null;
  contraparte: unknown | null;
  sourceDocument: unknown | null;

  documents: unknown[];
  payments: unknown[];

  revisionContable: unknown | null;
};

type LegacyRow = Record<string, any>;

function firstDefined<T = any>(
  source: LegacyRow,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key] as T;
  }
  return undefined;
}

function requiredPositiveId(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`COMMON_ACCOUNTING_INVALID_${field.toUpperCase()}`);
  }
  return parsed;
}

function nullablePositiveId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function relationType(document: any): string | null {
  const value =
    document?.tipoRelacion ??
    document?.tipo_relacion ??
    document?.tiporelacion ??
    null;

  return value == null ? null : String(value);
}

function paymentsFromDocuments(documents: unknown[]): unknown[] {
  return documents.filter(
    (document: any) => relationType(document) === 'adjunto_transferencia',
  );
}

function normalizePrincipalType(
  value: unknown,
  origin: CommonAccountingOrigin,
): 'OC' | 'OS' | 'ORDEN_PAGO' {
  if (origin === 'ORDEN_PAGO') return 'ORDEN_PAGO';

  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'OC' || normalized === 'ORDEN_COMPRA') return 'OC';
  if (normalized === 'OS' || normalized === 'ORDEN_SERVICIO') return 'OS';

  throw new Error('COMMON_ACCOUNTING_INVALID_PRINCIPAL_TYPE');
}

export function mapFacturaOcosToCommonAccountingRow(
  row: LegacyRow,
): CommonAccountingRow {
  const accountingDocumentId = requiredPositiveId(
    firstDefined(row, 'factura_id', 'facturaid', 'documento_id', 'documentoid'),
    'accounting_document_id',
  );

  const groupFacturaId = requiredPositiveId(
    firstDefined(row, 'grupo_factura_id', 'grupofacturaid'),
    'grupo_factura_id',
  );

  const principalId = nullablePositiveId(
    firstDefined(
      row,
      'documento_operativo_principal_id',
      'documentooperativoprincipalid',
    ),
  );

  const principalType = normalizePrincipalType(
    firstDefined(
      row,
      'documento_principal_tipo',
      'documentoprincipaltipo',
    ),
    'OC_OS',
  );

  const documents = asArray(
    firstDefined(
      row,
      'documentos',
      'documentos_relacionados',
      'documentosrelacionados',
    ),
  );

  const empresaCodigo = String(
    firstDefined(row, 'empresa_codigo_v2', 'empresaCodigoV2', 'empresa_codigo', 'empresacodigo') ??
      '',
  ).trim();

  if (!empresaCodigo) {
    throw new Error('COMMON_ACCOUNTING_INVALID_EMPRESA_CODIGO');
  }

  return {
    origin: 'OC_OS',
    accountingDocumentId,
    groupFacturaId,
    principalId,
    principalType,
    principalNumber:
      firstDefined(
        row,
        'documento_principal_numero',
        'documentoprincipalnumero',
      ) ?? null,

    empresaCodigo,
    clienteDestinoId: nullablePositiveId(
      firstDefined(row, 'cliente_destino_id_v2', 'clienteDestinoIdV2'),
    ),

    fechaEmision: firstDefined(row, 'fecha_emision', 'fechaemision') ?? null,
    moneda: firstDefined<string>(row, 'moneda') ?? null,
    montoTotal: firstDefined(row, 'monto_total', 'montototal') ?? null,

    // El periodo funcional NO se deriva de fechaEmision.
    functionalPeriodYear: null,
    functionalPeriodMonth: null,

    estadoRegularizacion: 'REGULARIZADO',

    centroCostoCodigo:
      firstDefined(row, 'codigo_centro_costo', 'codigocentrocosto') ?? null,

    contraparte:
      firstDefined(row, 'contraparte') ??
      (
        firstDefined(row, 'razon_social_emisor', 'razonsocialemisor') != null ||
        firstDefined(row, 'ruc_emisor', 'rucemisor') != null
          ? {
              nombre:
                firstDefined(row, 'razon_social_emisor', 'razonsocialemisor') ??
                null,
              ruc: firstDefined(row, 'ruc_emisor', 'rucemisor') ?? null,
            }
          : null
      ),

    sourceDocument:
      firstDefined(row, 'sourceDocument') ??
      firstDefined(row, 'filaFactura')?.factura ??
      {
        documentoId: accountingDocumentId,
        serie: firstDefined(row, 'serie') ?? null,
        numero: firstDefined(row, 'numero') ?? null,
        fechaEmision:
          firstDefined(row, 'fecha_emision', 'fechaemision') ?? null,
        moneda: firstDefined(row, 'moneda') ?? null,
        montoTotal: firstDefined(row, 'monto_total', 'montototal') ?? null,
      },

    documents,
    payments: paymentsFromDocuments(documents),

    revisionContable:
      firstDefined(row, 'revision_contable', 'revisioncontable') ?? null,
  };
}

export function mapOrdenPagoToCommonAccountingRow(
  row: LegacyRow,
): CommonAccountingRow {
  const accountingDocumentId = requiredPositiveId(
    firstDefined(row, 'documento_id', 'documentoid'),
    'accounting_document_id',
  );

  const groupFacturaId = requiredPositiveId(
    firstDefined(row, 'grupo_factura_id', 'grupofacturaid'),
    'grupo_factura_id',
  );

  const documents = asArray(
    firstDefined(
      row,
      'documentos',
      'documentos_relacionados',
      'documentosrelacionados',
    ),
  );

  const rawState = firstDefined(
    row,
    'estadoRegularizacion',
    'estado_regularizacion',
  );

  if (
    rawState !== 'PENDIENTE' &&
    rawState !== 'NO_REQUIERE' &&
    rawState !== 'REGULARIZADO'
  ) {
    throw new Error('COMMON_ACCOUNTING_INVALID_REGULARIZATION_STATE');
  }

  const empresaCodigo = String(
    firstDefined(row, 'empresa_codigo', 'empresaCodigo') ?? '',
  ).trim();

  if (!empresaCodigo) {
    throw new Error('COMMON_ACCOUNTING_INVALID_EMPRESA_CODIGO');
  }

  return {
    origin: 'ORDEN_PAGO',
    accountingDocumentId,
    groupFacturaId,
    principalId: nullablePositiveId(
      firstDefined(row, 'ordenPagoId', 'orden_pago_id', 'principalId'),
    ),
    principalType: 'ORDEN_PAGO',
    principalNumber: firstDefined(row, 'numero') ?? null,

    empresaCodigo,
    clienteDestinoId: nullablePositiveId(
      firstDefined(row, 'cliente_destino_id', 'clienteDestinoId'),
    ),

    fechaEmision: firstDefined(row, 'fecha_emision', 'fechaEmision') ?? null,
    moneda: firstDefined<string>(row, 'moneda') ?? null,
    montoTotal: firstDefined(row, 'monto_total', 'montoTotal') ?? null,

    functionalPeriodYear: nullableNumber(
      firstDefined(row, 'periodo_anio', 'periodoAnio'),
    ),
    functionalPeriodMonth: nullableNumber(
      firstDefined(row, 'periodo_mes', 'periodoMes'),
    ),

    estadoRegularizacion: rawState,

    centroCostoCodigo:
      firstDefined(row, 'codigo_centro_costo', 'codigoCentroCosto') ?? null,

    contraparte:
      firstDefined(row, 'contraparte', 'beneficiario') ?? null,

    sourceDocument:
      firstDefined(row, 'sourceDocument') ?? {
        documentoId: accountingDocumentId,
        numero: firstDefined(row, 'numero') ?? null,
        fechaEmision:
          firstDefined(row, 'fecha_emision', 'fechaEmision') ?? null,
        moneda: firstDefined(row, 'moneda') ?? null,
        montoTotal: firstDefined(row, 'monto_total', 'montoTotal') ?? null,
      },

    documents,
    payments: paymentsFromDocuments(documents),

    revisionContable:
      firstDefined(row, 'revision_contable', 'revisionContable') ?? null,
  };
}

export function mapCommonAccountingRowToLegacy<T extends LegacyRow>(
  common: CommonAccountingRow,
  legacy: T,
): T {
  // Compatibilidad: conserva el mismo objeto/shape legacy y expone
  // únicamente el estado común de regularización para su presentación.
  Object.assign(legacy, {
    estadoRegularizacion: common.estadoRegularizacion,
  });
  return legacy;
}
