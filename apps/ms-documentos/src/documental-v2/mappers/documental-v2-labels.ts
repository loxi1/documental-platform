export function tipoContextoLabel(tipoContexto: string | null | undefined): string | null {
  const normalized = normalizeKey(tipoContexto);

  const labels: Record<string, string> = {
    expediente_v1: 'Expediente V1',
    centro_costo_op: 'Centro de costo / Orden de producción',
  };

  return labels[normalized] ?? null;
}

export function tipoDocumentalLabel(tipoDocumental: string | null | undefined): string | null {
  const normalized = normalizeKey(tipoDocumental);

  const labels: Record<string, string> = {
    oc: 'Orden de compra',
    os: 'Orden de servicio',
    factura: 'Factura',
    guia: 'Guía',
    guia_remision: 'Guía de remisión',
    nota_ingreso: 'Nota de ingreso',
    transferencia: 'Transferencia',
    pago_transferencia: 'Transferencia',
    detraccion: 'Detracción',
    pago_detraccion: 'Detracción',
    recibo_honorario: 'Recibo por honorarios',
    recibo_por_honorarios: 'Recibo por honorarios',
    boleta: 'Boleta',
    recibo: 'Recibo',
  };

  return labels[normalized] ?? humanize(tipoDocumental);
}

export function estadoRevisionLabel(estado: string | null | undefined): string | null {
  const normalized = normalizeKey(estado);

  const labels: Record<string, string> = {
    pendiente_revision: 'Pendiente de revisión',
    activo: 'Activo',
    confirmado: 'Confirmado',
    validado: 'Validado',
    observado: 'Observado',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
  };

  return labels[normalized] ?? humanize(estado);
}

export function normalizarMoneda(moneda: string | null | undefined): string | null {
  const value = moneda?.trim();
  if (!value) return null;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (['USD', 'US$', '$', 'DOLAR', 'DOLARES', 'DOLARES AMERICANOS'].includes(normalized)) {
    return 'USD';
  }

  if (['PEN', 'S/', 'S/.', 'SOLES', 'SOL', 'NUEVOS SOLES'].includes(normalized)) {
    return 'PEN';
  }

  return value;
}

export function buildDocumentoLabel(
  tipoDocumental: string | null | undefined,
  serie: string | null | undefined,
  numero: string | null | undefined,
): string | null {
  const label = tipoDocumentalLabel(tipoDocumental) ?? humanize(tipoDocumental);
  const serieNumero = buildSerieNumero(serie, numero);

  if (label && serieNumero) return `${label} ${serieNumero}`;
  if (label && numero?.trim()) return `${label} ${numero.trim()}`;
  if (label) return label;
  if (serieNumero) return serieNumero;
  if (numero?.trim()) return numero.trim();

  return null;
}

export function buildSerieNumero(
  serie: string | null | undefined,
  numero: string | null | undefined,
): string | null {
  const cleanSerie = serie?.trim() || null;
  const cleanNumero = numero?.trim() || null;

  if (cleanSerie && cleanNumero) return `${cleanSerie}-${cleanNumero}`;
  if (cleanNumero) return cleanNumero;
  if (cleanSerie) return cleanSerie;

  return null;
}

function normalizeKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function humanize(value: string | null | undefined): string | null {
  const clean = value?.trim();
  if (!clean) return null;

  return clean
    .toLowerCase()
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}
