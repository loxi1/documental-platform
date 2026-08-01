import {
  DatosFacturaCorrespondencia,
  DatosPagoCorrespondencia,
} from './correspondencia-pago-factura.types';

export type DocumentoCorrespondenciaSnapshot = {
  id: number;
  tipoDocumental: string;
  rucEmisor?: string | null;
  razonSocialEmisor?: string | null;
  serie?: string | null;
  numero?: string | null;
  moneda?: string | null;
  montoTotal?: number | null;
  metadata?: Record<string, unknown> | null;
};

function pickString(
  source: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function pickNumber(
  source: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = Number(value.replace(/,/g, '').trim());
      if (Number.isFinite(normalized)) {
        return normalized;
      }
    }
  }
  return null;
}

function documentoSerieNumero(
  serie?: string | null,
  numero?: string | null,
): string | null {
  const serieNormalizada = String(serie ?? '').trim();
  const numeroNormalizado = String(numero ?? '').trim();

  if (serieNormalizada && numeroNormalizado) {
    return `${serieNormalizada}-${numeroNormalizado}`;
  }

  return serieNormalizada || numeroNormalizado || null;
}

export function adaptarFacturaCorrespondencia(
  documento: DocumentoCorrespondenciaSnapshot,
): DatosFacturaCorrespondencia {
  return {
    documentoId: documento.id,
    proveedorRuc:
      documento.rucEmisor ??
      pickString(documento.metadata, 'rucProveedor', 'rucEmisor', 'ruc'),
    proveedorNombre:
      documento.razonSocialEmisor ??
      pickString(
        documento.metadata,
        'proveedorNombre',
        'proveedor',
        'razonSocial',
      ),
    moneda:
      documento.moneda ??
      pickString(documento.metadata, 'moneda', 'currency'),
    importe:
      documento.montoTotal ??
      pickNumber(documento.metadata, 'montoTotal', 'importeTotal'),
    documento:
      documentoSerieNumero(documento.serie, documento.numero) ??
      pickString(
        documento.metadata,
        'documento',
        'numeroDocumento',
        'comprobante',
      ),
  };
}

export function adaptarPagoCorrespondencia(
  documento: DocumentoCorrespondenciaSnapshot,
): DatosPagoCorrespondencia {
  return {
    documentoId: documento.id,
    proveedorRuc:
      pickString(
        documento.metadata,
        'proveedorRuc',
        'rucProveedor',
        'rucBeneficiario',
      ) ?? documento.rucEmisor,
    proveedorNombre:
      pickString(
        documento.metadata,
        'proveedorNombre',
        'proveedor',
        'beneficiario',
      ) ?? documento.razonSocialEmisor,
    moneda:
      pickString(documento.metadata, 'moneda', 'currency') ??
      documento.moneda,
    importe:
      pickNumber(
        documento.metadata,
        'montoOperacion',
        'montoAplicado',
        'montoTotal',
      ) ?? documento.montoTotal,
    documentoReferenciado: pickString(
      documento.metadata,
      'documentoReferenciado',
      'numeroDocumentoReferenciado',
      'referencia',
      'comprobante',
    ),
  };
}
