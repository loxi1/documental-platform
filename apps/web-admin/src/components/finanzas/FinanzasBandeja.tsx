"use client";

import { PagoGrupoResumenCell } from "@/components/finanzas/PagoGrupoResumenCell";

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

function centroCostoCodigo(item: RevisionContableItem) {
  const fila = filaFactura(item);
  const centro = nestedRecord(fila, "centroCosto", "centro_costo");
  const record = itemRecord(item);

  return text(
    pick(
      nestedValue(
        centro,
        "codigo",
        "centroCostoCodigo",
        "centro_costo_codigo",
      ),
      record.codigoCentroCosto,
      record.codigo_centro_costo,
      record.codigoExpediente,
      record.codigo_expediente,
      null,
    ),
    "",
  );
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
    centroCostoCodigo(item),
    proveedorNombre(item),
    proveedorRuc(item),
    ...operacionesTransferencia(item),
  ]
    .filter(Boolean)
    .join(" ");
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
  const empresa = normalizeEmpresa(contexto?.empresa);
  const [search, setSearch] = useState("");
  const [soloPendientesFinanzas, setSoloPendientesFinanzas] = useState(false);
  const [pageSize, setPageSize] = useState("50");
  const [page, setPage] = useState(1);

  const normalizedSearch = search.trim();
  const hasSearch = normalizedSearch.length >= 3;
  const hasOperationalQuery = hasSearch || soloPendientesFinanzas;

  const params = useMemo(
    () => {
      const numericPageSize = Number(pageSize);
      return {
        q: hasSearch ? normalizedSearch : undefined,
        limit: hasOperationalQuery ? numericPageSize + 1 : undefined,
        offset: hasOperationalQuery ? (page - 1) * numericPageSize : undefined,
        soloPendientesFinanzas: soloPendientesFinanzas || undefined,
      };
    },
    [
      hasOperationalQuery,
      hasSearch,
      normalizedSearch,
      page,
      pageSize,
      soloPendientesFinanzas,
    ],
  );
  const queryEnabled = Boolean(empresa.trim() && hasOperationalQuery);

  const { data, isLoading, isFetching, error, refetch } =
    useRevisionContable(params, queryEnabled);

  const rows = useMemo(
    () => (data?.items ?? []).filter(isFacturaRow),
    [data?.items],
  );

  const filteredRows = useMemo(() => {
    if (!hasSearch) return rows;
    const query = normalizeSearch(normalizedSearch);

    return rows.filter((item) =>
      normalizeSearch(searchText(item)).includes(query),
    );
  }, [hasSearch, normalizedSearch, rows]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, soloPendientesFinanzas]);

  const numericPageSize = Number(pageSize);
  const hasNextPage = filteredRows.length > numericPageSize;
  const safePage = page;
  const start = (safePage - 1) * numericPageSize;
  const totalPages = hasNextPage ? page + 1 : page;
  const pageRows = filteredRows.slice(0, numericPageSize);

  return (
    <main className="space-y-4" data-msii-layout="MSII_GRID_FIRST_FINANZAS_01_V2">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          Bandeja por factura para consultar y adjuntar sustentos de pago.
        </p>
      </div>

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Bandeja de Finanzas</CardTitle>
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[820px]">
              <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
                <Input
                  className="lg:min-w-[420px] lg:flex-1"
                  placeholder="Buscar factura, OC/OS, centro de costo, proveedor o RUC..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                  <input
                    type="checkbox"
                    checked={soloPendientesFinanzas}
                    title="Mostrar solo facturas con una decisión financiera pendiente"
                    onChange={(event) => setSoloPendientesFinanzas(event.target.checked)}
                  />
                  Pendientes de observación
                </label>

                <Button
                  className="shrink-0"
                  type="button"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={!queryEnabled || isFetching}
                >
                  <Search className="h-4 w-4" />
                  {isFetching ? "Actualizando" : "Actualizar"}
                </Button>
              </div>

              {search.trim().length > 0 && search.trim().length < 3 ? (
                <p className="text-xs text-muted-foreground">
                  Ingrese al menos 3 caracteres para buscar.
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">💳</EmptyMedia>
                <EmptyTitle>
                  {hasSearch ? "Sin facturas para Finanzas" : "Buscar facturas para Finanzas"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasSearch
                    ? "No se encontraron facturas para la búsqueda realizada."
                    : "Ingrese factura, OC/OS, centro de costo, proveedor o RUC para consultar."}
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
                      <th className="min-w-[110px] px-3 py-2.5">
                        <span className="block leading-tight">Centro de</span>
                        <span className="block leading-tight">costo</span>
                      </th>
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

                          <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                            {centroCostoCodigo(item) || "—"}
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

                          <td className="px-3 py-2.5">
                            <PagoGrupoResumenCell grupoFacturaId={grupoId} />
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
                  {start + pageRows.length}
                </div>

                <div className="flex gap-2">
            <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tamaño</span>
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value)}
                aria-label="Registros por página"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Anterior
                  </Button>

                  <div className="flex h-8 min-w-[76px] items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground">
                    Página {safePage}
                  </div>

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
