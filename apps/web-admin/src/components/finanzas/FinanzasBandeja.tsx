"use client";

import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevisionContable } from "@/hooks/useRevisionContable";
import { getContexto } from "@/lib/auth-storage";
import type { RevisionContableItem } from "@/types/revision-contable";

type UnknownRecord = Record<string, unknown>;

const PAGE_SIZE_OPTIONS = ["25", "50", "100"];

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function pick<T>(...values: T[]) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function nestedRecord(
  parent: UnknownRecord | null,
  ...keys: string[]
): UnknownRecord | null {
  if (!parent) return null;

  for (const key of keys) {
    const value = asRecord(parent[key]);
    if (value) return value;
  }

  return null;
}

function nestedValue(parent: UnknownRecord | null, ...keys: string[]) {
  if (!parent) return undefined;

  for (const key of keys) {
    const value = parent[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return undefined;
}

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeEmpresa(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function itemRecord(item: RevisionContableItem) {
  return item as unknown as UnknownRecord;
}

function filaFactura(item: RevisionContableItem) {
  return asRecord(itemRecord(item).filaFactura);
}

function facturaRecord(item: RevisionContableItem) {
  return nestedRecord(filaFactura(item), "factura");
}

function principalRecord(item: RevisionContableItem) {
  return (
    nestedRecord(filaFactura(item), "principal") ??
    asRecord(
      pick(
        itemRecord(item).documento_principal,
        itemRecord(item).documentoprincipal,
        null,
      ),
    )
  );
}

function transferenciaRecord(item: RevisionContableItem) {
  return nestedRecord(filaFactura(item), "transferencia");
}

function facturaSerie(item: RevisionContableItem) {
  return text(
    pick(
      nestedValue(facturaRecord(item), "serie"),
      itemRecord(item).serie,
      null,
    ),
  );
}

function facturaNumero(item: RevisionContableItem) {
  return text(
    pick(
      nestedValue(facturaRecord(item), "numero"),
      itemRecord(item).numero,
      null,
    ),
  );
}

function proveedorNombre(item: RevisionContableItem) {
  return text(
    pick(
      nestedValue(
        facturaRecord(item),
        "proveedorNombre",
        "razonSocialEmisor",
        "razon_social_emisor",
      ),
      itemRecord(item).razonSocialEmisor,
      itemRecord(item).razon_social_emisor,
      null,
    ),
  );
}

function proveedorRuc(item: RevisionContableItem) {
  return text(
    pick(
      nestedValue(
        facturaRecord(item),
        "proveedorRuc",
        "rucEmisor",
        "ruc_emisor",
      ),
      itemRecord(item).rucEmisor,
      itemRecord(item).ruc_emisor,
      null,
    ),
  );
}

function principalTipo(item: RevisionContableItem) {
  return text(
    nestedValue(
      principalRecord(item),
      "tipo",
      "tipoDocumental",
      "tipo_documental",
    ),
  ).toUpperCase();
}

function principalNumero(item: RevisionContableItem) {
  const principal = principalRecord(item);
  const serie = text(nestedValue(principal, "serie"), "");
  const numero = text(nestedValue(principal, "numero"), "");

  if (serie && numero) return `${serie}-${numero}`;
  return numero || serie || "—";
}

function fechaEmisionRaw(item: RevisionContableItem) {
  return pick(
    nestedValue(facturaRecord(item), "fechaEmision", "fecha_emision"),
    itemRecord(item).fechaEmision,
    itemRecord(item).fecha_emision,
    null,
  );
}

function formatDateCompact(value: unknown) {
  if (!value) return "—";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1].slice(-2)}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);

  return new Intl.DateTimeFormat("es-PE", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function fechaEmision(item: RevisionContableItem) {
  return formatDateCompact(fechaEmisionRaw(item));
}

function monedaFactura(item: RevisionContableItem) {
  return text(
    pick(
      nestedValue(facturaRecord(item), "moneda"),
      itemRecord(item).moneda,
      "SOLES",
    ),
    "SOLES",
  ).toUpperCase();
}

function montoFacturaNumber(item: RevisionContableItem) {
  const raw = pick(
    nestedValue(facturaRecord(item), "montoTotal", "monto_total"),
    itemRecord(item).montoTotal,
    itemRecord(item).monto_total,
    0,
  );

  const value = Number(raw ?? 0);
  return Number.isNaN(value) ? 0 : value;
}

function montoFactura(item: RevisionContableItem) {
  const currency =
    monedaFactura(item).includes("DOLAR") || monedaFactura(item) === "USD"
      ? "USD"
      : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(montoFacturaNumber(item));
}

function expedienteId(item: RevisionContableItem) {
  return pick(
    nestedValue(filaFactura(item), "expedienteId", "expediente_id"),
    itemRecord(item).expedienteId,
    itemRecord(item).expediente_id,
    null,
  );
}

function grupoFacturaId(item: RevisionContableItem) {
  return pick(
    nestedValue(filaFactura(item), "grupoFacturaId", "grupo_factura_id"),
    itemRecord(item).grupoFacturaId,
    itemRecord(item).grupo_factura_id,
    null,
  );
}

function isFacturaRow(item: RevisionContableItem) {
  if (facturaRecord(item)) return true;

  const tipo = String(
    pick(
      itemRecord(item).tipoDocumental,
      itemRecord(item).tipo_documental,
      "",
    ),
  ).toUpperCase();

  return tipo === "FACTURA";
}

function documentosRelacionados(item: RevisionContableItem) {
  const record = itemRecord(item);

  for (const key of [
    "documentos",
    "documentos_relacionados",
    "documentosrelacionados",
    "documentos_adjuntos",
    "documentosadjuntos",
  ]) {
    const value = record[key];
    if (Array.isArray(value)) return value as UnknownRecord[];
  }

  return [];
}

function esTransferencia(doc: UnknownRecord) {
  const tipo = String(
    pick(doc.tipoDocumental, doc.tipo_documental, ""),
  ).toUpperCase();
  const relacion = String(
    pick(doc.tipoRelacion, doc.tipo_relacion, ""),
  ).toUpperCase();

  return (
    tipo.includes("TRANSFERENCIA") ||
    tipo.includes("PAGO_TRANSFERENCIA") ||
    relacion.includes("ADJUNTO_TRANSFERENCIA")
  );
}

function tieneSustentoPago(item: RevisionContableItem) {
  if (transferenciaRecord(item)) return true;
  return documentosRelacionados(item).some(esTransferencia);
}

function operacionesTransferencia(item: RevisionContableItem) {
  const values = new Set<string>();

  const canonical = transferenciaRecord(item);
  const canonicalNumero = text(
    nestedValue(canonical, "numeroOperacion", "numero_operacion", "numero"),
    "",
  );
  if (canonicalNumero) values.add(canonicalNumero);

  for (const doc of documentosRelacionados(item)) {
    if (!esTransferencia(doc)) continue;
    const numero = text(
      pick(doc.numeroOperacion, doc.numero_operacion, doc.numero, ""),
      "",
    );
    if (numero) values.add(numero);
  }

  return [...values];
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function searchText(item: RevisionContableItem) {
  return [
    facturaSerie(item),
    facturaNumero(item),
    principalTipo(item),
    principalNumero(item),
    proveedorNombre(item),
    proveedorRuc(item),
    ...operacionesTransferencia(item),
  ]
    .filter(Boolean)
    .join(" ");
}

function buildYearOptions() {
  const current = new Date().getFullYear();
  const end = Math.max(current, 2026);

  return Array.from({ length: end - 2026 + 1 }, (_, index) =>
    String(2026 + index),
  );
}

function buildMonthOptions(year: string) {
  const current = new Date();
  const selectedYear = Number(year);

  if (selectedYear === current.getFullYear()) {
    return MESES.slice(0, current.getMonth() + 1);
  }

  return MESES;
}

function FacturaCell({ item }: { item: RevisionContableItem }) {
  return (
    <div>
      <div className="font-medium leading-tight">{facturaSerie(item)}</div>
      <div className="text-xs leading-tight text-muted-foreground">
        {facturaNumero(item)}
      </div>
    </div>
  );
}

function PrincipalCell({ item }: { item: RevisionContableItem }) {
  return (
    <div>
      <div className="font-medium leading-tight">{principalTipo(item)}</div>
      <div className="text-xs leading-tight text-muted-foreground">
        {principalNumero(item)}
      </div>
    </div>
  );
}

function ProveedorCell({ item }: { item: RevisionContableItem }) {
  const nombre = proveedorNombre(item);

  return (
    <div className="w-[180px] max-w-[180px]">
      <div className="truncate font-medium" title={nombre}>
        {nombre}
      </div>
      <div className="text-xs text-muted-foreground">{proveedorRuc(item)}</div>
    </div>
  );
}

function ActionsCell({ item }: { item: RevisionContableItem }) {
  const expId = expedienteId(item);
  const grupoId = grupoFacturaId(item);

  if (
    (typeof expId !== "string" && typeof expId !== "number") ||
    expId === ""
  ) {
    return <span className="text-muted-foreground">—</span>;
  }

  const query = new URLSearchParams();
  if (typeof grupoId === "string" || typeof grupoId === "number") {
    query.set("grupoFacturaId", String(grupoId));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return (
    <div className="flex justify-end gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/finanzas/${expId}/ver${suffix}`}>
          <Eye className="h-4 w-4" />
          Ver
        </Link>
      </Button>

      {typeof grupoId === "string" || typeof grupoId === "number" ? (
        <Button asChild size="sm">
          <Link
            href={`/finanzas/${expId}/editar?grupoFacturaId=${encodeURIComponent(
              String(grupoId),
            )}`}
          >
            + Adjuntar
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled
          title="La factura no tiene grupo persistido para adjuntar un sustento"
        >
          + Adjuntar
        </Button>
      )}
    </div>
  );
}

export function FinanzasBandeja() {
  const contexto = getContexto();
  const empresa = normalizeEmpresa(contexto?.empresa) || "BBTI";
  const today = new Date();

  const [anio, setAnio] = useState(String(Math.max(today.getFullYear(), 2026)));
  const [mes, setMes] = useState(String(today.getMonth() + 1));
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("50");
  const [page, setPage] = useState(1);

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const monthOptions = useMemo(() => buildMonthOptions(anio), [anio]);

  useEffect(() => {
    if (!monthOptions.some((option) => option.value === mes)) {
      setMes(monthOptions.at(-1)?.value ?? "1");
    }
  }, [mes, monthOptions]);

  const params = useMemo(
    () => ({
      empresa,
      anio,
      mes,
    }),
    [empresa, anio, mes],
  );

  const { data, isLoading, isFetching, error, refetch } =
    useRevisionContable(params);

  const rows = useMemo(
    () => (data?.items ?? []).filter(isFacturaRow),
    [data?.items],
  );

  const filteredRows = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return rows;

    return rows.filter((item) =>
      normalizeSearch(searchText(item)).includes(query),
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [anio, mes, search, pageSize]);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / numericPageSize),
  );
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * numericPageSize;
  const pageRows = filteredRows.slice(start, start + numericPageSize);

  if (isLoading && !data) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          Bandeja por factura para consultar y adjuntar sustentos de pago.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 lg:grid-cols-[130px_130px_1fr_auto]">
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={anio}
              onChange={(event) => setAnio(event.target.value)}
              aria-label="Año"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
              aria-label="Mes"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Input
              placeholder="Buscar factura, OC/OS, transferencia, RUC o proveedor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <Search className="h-4 w-4" />
              {isFetching ? "Actualizando" : "Actualizar"}
            </Button>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Empresa: <span className="font-medium text-foreground">{empresa}</span>
            {" · "}
            {filteredRows.length} factura
            {filteredRows.length === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">
            No se pudo cargar la bandeja de Finanzas desde la fuente común por
            factura.
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="border-b py-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Bandeja de Finanzas</CardTitle>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
              aria-label="Registros por página"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">💳</EmptyMedia>
                <EmptyTitle>Sin facturas para Finanzas</EmptyTitle>
                <EmptyDescription>
                  No se encontraron facturas para el periodo y búsqueda
                  seleccionados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left align-bottom">
                      <th className="min-w-[105px] px-3 py-2.5">Factura</th>
                      <th className="min-w-[90px] px-3 py-2.5">OC/OS</th>
                      <th className="w-[190px] min-w-[165px] max-w-[190px] px-3 py-2.5">
                        Proveedor
                      </th>
                      <th className="min-w-[92px] px-3 py-2.5">
                        <span className="block leading-tight">Fecha de</span>
                        <span className="block leading-tight">emisión</span>
                      </th>
                      <th className="min-w-[105px] px-3 py-2.5">Importe</th>
                      <th className="min-w-[82px] px-3 py-2.5 text-center">
                        Sustento
                      </th>
                      <th className="min-w-[170px] px-3 py-2.5 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.map((item) => {
                      const expId = expedienteId(item);
                      const grupoId = grupoFacturaId(item);
                      const key = `${String(expId ?? "sin-exp")}-${String(
                        grupoId ??
                          `${facturaSerie(item)}-${facturaNumero(item)}`,
                      )}`;

                      return (
                        <tr
                          key={key}
                          className="border-b align-middle hover:bg-muted/30"
                        >
                          <td className="px-3 py-2.5">
                            <FacturaCell item={item} />
                          </td>

                          <td className="px-3 py-2.5">
                            <PrincipalCell item={item} />
                          </td>

                          <td className="w-[190px] max-w-[190px] px-3 py-2.5">
                            <ProveedorCell item={item} />
                          </td>

                          <td className="whitespace-nowrap px-3 py-2.5">
                            {fechaEmision(item)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                            {montoFactura(item)}
                          </td>

                          <td
                            className="px-3 py-2.5 text-center text-base font-semibold"
                            title={
                              tieneSustentoPago(item)
                                ? "Existe sustento de pago asociado a la factura"
                                : "No se registra sustento de pago asociado"
                            }
                            aria-label={
                              tieneSustentoPago(item)
                                ? "Sustento de pago disponible"
                                : "Sin sustento de pago"
                            }
                          >
                            {tieneSustentoPago(item) ? "✓" : "—"}
                          </td>

                          <td className="px-3 py-2.5 text-right">
                            <ActionsCell item={item} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-muted-foreground">
                  Mostrando {pageRows.length ? start + 1 : 0}-
                  {Math.min(start + pageRows.length, filteredRows.length)} de{" "}
                  {filteredRows.length}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Anterior
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
