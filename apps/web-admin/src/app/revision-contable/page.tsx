"use client";

import { PagoGrupoResumenCell } from "@/components/finanzas/PagoGrupoResumenCell";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, RefreshCcw, Search, X } from "lucide-react";

import { PreviewDocumento } from "@/components/common/PreviewDocumento";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRevisionContable } from "@/hooks/useRevisionContable";
import { getContexto } from "@/lib/auth-storage";
import type { RevisionContableItem } from "@/types/revision-contable";

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

const PAGE_SIZE_OPTIONS = ["25", "50", "100"];

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function pick<T>(...values: T[]) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function asText(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeEmpresa(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function getBrowserQueryParam(key: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
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

function formatDateCompact(value: unknown) {
  if (!value) return "—";

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year.slice(-2)}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);

  return new Intl.DateTimeFormat("es-PE", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function itemRecord(item: RevisionContableItem) {
  return item as unknown as UnknownRecord;
}

function filaFactura(item: RevisionContableItem) {
  return asRecord(itemRecord(item).filaFactura);
}

function nestedRecord(
  parent: UnknownRecord | null,
  ...keys: string[]
): UnknownRecord | null {
  if (!parent) return null;

  for (const key of keys) {
    const candidate = asRecord(parent[key]);
    if (candidate) return candidate;
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

function facturaRecord(item: RevisionContableItem) {
  return nestedRecord(filaFactura(item), "factura");
}

function principalRecord(item: RevisionContableItem) {
  return (
    nestedRecord(filaFactura(item), "principal") ??
    asRecord(
      pick(
        itemRecord(item).documentoPrincipal,
        itemRecord(item).documento_principal,
        null,
      ),
    )
  );
}

function documentoCompacto(
  item: RevisionContableItem,
  key: "guia" | "notaIngreso" | "transferencia" | "detraccion",
) {
  return nestedRecord(filaFactura(item), key);
}

function expedienteId(item: RevisionContableItem) {
  const fila = filaFactura(item);
  return pick(
    nestedValue(fila, "expedienteId", "expediente_id"),
    itemRecord(item).expedienteId,
    itemRecord(item).expediente_id,
    null,
  );
}

function grupoFacturaId(item: RevisionContableItem) {
  const fila = filaFactura(item);
  return pick(
    nestedValue(fila, "grupoFacturaId", "grupo_factura_id"),
    itemRecord(item).grupoFacturaId,
    itemRecord(item).grupo_factura_id,
    null,
  );
}

function facturaDocumentoId(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return pick(
    nestedValue(factura, "documentoId", "documento_id"),
    itemRecord(item).documentoId,
    itemRecord(item).documento_id,
    null,
  );
}

function normalizeArchivoId(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

function facturaArchivoId(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return normalizeArchivoId(
    pick(
      nestedValue(factura, "archivoId", "archivo_id"),
      itemRecord(item).facturaArchivoId,
      itemRecord(item).factura_archivo_id,
      null,
    ),
  );
}

function principalArchivoId(item: RevisionContableItem) {
  const filaPrincipal = nestedRecord(filaFactura(item), "principal");
  const legacyPrincipal =
    asRecord(itemRecord(item).documento_principal) ??
    asRecord(itemRecord(item).documentoprincipal);

  return normalizeArchivoId(
    pick(
      nestedValue(filaPrincipal, "archivoId", "archivo_id"),
      nestedValue(legacyPrincipal, "archivoId", "archivo_id"),
      null,
    ),
  );
}

function documentoArchivoId(doc: UnknownRecord | null) {
  return normalizeArchivoId(nestedValue(doc, "archivoId", "archivo_id"));
}

function facturaSerie(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return asText(
    pick(nestedValue(factura, "serie"), itemRecord(item).serie),
    "—",
  );
}

function facturaNumero(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return asText(
    pick(nestedValue(factura, "numero"), itemRecord(item).numero),
    "—",
  );
}

function fechaEmisionRaw(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return pick(
    nestedValue(factura, "fechaEmision", "fecha_emision"),
    itemRecord(item).fechaEmision,
    itemRecord(item).fecha_emision,
    null,
  );
}

function fechaEmision(item: RevisionContableItem) {
  return formatDateCompact(fechaEmisionRaw(item));
}

function proveedorNombre(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return asText(
    pick(
      nestedValue(
        factura,
        "proveedorNombre",
        "razonSocialEmisor",
        "razon_social_emisor",
      ),
      itemRecord(item).razonSocialEmisor,
      itemRecord(item).razon_social_emisor,
    ),
    "—",
  );
}

function proveedorRuc(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return asText(
    pick(
      nestedValue(factura, "proveedorRuc", "rucEmisor", "ruc_emisor"),
      itemRecord(item).rucEmisor,
      itemRecord(item).ruc_emisor,
    ),
    "—",
  );
}

function monedaFactura(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  return asText(
    pick(
      nestedValue(factura, "moneda"),
      itemRecord(item).moneda,
      "SOLES",
    ),
    "SOLES",
  ).toUpperCase();
}

function montoFacturaNumber(item: RevisionContableItem) {
  const factura = facturaRecord(item);
  const raw = pick(
    nestedValue(factura, "montoTotal", "monto_total"),
    itemRecord(item).montoTotal,
    itemRecord(item).monto_total,
    0,
  );

  const parsed = Number(raw ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value: number, moneda = "SOLES") {
  const currency = moneda.includes("DOLAR") || moneda === "USD" ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function montoFactura(item: RevisionContableItem) {
  return formatMoney(montoFacturaNumber(item), monedaFactura(item));
}

function principalTipo(item: RevisionContableItem) {
  const principal = principalRecord(item);
  return asText(
    nestedValue(principal, "tipo", "tipoDocumental", "tipo_documental"),
    "—",
  ).toUpperCase();
}

function principalNumero(item: RevisionContableItem) {
  const principal = principalRecord(item);
  const serie = asText(nestedValue(principal, "serie"), "");
  const numero = asText(nestedValue(principal, "numero"), "");

  if (serie && numero) return `${serie}-${numero}`;
  return numero || serie || "—";
}

function centroCostoCodigo(item: RevisionContableItem) {
  const fila = filaFactura(item);
  const centro = nestedRecord(fila, "centroCosto", "centro_costo");
  const itemValue = itemRecord(item);

  return asText(
    pick(
      nestedValue(centro, "codigo", "centroCostoCodigo", "centro_costo_codigo"),
      itemValue.codigoCentroCosto,
      itemValue.codigo_centro_costo,
      itemValue.codigoExpediente,
      itemValue.codigo_expediente,
      null,
    ),
    "—",
  );
}

function documentoSerie(doc: UnknownRecord | null) {
  return asText(nestedValue(doc, "serie"), "");
}

function documentoNumero(doc: UnknownRecord | null) {
  return asText(
    nestedValue(doc, "numero", "numeroDocumento", "numero_documento"),
    "",
  );
}

function documentoIdentidad(doc: UnknownRecord | null) {
  if (!doc) return null;

  const serie = documentoSerie(doc);
  const numero = documentoNumero(doc);
  const label = [serie, numero].filter(Boolean).join("-");

  return label || null;
}

function notaIngresoIdentidad(item: RevisionContableItem) {
  const doc = documentoCompacto(item, "notaIngreso");
  return documentoIdentidad(doc);
}

function guiaIdentidad(item: RevisionContableItem) {
  const doc = documentoCompacto(item, "guia");
  return documentoIdentidad(doc);
}

function pagoBanco(item: RevisionContableItem) {
  const doc = documentoCompacto(item, "transferencia");
  return asText(nestedValue(doc, "banco"), "");
}

function pagoOperacion(item: RevisionContableItem) {
  const doc = documentoCompacto(item, "transferencia");
  return asText(
    nestedValue(doc, "numeroOperacion", "numero_operacion", "numero"),
    "",
  );
}

function periodoParts(item: RevisionContableItem) {
  const periodo = nestedRecord(filaFactura(item), "periodo");
  const anio = Number(
    pick(nestedValue(periodo, "anio", "year"), 0) ?? 0,
  );
  const mes = Number(
    pick(nestedValue(periodo, "mes", "month"), 0) ?? 0,
  );

  if (anio > 0 && mes >= 1 && mes <= 12) {
    return { anio, mes };
  }

  const raw = fechaEmisionRaw(item);
  if (!raw) return null;

  const text = String(raw);
  const match = text.match(/^(\d{4})-(\d{2})/);

  if (match) {
    return { anio: Number(match[1]), mes: Number(match[2]) };
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return { anio: date.getFullYear(), mes: date.getMonth() + 1 };
}

function periodoLabel(item: RevisionContableItem) {
  const periodo = periodoParts(item);
  if (!periodo) return "—";
  return `${String(periodo.mes).padStart(2, "0")}/${periodo.anio}`;
}

function revisionContableLabel(item: RevisionContableItem) {
  const revision = nestedRecord(filaFactura(item), "revisionContable");
  if (!revision) return "—";

  const raw = asText(
    nestedValue(revision, "estado", "status"),
    "—",
  );

  const normalized = raw.trim().toLowerCase();

  if (normalized === "pendiente") return "Pendiente";
  if (normalized === "revisado" || normalized === "revisada") return "Revisado";
  if (normalized === "validado" || normalized === "validada") return "Validado";
  if (normalized === "observado" || normalized === "observada") return "Observado";

  return raw;
}

function isFacturaRow(item: RevisionContableItem) {
  if (filaFactura(item)?.factura) return true;

  const tipo = String(
    pick(
      itemRecord(item).tipoDocumental,
      itemRecord(item).tipo_documental,
      "",
    ),
  ).toUpperCase();

  return tipo === "FACTURA";
}

function buildDetalleRevisionHref(
  expId: string | number,
  empresa: string,
  anio: string | number,
  mes: string | number,
  facturaDocId?: unknown,
  grupoId?: unknown,
) {
  const params = new URLSearchParams({
    empresa: String(empresa),
    anio: String(anio),
    mes: String(mes),
  });

  if (
    typeof facturaDocId === "string" ||
    typeof facturaDocId === "number"
  ) {
    params.set("facturaDocumentoId", String(facturaDocId));
  }

  if (typeof grupoId === "string" || typeof grupoId === "number") {
    params.set("grupoFacturaId", String(grupoId));
  }

  return `/revision-contable/${expId}/ver?${params.toString()}`;
}

function buildSearchText(item: RevisionContableItem) {
  return [
    facturaSerie(item),
    facturaNumero(item),
    principalTipo(item),
    principalNumero(item),
    centroCostoCodigo(item),
    proveedorNombre(item),
    proveedorRuc(item),
    fechaEmision(item),
    montoFactura(item),
    guiaIdentidad(item),
    notaIngresoIdentidad(item),
    pagoBanco(item),
    pagoOperacion(item),
    periodoLabel(item),
    revisionContableLabel(item),
  ]
    .filter(Boolean)
    .join(" ");
}

function DocumentoPreviewCell({
  archivoId,
  line1,
  line2,
  title,
  onPreview,
}: {
  archivoId: string | number | null;
  line1: string;
  line2?: string | null;
  title: string;
  onPreview: (archivoId: string | number, title: string) => void;
}) {
  const body = (
    <>
      <span className="block font-medium leading-tight">{line1}</span>
      {line2 ? (
        <span className="block text-xs leading-tight text-muted-foreground">
          {line2}
        </span>
      ) : null}
    </>
  );

  if (archivoId === null) {
    return (
      <span title="Documento sin archivo disponible para previsualizar">
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="inline-block rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Previsualizar ${title}`}
      onClick={() => onPreview(archivoId, title)}
    >
      {body}
    </button>
  );
}

export default function RevisionContablePage() {
  const contexto = getContexto();
  const workspaceEmpresa = normalizeEmpresa(contexto?.empresa);
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const today = new Date();
  const initialYear = String(Math.max(today.getFullYear(), 2026));

  const empresa = workspaceEmpresa;
  const [anio, setAnio] = useState(
    () => getBrowserQueryParam("anio") ?? initialYear,
  );
  const [mes, setMes] = useState(
    () => getBrowserQueryParam("mes") ?? String(today.getMonth() + 1),
  );
  const [busqueda, setBusqueda] = useState("");
  const [pageSize, setPageSize] = useState("50");
  const [page, setPage] = useState(1);
  const [previewDocumento, setPreviewDocumento] = useState<{
    archivoId: string | number;
    title: string;
  } | null>(null);

  useEffect(() => {
    const anioUrl = getBrowserQueryParam("anio");
    const mesUrl = getBrowserQueryParam("mes");

    if (anioUrl) setAnio(anioUrl);
    if (mesUrl) setMes(mesUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { data, isLoading, error, refetch, isFetching } =
    useRevisionContable(params);

  const rawItems = data?.items ?? [];
  const items = useMemo(
    () => rawItems.filter((item) => isFacturaRow(item)),
    [rawItems],
  );

  const filteredItems = useMemo(() => {
    const compactQuery = normalizeSearchValue(busqueda);

    if (!compactQuery) return items;

    return items.filter((item) =>
      normalizeSearchValue(buildSearchText(item)).includes(compactQuery),
    );
  }, [busqueda, items]);

  useEffect(() => {
    setPage(1);
  }, [anio, mes, busqueda, pageSize]);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / numericPageSize),
  );
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * numericPageSize;
  const pageItems = filteredItems.slice(start, start + numericPageSize);

  return (
    <main className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold">Revisión documental</h1>
        <p className="text-sm text-muted-foreground">
          Revisión contable de facturas por periodo de emisión.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">
            No se pudo cargar la bandeja documental. Verifica backend,
            workspace activo, año y mes.
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="h-5 w-5" />
                  Facturas del periodo
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Revisión contable por fecha de emisión de la factura.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  <span>Año</span>
                  <Select value={anio} onValueChange={setAnio}>
                    <SelectTrigger className="h-9 min-w-[110px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1 text-xs text-muted-foreground">
                  <span>Mes</span>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger className="h-9 min-w-[160px]">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <Button
                  className="h-9"
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <Search className="mr-1 h-4 w-4" />
                  Consultar
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(320px,1fr)_auto_150px]">
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar factura, OC/OS, proveedor, RUC, guía, nota de ingreso o pago..."
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCcw className="mr-1 h-4 w-4" />
                Actualizar
              </Button>

              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Mostrando {pageItems.length ? start + 1 : 0}-
              {Math.min(start + pageItems.length, filteredItems.length)} de{" "}
              {filteredItems.length}
            </div>
          </div>

          {isLoading ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle>Cargando bandeja contable...</EmptyTitle>
                <EmptyDescription>
                  Estamos consultando las facturas del periodo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left align-bottom">
                    <th className="min-w-[108px] px-3 py-2.5">Factura</th>
                    <th className="min-w-[88px] px-3 py-2.5">OC/OS</th>
                    <th className="min-w-[92px] px-3 py-2.5">
                      <span className="block leading-tight">Centro de</span>
                      <span className="block leading-tight">costo</span>
                    </th>
                    <th className="w-[180px] min-w-[160px] max-w-[180px] px-3 py-2.5">
                      Proveedor
                    </th>
                    <th className="min-w-[92px] px-3 py-2.5">
                      <span className="block leading-tight">Fecha de</span>
                      <span className="block leading-tight">emisión</span>
                    </th>
                    <th className="min-w-[100px] px-3 py-2.5">Importe</th>
                    <th className="min-w-[94px] px-3 py-2.5">Guía</th>
                    <th className="min-w-[108px] px-3 py-2.5">
                      <span className="block leading-tight">Nota de</span>
                      <span className="block leading-tight">ingreso</span>
                    </th>
                    <th className="min-w-[112px] px-3 py-2.5">Pago</th>
                    <th className="min-w-[82px] px-3 py-2.5">Periodo</th>
                    <th className="min-w-[92px] px-3 py-2.5">Revisión</th>
                    <th className="w-[54px] px-2 py-2.5 text-center">Ver</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map((item) => {
                    const expId = expedienteId(item);
                    const grupoId = grupoFacturaId(item);
                    const facturaDocId = facturaDocumentoId(item);

                    const href =
                      (typeof expId === "string" || typeof expId === "number") &&
                      expId !== ""
                        ? buildDetalleRevisionHref(
                            expId,
                            params.empresa,
                            params.anio,
                            params.mes,
                            facturaDocId,
                            grupoId,
                          )
                        : null;

                    const guiaDoc = documentoCompacto(item, "guia");
                    const notaIngresoDoc = documentoCompacto(
                      item,
                      "notaIngreso",
                    );
                    const guia = guiaIdentidad(item);
                    const notaIngreso = notaIngresoIdentidad(item);

                    const facturaArchivo = facturaArchivoId(item);
                    const principalArchivo = principalArchivoId(item);
                    const guiaArchivo = documentoArchivoId(guiaDoc);
                    const notaIngresoArchivo =
                      documentoArchivoId(notaIngresoDoc);

                    const facturaTitle = `Factura ${[
                      facturaSerie(item),
                      facturaNumero(item),
                    ]
                      .filter((value) => value && value !== "—")
                      .join("-")}`;

                    const principalTitle = `${principalTipo(item)} ${principalNumero(
                      item,
                    )}`;

                    const guiaTitle = guia ? `Guía ${guia}` : "Guía";
                    const notaIngresoTitle = notaIngreso
                      ? `Nota de ingreso ${notaIngreso}`
                      : "Nota de ingreso";

                    const openPreview = (
                      archivoId: string | number,
                      title: string,
                    ) => {
                      setPreviewDocumento({ archivoId, title });
                    };

                    return (
                      <tr
                        key={`${String(expId ?? "sin-exp")}-${String(
                          grupoId ?? facturaDocId ?? facturaNumero(item),
                        )}`}
                        className="border-b align-middle hover:bg-muted/30"
                      >
                        <td className="px-3 py-2.5">
                          <DocumentoPreviewCell
                            archivoId={facturaArchivo}
                            line1={facturaSerie(item)}
                            line2={facturaNumero(item)}
                            title={facturaTitle}
                            onPreview={openPreview}
                          />
                        </td>

                        <td className="px-3 py-2.5">
                          {principalTipo(item) !== "—" ||
                          principalNumero(item) !== "—" ? (
                            <DocumentoPreviewCell
                              archivoId={principalArchivo}
                              line1={principalTipo(item)}
                              line2={principalNumero(item)}
                              title={principalTitle}
                              onPreview={openPreview}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-medium">
                          {centroCostoCodigo(item)}
                        </td>

                        <td className="w-[180px] max-w-[180px] px-3 py-2.5">
                          <div
                            className="max-w-[165px] truncate font-medium"
                            title={proveedorNombre(item)}
                          >
                            {proveedorNombre(item)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {proveedorRuc(item)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5">
                          {fechaEmision(item)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                          {montoFactura(item)}
                        </td>

                        <td className="px-3 py-2.5">
                          {guia ? (
                            <DocumentoPreviewCell
                              archivoId={guiaArchivo}
                              line1={guia}
                              title={guiaTitle}
                              onPreview={openPreview}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          {notaIngreso ? (
                            <DocumentoPreviewCell
                              archivoId={notaIngresoArchivo}
                              line1={notaIngreso}
                              title={notaIngresoTitle}
                              onPreview={openPreview}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <PagoGrupoResumenCell grupoFacturaId={grupoId} />
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5">
                          {periodoLabel(item)}
                        </td>

                        <td className="px-3 py-2.5">
                          <span
                            className="text-xs font-medium"
                            title="Estado de revisión contable; solo lectura en este control"
                          >
                            {revisionContableLabel(item)}
                          </span>
                        </td>

                        <td className="px-2 py-2.5 text-center">
                          {href ? (
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                            >
                              <Link
                                href={href}
                                title="Ver detalle documental de la factura"
                                aria-label="Ver detalle documental de la factura"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filteredItems.length ? (
                <Empty className="py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="h-5 w-5" />
                    </EmptyMedia>
                    <EmptyTitle>Sin facturas para este periodo</EmptyTitle>
                    <EmptyDescription>
                      No se encontraron facturas con los criterios seleccionados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground">
              Página {safePage} de {totalPages} · {pageSize} registros por
              página
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage <= 1}
              >
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={safePage >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {previewDocumento ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${previewDocumento.title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewDocumento(null);
            }
          }}
        >
          <div className="relative w-full max-w-6xl rounded-2xl bg-background p-4 pt-12 shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2 z-20"
              aria-label="Cerrar vista previa"
              onClick={() => setPreviewDocumento(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            <PreviewDocumento
              archivoId={previewDocumento.archivoId}
              title={previewDocumento.title}
              className="max-h-[80vh]"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
