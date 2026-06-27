export type CatalogoOption = {
  codigo: string;
  nombre: string;
  simbolo?: string;
};

/**
 * Catálogo espejo de core.monedas.
 * MVP: se mantiene local en web-admin para cerrar el flujo.
 * Siguiente paso: consumir GET /api/v1/catalogos/monedas.
 */
export const MONEDA_OPTIONS: readonly CatalogoOption[] = [
  { codigo: "PEN", nombre: "SOLES", simbolo: "S/" },
  { codigo: "USD", nombre: "DOLARES AMERICANOS", simbolo: "US$" },
] as const;

/**
 * Catálogo espejo de core.bancos.
 * MVP: se mantiene local en web-admin para cerrar el flujo.
 * Siguiente paso: consumir GET /api/v1/catalogos/bancos.
 */
export const BANCO_OPTIONS: readonly CatalogoOption[] = [
  { codigo: "BANCO_NACION", nombre: "BANCO DE LA NACION" },
  { codigo: "INTERBANK", nombre: "INTERBANK" },
  { codigo: "BCP", nombre: "BCP" },
  { codigo: "BBVA", nombre: "BBVA" },
  { codigo: "SCOTIABANK", nombre: "SCOTIABANK" },
  { codigo: "YAPE", nombre: "YAPE" },
  { codigo: "PLIN", nombre: "PLIN" },
  { codigo: "OTRO", nombre: "OTRO" },
] as const;

export function hasCatalogValue(
  options: readonly CatalogoOption[],
  value: string | null | undefined,
) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return true;
  return options.some(
    (option) =>
      option.nombre.toUpperCase() === normalized ||
      option.codigo.toUpperCase() === normalized,
  );
}
