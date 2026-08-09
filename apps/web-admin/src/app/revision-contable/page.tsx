"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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


function formatDateOnlyLocal(value: unknown) {
  if (!value) return "-";

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildYearOptions() {
  const current = new Date().getFullYear();
  const end = Math.max(current, 2026);
  return Array.from({ length: end - 2026 + 1 }, (_, index) => String(2026 + index));
}

function buildMonthOptions(year: string) {
  const current = new Date();
  const selectedYear = Number(year);

  if (selectedYear === current.getFullYear()) {
    return MESES.slice(0, current.getMonth() + 1);
  }

  return MESES;
}

function monthLabel(month: string | number | undefined) {
  return MESES.find((item) => item.value === String(month))?.label ?? "-";
}

function getBrowserQueryParam(key: string) {
  if (typeof window === "undefined") return null;

  return new URLSearchParams(window.location.search).get(key);
}

function normalizeEmpresa(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function empresaLabel(value: string) {
  return value || "Workspace sin empresa activa";
}

function pick<T>(...values: T[]) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function asText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getNestedText(
  object: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback = "-",
) {
  if (!object) return fallback;

  for (const key of keys) {
    const value = object[key];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }

  return fallback;
}

function expedienteId(item: RevisionContableItem) {
  return pick(item.expediente_id, item.expedienteId, "-");
}

function documentoId(item: RevisionContableItem) {
  return pick(item.documento_id, item.documentoId, "-");
}

function documentoEstado(item: RevisionContableItem) {
  return pick(item.documento_estado, item.documentoEstado, "-");
}

function rucEmisor(item: RevisionContableItem) {
  return pick(item.ruc_emisor, item.rucEmisor, "-");
}

function razonSocial(item: RevisionContableItem) {
  return pick(item.razon_social_emisor, item.razonSocialEmisor, "-");
}

function codigoExpediente(item: RevisionContableItem) {
  const codigo = pick(
    item.codigo_expediente,
    item.codigoExpediente,
    item.codigo_pr,
    item.codigoPr,
    item.codigo_op,
    item.codigoOp,
    item.codigo_centro_costo,
    item.codigoCentroCosto,
    null,
  );

  return codigo ? String(codigo) : "-";
}

function descripcionExpediente(item: RevisionContableItem) {
  return asText(pick(item.descripcion, item.expediente_descripcion, item.expedienteDescripcion), "Sin descripción");
}

function fechaEmisionRaw(item: RevisionContableItem) {
  return pick(item.fecha_emision, item.fechaEmision, null);
}

function fechaEmision(item: RevisionContableItem) {
  return formatDateOnlyLocal(fechaEmisionRaw(item));
}

function periodoFactura(item: RevisionContableItem) {
  const value = fechaEmisionRaw(item);

  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    const text = String(value).slice(0, 7);
    return /^\d{4}-\d{2}$/.test(text) ? text : "-";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function isFacturaRow(item: RevisionContableItem) {
  const tipo = String(pick(item.tipo_documental, item.tipoDocumental, "")).toUpperCase();
  const nombre = documentoNombre(item).toUpperCase();

  return tipo === "FACTURA" || nombre.includes("FACTURA");
}

function montoNumber(item: RevisionContableItem) {
  const raw = Number(pick(item.monto_total, item.montoTotal, 0));
  return Number.isNaN(raw) ? 0 : raw;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function montoTotal(item: RevisionContableItem) {
  const raw = pick(item.monto_total, item.montoTotal, 0);
  const value = Number(raw ?? 0);

  if (Number.isNaN(value)) {
    return `S/ ${raw}`;
  }

  const moneda = String(pick(item.moneda, "SOLES") ?? "SOLES").toUpperCase();

  if (moneda.includes("DOLAR")) {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }

  return formatMoney(value);
}

function alertasActivas(item: RevisionContableItem) {
  return Number(pick(item.alertas_activas, item.alertasActivas, 0) ?? 0);
}

function documentoNombre(item: RevisionContableItem) {
  const serie = pick(item.serie, "-");
  const numero = pick(item.numero, "-");
  return `${pick(item.tipo_documental, item.tipoDocumental, "DOCUMENTO")} ${serie} ${numero}`;
}

function buildDetalleRevisionHref(
  expedienteId: string | number,
  empresa: string,
  anio: string | number,
  mes: string | number,
  facturaDocumentoId?: string | number | null,
) {
  const params = new URLSearchParams({
    empresa: String(empresa),
    anio: String(anio),
    mes: String(mes),
  });

  if (facturaDocumentoId !== null && facturaDocumentoId !== undefined) {
    params.set("facturaDocumentoId", String(facturaDocumentoId));
  }

  return `/revision-contable/${expedienteId}/ver?${params.toString()}`;
}

function principalDocumento(item: RevisionContableItem) {
  const principal = (item.documentoPrincipal ?? item.documento_principal ??
    null) as Record<string, unknown> | null;

  if (principal) {
    const tipo = getNestedText(
      principal,
      ["tipoDocumental", "tipo_documental", "tipo"],
      "Principal",
    );
    const serie = getNestedText(principal, ["serie"], "");
    const numero = getNestedText(principal, ["numero"], "");
    const label = [tipo, serie, numero].filter(Boolean).join(" ").trim();
    return label || "Documento principal";
  }

  const tipo = String(
    pick(item.tipo_documental, item.tipoDocumental, ""),
  ).toUpperCase();

  if (tipo === "FACTURA") return documentoNombre(item);

  return "No informado";
}

function includesType(value: unknown, tipo: string) {
  const normalized = tipo.toUpperCase();

  if (Array.isArray(value)) {
    return value.some((item) =>
      JSON.stringify(item ?? {}).toUpperCase().includes(normalized),
    );
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value).toUpperCase().includes(normalized);
  }

  return String(value ?? "").toUpperCase().includes(normalized);
}

function hasDocumentType(item: RevisionContableItem, tipo: string) {
  const estado = item.estadoDocumental ?? item.estado_documental;
  const documentos =
    item.documentos ?? item.documentosAdjuntos ?? item.documentos_adjuntos;
  const principal = item.documentoPrincipal ?? item.documento_principal;
  const currentTipo = pick(item.tipo_documental, item.tipoDocumental, "");

  if (String(currentTipo).toUpperCase() === tipo) return true;

  return (
    includesType(estado, tipo) ||
    includesType(documentos, tipo) ||
    includesType(principal, tipo)
  );
}

function EstadoChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500"
      }
      title={active ? `${label} presente` : `${label} no registrado`}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function EstadoDocumentalHorizontal({ item }: { item: RevisionContableItem }) {
  const hasRecepcion =
    hasDocumentType(item, "GUIA_REMISION") ||
    hasDocumentType(item, "GUIA") ||
    hasDocumentType(item, "NOTA_INGRESO");

  const hasTransferencia =
    hasDocumentType(item, "PAGO_TRANSFERENCIA") ||
    hasDocumentType(item, "TRANSFERENCIA");

  const hasDetraccion =
    hasDocumentType(item, "PAGO_DETRACCION") ||
    hasDocumentType(item, "DETRACCION");

  const states = [
    { label: "Factura", active: true },
    { label: "Recepción", active: hasRecepcion },
    { label: "Transferencia", active: hasTransferencia },
    { label: "Detracción", active: hasDetraccion },
  ];

  return (
    <div className="flex min-w-[420px] flex-wrap gap-1.5">
      {states.map((state) => (
        <EstadoChip key={state.label} {...state} />
      ))}
    </div>
  );
}

function buildSearchText(item: RevisionContableItem) {
  return [
    item.correlativo,
    item.expediente_correlativo,
    item.expedienteCorrelativo,
    item.codigo_expediente,
    item.codigoExpediente,
    item.descripcion,
    codigoExpediente(item),
    documentoNombre(item),
    periodoFactura(item),
    principalDocumento(item),
    rucEmisor(item),
    razonSocial(item),
    documentoEstado(item),
    alertasActivas(item) > 0 ? "alertas observado" : "sin alertas",
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function RevisionContablePage() {
  const contexto = getContexto();
  const workspaceEmpresa = normalizeEmpresa(contexto?.empresa);
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const today = new Date();
  const initialYear = String(Math.max(today.getFullYear(), 2026));

  const empresa = workspaceEmpresa;
  const [anio, setAnio] = useState(() => getBrowserQueryParam("anio") ?? initialYear);
  const [mes, setMes] = useState(
    () => getBrowserQueryParam("mes") ?? String(today.getMonth() + 1),
  );
  const [busqueda, setBusqueda] = useState("");
    const [pageSize, setPageSize] = useState("50");
  const [page, setPage] = useState(1);

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
    const q = busqueda.trim().toLowerCase();
    const compactQuery = normalizeSearchValue(busqueda);

    return items.filter((item) => {
      const searchText = buildSearchText(item);
      const matchesText =
        !q ||
        searchText.includes(q) ||
        normalizeSearchValue(searchText).includes(compactQuery);

      return matchesText;
    });
  }, [busqueda, items]);

  useEffect(() => {
    setPage(1);
  }, [anio, mes, busqueda, pageSize]);

  const totalFacturas = items.length;
  const totalAlertas = items.reduce(
    (sum, item) => sum + alertasActivas(item),
    0,
  );
  const totalMonto = items.reduce((sum, item) => sum + montoNumber(item), 0);
  const fechaLimite = asText(
    data?.fechaLimite ?? data?.fecha_limite,
    "No definida",
  );
  const diaCierre = asText(
    data?.diaCierreContable ?? data?.dia_cierre_contable,
    "-",
  );

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * numericPageSize;
  const pageItems = filteredItems.slice(start, start + numericPageSize);

  return (
    <main className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisión documental</h1>
          <p className="text-sm text-muted-foreground">
            Bandeja contable de solo lectura organizada por factura. El periodo se toma de la fecha de emisión de la factura; sin factura no existe fila contable.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className="mr-1 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid items-center gap-2 lg:grid-cols-[minmax(330px,1.35fr)_minmax(170px,0.55fr)_minmax(220px,0.75fr)_132px]">
            <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Empresa del workspace
              </span>
              <div
                className="flex h-9 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-sm font-medium text-foreground"
                title="Empresa definida por el workspace activo"
              >
                {empresaLabel(empresa)}
              </div>
            </div>

            <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Año
              </span>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger className="h-9 w-full">
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
            </div>

            <div className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Mes
              </span>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="h-9 w-full">
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
            </div>

            <Button
              className="h-9 w-full"
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <Search className="mr-1 h-4 w-4" />
              Consultar
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {monthLabel(mes)} {anio}
            </span>
            <span>·</span>
            <span>{totalFacturas} factura{totalFacturas === 1 ? "" : "s"} del periodo</span>
            <span>·</span>
            <span>{formatMoney(totalMonto)}</span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">
            No se pudo cargar la bandeja documental. Verifica backend,
            workspace activo, año y mes.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_150px]">
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar factura, proveedor, RUC, OC/OS o contexto operativo..."
            />

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
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5" />
              Facturas del periodo contable
            </div>
            <div className="text-xs text-muted-foreground">
              Mostrando {pageItems.length ? start + 1 : 0}-
              {Math.min(start + pageItems.length, filteredItems.length)} de {filteredItems.length}
            </div>
          </div>

          {isLoading ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle>Cargando bandeja contable...</EmptyTitle>
                <EmptyDescription>
                  Estamos consultando documentos del periodo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">

              <div className="m-3 rounded-xl border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                Unidad de listado contable: cada fila representa una factura. La OC, Guía, Nota de ingreso, Transferencia y Detracción no generan fila propia; se muestran como documentos relacionados de una factura existente.
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="min-w-52 px-4 py-2.5">Periodo / contexto</th>
                    <th className="min-w-56 px-4 py-2.5">Factura</th>
                    <th className="min-w-56 px-4 py-2.5">Proveedor</th>
                    <th className="px-4 py-2.5">Fecha de emisión</th>
                    <th className="px-4 py-2.5">Monto</th>
                    <th className="min-w-56 px-4 py-2.5">Documento principal</th>
                    <th className="min-w-[430px] px-4 py-2.5">Estado documental</th>
                    <th className="px-4 py-2.5 text-right">Acción solo lectura</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const expId = expedienteId(item);
                    const docId = documentoId(item);

                    const detalleRevisionHref =
                    (typeof expId === "string" || typeof expId === "number") &&
                    expId !== "-"
                      ? buildDetalleRevisionHref(
                          expId,
                          params.empresa,
                          params.anio,
                          params.mes,
                          docId,
                        )
                      : null;

                    return (
                      <tr
                        key={`${expId}-${docId}`}
                        className="border-b align-top hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">Periodo {periodoFactura(item)}</div>
                          <div className="text-xs text-muted-foreground">
                            Centro de costo {codigoExpediente(item)}
                          </div>
                          <div
                            className="max-w-56 truncate text-xs text-muted-foreground"
                            title={descripcionExpediente(item)}
                          >
                            {descripcionExpediente(item)}
                          </div>
                          <Badge className="mt-1" variant="outline">
                            Expediente {expId}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{documentoNombre(item)}</div>
                          <div className="text-xs text-muted-foreground">
                            Factura ancla · ID {docId} · Fecha emisión {fechaEmision(item)}
                          </div>
                          <Badge className="mt-1" variant="secondary">
                            {documentoEstado(item)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="max-w-[220px] truncate font-medium"
                            title={String(razonSocial(item))}
                          >
                            {razonSocial(item)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            RUC {rucEmisor(item)}
                          </div>
                        </td>
                        <td className="px-4 py-3">{fechaEmision(item)}</td>
                        <td className="px-4 py-3 font-medium">{montoTotal(item)}</td>
                        <td className="px-4 py-3">
                          <div
                            className="max-w-56 truncate font-medium"
                            title={principalDocumento(item)}
                          >
                            {principalDocumento(item)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            OC / OS relacionada / factura directa
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <EstadoDocumentalHorizontal item={item} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {detalleRevisionHref ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={detalleRevisionHref}>
                                <Eye className="mr-1 h-4 w-4" />
                                Ver grupo documental
                              </Link>
                            </Button>
                          ) : null}
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
                    <EmptyTitle>Sin contextos operativos para este periodo</EmptyTitle>
                    <EmptyDescription>
                      No se encontraron facturas confirmadas por fecha de emisión
                      para el workspace activo, año y mes seleccionados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground">
              Página {safePage} de {totalPages} · {pageSize} registros por página
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
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
