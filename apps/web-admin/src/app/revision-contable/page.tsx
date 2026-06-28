"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
import { useCrearDocumentoAlerta } from "@/hooks/useAlertas";
import { useRevisionContable } from "@/hooks/useRevisionContable";
import { getContexto } from "@/lib/auth-storage";
import type { RevisionContableItem } from "@/types/revision-contable";

const EMPRESAS = [
  { value: "BBTI", label: "BBTI - BBTI S.A.C." },
  { value: "BBTEC", label: "BBTEC - BB TECNOLOGÍA INDUSTRIAL S.A.C." },
  { value: "CIMA", label: "CIMA - CIMA ENERGY" },
  { value: "TARMA", label: "TARMA - TARMA" },
  { value: "HUANCA", label: "HUANCA - HUANCA" },
  { value: "KIMBIRI", label: "KIMBIRI - KIMBIRI" },
];

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

function fechaEmision(item: RevisionContableItem) {
  const value = pick(item.fecha_emision, item.fechaEmision, null);

  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
) {
  const params = new URLSearchParams({
    empresa: String(empresa),
    anio: String(anio),
    mes: String(mes),
  });

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
  const principal = principalDocumento(item) !== "No informado";

  const states = [
    { label: "Principal", active: principal },
    { label: "OC", active: hasDocumentType(item, "OC") },
    { label: "OS", active: hasDocumentType(item, "OS") },
    { label: "Factura", active: hasDocumentType(item, "FACTURA") },
    {
      label: "Guía",
      active:
        hasDocumentType(item, "GUIA_REMISION") || hasDocumentType(item, "GUIA"),
    },
    { label: "NI", active: hasDocumentType(item, "NOTA_INGRESO") },
    {
      label: "Transf.",
      active:
        hasDocumentType(item, "PAGO_TRANSFERENCIA") ||
        hasDocumentType(item, "TRANSFERENCIA"),
    },
    {
      label: "Detrac.",
      active:
        hasDocumentType(item, "PAGO_DETRACCION") ||
        hasDocumentType(item, "DETRACCION"),
    },
  ];

  return (
    <div className="flex min-w-[560px] flex-wrap gap-1.5">
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
    principalDocumento(item),
    rucEmisor(item),
    razonSocial(item),
    documentoEstado(item),
    alertasActivas(item) > 0 ? "alertas observado" : "sin alertas",
  ]
    .join(" ")
    .toLowerCase();
}

