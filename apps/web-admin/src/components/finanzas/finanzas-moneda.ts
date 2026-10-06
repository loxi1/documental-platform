export function normalizarMonedaFinanzas(
  moneda: unknown,
  fallback = "PEN",
) {
  const raw = String(moneda ?? fallback)
    .trim()
    .toUpperCase();

  const normalizada = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s._-]+/g, "");

  if (["S/", "S/.", "SOLES", "SOL", "PEN"].includes(raw)) {
    return "PEN";
  }

  if (
    ["$", "US$", "USD", "DOLARES", "DOLAR"].includes(raw) ||
    ["DOLARESAMERICANOS", "DOLARAME", "USDDOLLARS"].includes(normalizada)
  ) {
    return "USD";
  }

  return raw || fallback;
}

export function formatMontoFinanzas(
  monto: string | number | null | undefined,
  moneda: unknown = "PEN",
) {
  if (monto === null || monto === undefined || monto === "") {
    return "No disponible";
  }

  const numero =
    typeof monto === "number"
      ? monto
      : Number(String(monto).replace(/,/g, ""));

  const monedaNormalizada = normalizarMonedaFinanzas(moneda);

  if (!Number.isFinite(numero)) {
    return `${monedaNormalizada} ${String(monto)}`.trim();
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: monedaNormalizada === "USD" ? "USD" : "PEN",
  }).format(numero);
}
