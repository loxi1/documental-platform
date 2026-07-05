export function formatDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value?: number | string | null, moneda = "PEN") {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return "—";

  const currency = moneda === "SOLES" ? "PEN" : moneda === "DOLARES AMERICANOS" ? "USD" : moneda;

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency || "PEN",
  }).format(amount);
}

export function formatDocumentNumber(serie?: string | null, numero?: string | null) {
  const cleanSerie = serie?.trim();
  const cleanNumero = numero?.trim();
  if (cleanSerie && cleanNumero) return `${cleanSerie}-${cleanNumero}`;
  return cleanSerie || cleanNumero || "—";
}

export function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
