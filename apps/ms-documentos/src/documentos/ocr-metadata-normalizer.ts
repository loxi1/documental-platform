/**
 * Normaliza aliases OCR legacy a nombres canónicos y elimina únicamente
 * claves legacy que no deben persistirse.
 *
 * Extraído como función pura para poder probar la normalización sin cargar
 * DocumentosService/Nest ni dependencias ESM del runtime.
 */
export function limpiarCamposLegacyOcr<T>(value: T): T {
    const legacyKeys = new Set([
      'tipoCodigoExpediente',
      'codigoOp',
      'codigoCentroCosto',
      'proveedorRuc',
      'compradorRuc',
    ]);

    if (Array.isArray(value)) {
      return value.map((item) => limpiarCamposLegacyOcr(item)) as T;
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const canonicalAliases: Record<string, string> = {
        proveedorRuc: 'rucProveedor',
        compradorRuc: 'rucComprador',
      };

      const normalizedEntries = Object.entries(record).map(([key, item]) => {
        const canonicalKey = canonicalAliases[key] ?? key;
        return [canonicalKey, limpiarCamposLegacyOcr(item)] as const;
      });

      const normalized = Object.fromEntries(normalizedEntries);

      return Object.fromEntries(
        Object.entries(normalized).filter(([key]) => !legacyKeys.has(key)),
      ) as T;
    }

    return value;
  }
