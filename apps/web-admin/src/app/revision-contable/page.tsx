"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

import { MetricCard } from "@/components/documental/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useCrearDocumentoAlerta } from "@/hooks/useAlertas";
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
    item.codigo_pr,
    item.codigoPr,
    item.codigo_op,
    item.codigoOp,
    item.codigo_centro_costo,
    item.codigoCentroCosto,
    null,
  );

  if (!codigo) return "-";

  const tipo = String(
    pick(item.tipo_expediente, item.tipoExpediente, "EXP"),
  ).toUpperCase();

  if (tipo.includes("CENTRO")) return `CC ${codigo}`;
  if (tipo.includes("PR") || tipo.includes("OP")) return `PR ${codigo}`;

  return String(codigo);
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

function montoTotal(item: RevisionContableItem) {
  const raw = pick(item.monto_total, item.montoTotal, 0);
  const value = Number(raw ?? 0);

  if (Number.isNaN(value)) {
    return `S/ ${raw}`;
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function alertasActivas(item: RevisionContableItem) {
  return Number(pick(item.alertas_activas, item.alertasActivas, 0) ?? 0);
}

function documentoNombre(item: RevisionContableItem) {
  const serie = pick(item.serie, "-");
  const numero = pick(item.numero, "-");
  return `${pick(item.tipo_documental, item.tipoDocumental, "DOCUMENTO")} ${serie} ${numero}`;
}

function principalDocumento(item: RevisionContableItem) {
  const principal = (item.documentoPrincipal ?? item.documento_principal ??
    null) as Record<string, unknown> | null;

  if (principal) {
    const tipo = getNestedText(principal, ["tipoDocumental", "tipo_documental", "tipo"], "Principal");
    const serie = getNestedText(principal, ["serie"], "");
    const numero = getNestedText(principal, ["numero"], "");
    const label = [tipo, serie, numero].filter(Boolean).join(" ").trim();
    return label || "Documento principal";
  }

  const tipo = String(pick(item.tipo_documental, item.tipoDocumental, "")).toUpperCase();

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
  const documentos = item.documentos ?? item.documentosAdjuntos ?? item.documentos_adjuntos;
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
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
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
    { label: "Guía", active: hasDocumentType(item, "GUIA_REMISION") || hasDocumentType(item, "GUIA") },
    { label: "NI", active: hasDocumentType(item, "NOTA_INGRESO") },
    { label: "Transf.", active: hasDocumentType(item, "PAGO_TRANSFERENCIA") || hasDocumentType(item, "TRANSFERENCIA") },
    { label: "Detrac.", active: hasDocumentType(item, "PAGO_DETRACCION") || hasDocumentType(item, "DETRACCION") },
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
  const today = new Date();
  const [empresa, setEmpresa] = useState(contexto?.empresa ?? "BBTI");
  const [anio, setAnio] = useState(String(today.getFullYear()));
  const [mes, setMes] = useState(String(today.getMonth() + 1));
  const [busqueda, setBusqueda] = useState("");
  const [filtroAlertas, setFiltroAlertas] = useState("todos");
  const [observandoId, setObservandoId] = useState<number | string | null>(null);

  useEffect(() => {
    if (contexto?.empresa) setEmpresa(contexto.empresa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = useMemo(
    () => ({
      empresa: empresa.trim().toUpperCase(),
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

  const totalFacturas = items.length;
  const totalAlertas = items.reduce(
    (sum, item) => sum + alertasActivas(item),
    0,
  );
  const totalMonto = items.reduce((sum, item) => {
    const raw = Number(pick(item.monto_total, item.montoTotal, 0));
    return sum + (Number.isNaN(raw) ? 0 : raw);
  }, 0);

  const fechaLimite = asText(data?.fechaLimite ?? data?.fecha_limite, "No definida");
  const diaCierre = asText(data?.diaCierreContable ?? data?.dia_cierre_contable, "-");

  async function crearObservacion(item: RevisionContableItem) {
    const id = documentoId(item);

    if (id === "-") return;

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
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bandeja contable</h1>
          <p className="text-sm text-muted-foreground">
            Una fila representa una factura del periodo. El expediente, PR/centro
            de costo, documento eje y adjuntos aparecen como contexto operativo.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className="mr-1 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periodo de revisión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Empresa
              </span>
              <Input
                value={empresa}
                onChange={(event) => setEmpresa(event.target.value)}
                placeholder="BBTI"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Año
              </span>
              <Input
                value={anio}
                onChange={(event) => setAnio(event.target.value)}
                placeholder="2026"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Mes
              </span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mes}
                onChange={(event) => setMes(event.target.value)}
              >
                {MESES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <Button
                className="w-full"
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <Search className="mr-1 h-4 w-4" />
                Consultar
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Día cierre: {diaCierre}</Badge>
            <Badge variant="outline">Fecha límite: {fechaLimite}</Badge>
            <Badge variant="outline">Alertas manuales, no automáticas</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Facturas del periodo"
          value={totalFacturas}
          description="Base de la bandeja contable."
          icon={<FileText className="h-5 w-5" />}
        />

        <MetricCard
          title="Visibles"
          value={filteredItems.length}
          description="Después de filtros locales."
          icon={<Filter className="h-5 w-5" />}
        />

        <MetricCard
          title="Monto del periodo"
          value={new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2,
          }).format(totalMonto)}
          description="Total calculado desde facturas listadas."
        />

        <MetricCard
          title="Alertas activas"
          value={totalAlertas}
          description="Observaciones manuales pendientes."
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={totalAlertas > 0 ? "warning" : "success"}
          href="/alertas"
        />
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            No se pudo cargar la bandeja contable. Verifica backend, empresa,
            año y mes.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de bandeja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar expediente, PR/CC, factura, proveedor, documento eje..."
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filtroAlertas}
              onChange={(event) => setFiltroAlertas(event.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="con_alertas">Con alertas</option>
              <option value="sin_alertas">Sin alertas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas del periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Cargando bandeja contable...</EmptyTitle>
                <EmptyDescription>Estamos consultando documentos del periodo.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="min-w-48 py-2">Expediente</th>
                    <th className="min-w-56">Factura</th>
                    <th className="min-w-56">Proveedor</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th className="min-w-56">Documento eje</th>
                    <th className="min-w-[580px]">Estado documental</th>
                    <th>Alertas</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const expId = expedienteId(item);
                    const docId = documentoId(item);
                    const alertas = alertasActivas(item);

                    return (
                      <tr
                        key={`${expId}-${docId}`}
                        className="border-b align-top"
                      >
                        <td className="py-3">
                          <div className="font-medium">
                            {item.correlativo ??
                              item.expediente_correlativo ??
                              item.expedienteCorrelativo ??
                              `Exp. ${expId}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {codigoExpediente(item)} · ID {expId}
                          </div>
                          <Badge className="mt-1" variant="outline">
                            {asText(
                              pick(item.tipo_expediente, item.tipoExpediente),
                              "EXP",
                            )}
                          </Badge>
                        </td>
                        <td>
                          <div className="font-medium">{documentoNombre(item)}</div>
                          <div className="text-xs text-muted-foreground">
                            ID documento: {docId}
                          </div>
                          <Badge className="mt-1" variant="secondary">
                            {documentoEstado(item)}
                          </Badge>
                        </td>
                        <td>
                          <div>{rucEmisor(item)}</div>
                          <div
                            className="max-w-64 truncate text-xs text-muted-foreground"
                            title={String(razonSocial(item))}
                          >
                            {razonSocial(item)}
                          </div>
                        </td>
                        <td>{fechaEmision(item)}</td>
                        <td className="font-medium">{montoTotal(item)}</td>
                        <td>
                          <div className="max-w-56 truncate font-medium" title={principalDocumento(item)}>
                            {principalDocumento(item)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            OC / OS / factura directa
                          </div>
                        </td>
                        <td>
                          <EstadoDocumentalHorizontal item={item} />
                        </td>
                        <td>
                          {alertas > 0 ? (
                            <Badge variant="destructive">
                              {alertas} activa{alertas === 1 ? "" : "s"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin alertas</Badge>
                          )}
                        </td>
                        <td className="space-x-2 text-right">
                          {expId !== "-" ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/expedientes/${expId}`}>
                                <Eye className="mr-1 h-4 w-4" />
                                Expediente
                              </Link>
                            </Button>
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
                <Empty className="mt-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="h-5 w-5" />
                    </EmptyMedia>
                    <EmptyTitle>Sin facturas para este filtro</EmptyTitle>
                    <EmptyDescription>
                      No se encontraron facturas confirmadas con el periodo y
                      filtros seleccionados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
