export function positiveId(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function selectPrincipal<T>(rows: T[], requested: string | null, idOf: (row: T) => unknown) {
  if (requested === null) return { selected: null as T | null, invalid: false };
  const id = positiveId(requested);
  const selected = id === null ? null : rows.find(row => positiveId(idOf(row)) === id) ?? null;
  return { selected, invalid: selected === null };
}
export function principalHref(expedienteId: unknown, principalId: unknown, mode: "ver" | "editar", query = "", returnTo?: string) {
  const exp = positiveId(expedienteId), principal = positiveId(principalId);
  if (exp === null || principal === null) return null;
  const params = new URLSearchParams(query);
  params.set("principalId", String(principal));
  if (returnTo !== undefined) params.set("returnTo", returnTo);
  return `/compras/${exp}/${mode}?${params.toString()}`;
}
export type ComprasPersistencia = {
  documentoId: number | string; archivoId: number | string | null;
  documentoPersistido: boolean; archivoPersistido: boolean;
  estadoDocumento: string | null; estadoOcr: string | null;
};
export function persistencePresentation(value?: ComprasPersistencia | null) {
  const saved = value?.documentoPersistido === true && value?.archivoPersistido === true && positiveId(value.documentoId) !== null && positiveId(value.archivoId) !== null;
  const confirmed = value?.estadoDocumento === "confirmado";
  const label = confirmed ? "Confirmado" : value?.estadoOcr && ["pendiente_validacion", "editado"].includes(value.estadoOcr)
    ? "Validación pendiente" : value?.estadoOcr ? "OCR registrado" : "OCR pendiente";
  return { saved, confirmed, label: value ? label : "Persistencia sin verificar" };
}