export default function RevisionContablePage() {
  const contexto = getContexto();
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const today = new Date();
  const initialYear = String(Math.max(today.getFullYear(), 2026));

  const [empresa, setEmpresa] = useState(
    () => normalizeEmpresa(getBrowserQueryParam("empresa")) || contexto?.empresa || "BBTI",
  );
  const [anio, setAnio] = useState(() => getBrowserQueryParam("anio") ?? initialYear);
  const [mes, setMes] = useState(
    () => getBrowserQueryParam("mes") ?? String(today.getMonth() + 1),
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtroAlertas, setFiltroAlertas] = useState("todos");
  const [pageSize, setPageSize] = useState("50");
  const [page, setPage] = useState(1);
  const [observandoId, setObservandoId] = useState<number | string | null>(null);

  useEffect(() => {
    const empresaUrl = getBrowserQueryParam("empresa");
    const anioUrl = getBrowserQueryParam("anio");
    const mesUrl = getBrowserQueryParam("mes");

    if (empresaUrl) setEmpresa(normalizeEmpresa(empresaUrl));
    else if (contexto?.empresa) setEmpresa(contexto.empresa);

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
      empresa: normalizeEmpresa(empresa),
      anio,
      mes,
    }),
    [empresa, anio, mes],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useRevisionContable(params);
  const crearAlerta = useCrearDocumentoAlerta();

  const items = data?.items ?? [];
  const filteredItems = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return items.filter((item) => {
      const matchesText = !q || buildSearchText(item).includes(q);
      const matchesAlertas =
        filtroAlertas === "todos" ||
        (filtroAlertas === "con_alertas" && alertasActivas(item) > 0) ||
        (filtroAlertas === "sin_alertas" && alertasActivas(item) === 0);

      return matchesText && matchesAlertas;
    });
  }, [busqueda, filtroAlertas, items]);

  useEffect(() => {
    setPage(1);
  }, [empresa, anio, mes, busqueda, filtroAlertas, pageSize]);

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

  async function crearObservacion(item: RevisionContableItem) {
    const id = documentoId(item);

    if (id === undefined || id === null || id === "-") return;
    
    setObservandoId(id);

    try {
      await crearAlerta.mutateAsync({
        documentoId: id,
        payload: {
          tipoAlerta: "DOCUMENTO_OBSERVADO",
          mensaje: `Contabilidad observó ${documentoNombre(item)} para revisión.`,
          metadata: {
            origen: "web-admin/revision-contable",
            empresa: params.empresa,
            anio: params.anio,
            mes: params.mes,
            regla: "alerta_manual",
          },
        },
      });
      await refetch();
    } finally {
      setObservandoId(null);
    }
  }

  return (
    <main className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisión contable</h1>
          <p className="text-sm text-muted-foreground">
            Bandeja operativa para validar documentos del periodo.
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
                Empresa
              </span>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  {EMPRESAS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <span>{totalFacturas} expediente{totalFacturas === 1 ? "" : "s"} con factura</span>
            <span>·</span>
            <span>{formatMoney(totalMonto)}</span>
            <span>·</span>
            <span>{totalAlertas} alertas activas</span>
            <span>·</span>
            <span>Día cierre: {diaCierre}</span>
            <span>·</span>
            <span>Fecha límite: {fechaLimite}</span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">
            No se pudo cargar la bandeja contable. Verifica backend, empresa,
            año y mes.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_180px_150px]">
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar expediente, PR/CC, factura, proveedor, documento eje..."
            />

            <Select value={filtroAlertas} onValueChange={setFiltroAlertas}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="con_alertas">Con alertas</SelectItem>
                <SelectItem value="sin_alertas">Sin alertas</SelectItem>
              </SelectContent>
            </Select>

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
              Expedientes del periodo contable
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="min-w-48 px-4 py-2.5">Expediente</th>
                    <th className="min-w-56 px-4 py-2.5">Factura</th>
                    <th className="min-w-56 px-4 py-2.5">Proveedor</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Monto</th>
                    <th className="min-w-56 px-4 py-2.5">Documento principal</th>
                    <th className="min-w-[580px] px-4 py-2.5">Estado documental</th>
                    <th className="px-4 py-2.5">Alertas</th>
                    <th className="px-4 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => {
                    const expId = expedienteId(item);
                    const docId = documentoId(item);
                    const alertas = alertasActivas(item);

                    const detalleRevisionHref =
                    (typeof expId === "string" || typeof expId === "number") &&
                    expId !== "-"
                      ? buildDetalleRevisionHref(
                          expId,
                          params.empresa,
                          params.anio,
                          params.mes,
                        )
                      : null;

                    return (
                      <tr
                        key={`${expId}-${docId}`}
                        className="border-b align-top hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            Expediente {codigoExpediente(item)}
                          </div>
                          <div
                            className="max-w-56 truncate text-xs text-muted-foreground"
                            title={descripcionExpediente(item)}
                          >
                            {descripcionExpediente(item)}
                          </div>
                          <Badge className="mt-1" variant="outline">
                            ID {expId}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{documentoNombre(item)}</div>
                          <div className="text-xs text-muted-foreground">
                            Factura ancla · ID {docId}
                          </div>
                          <Badge className="mt-1" variant="secondary">
                            {documentoEstado(item)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div>{rucEmisor(item)}</div>
                          <div
                            className="max-w-64 truncate text-xs text-muted-foreground"
                            title={String(razonSocial(item))}
                          >
                            {razonSocial(item)}
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
                            OC / OS / factura directa
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <EstadoDocumentalHorizontal item={item} />
                        </td>
                        <td className="px-4 py-3">
                          {alertas > 0 ? (
                            <Badge variant="destructive">
                              {alertas} activa{alertas === 1 ? "" : "s"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin alertas</Badge>
                          )}
                        </td>
                        <td className="space-x-2 px-4 py-3 text-right">
                          {detalleRevisionHref ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={detalleRevisionHref}>
                                <Eye className="mr-1 h-4 w-4" />
                                Ver
                              </Link>
                            </Button>{
    "success": false,
    "requestId": "352ef979-a9da-4bab-ac8e-939682816b8c",
    "timestamp": "2026-06-28T03:31:08.683Z",
    "path": "/api/v1/expedientes/41/alertas",
    "error": {
        "code": "NOT_FOUND",
        "message": "Cannot GET /api/v1/expedientes/41/alertas",
        "details": {
            "message": "Cannot GET /api/v1/expedientes/41/alertas",
            "error": "Not Found",
            "statusCode": 404
        }
    }
}
                          ) : null}

                          {docId !== "-" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => crearObservacion(item)}
                              disabled={
                                crearAlerta.isPending && observandoId === docId
                              }
                            >
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              Observar
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
                    <EmptyTitle>Sin expedientes para este periodo</EmptyTitle>
                    <EmptyDescription>
                      No se encontraron facturas confirmadas por fecha de emisión
                      para la empresa, año y mes seleccionados.
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