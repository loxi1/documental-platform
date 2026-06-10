"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Clipboard,
  FileText,
  Filter,
  Hash,
  RefreshCcw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { MetricCard, MetricCardSkeleton } from "@/components/documental/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentos } from "@/hooks/useDocumentos";
import type { Documento } from "@/types/documento";

const PAGE_SIZE = 20;

function getTipo(documento: Documento) {
  return documento.tipo_documental ?? documento.tipoDocumental ?? "-";
}

function getEmpresa(documento: Documento) {
  return documento.cliente_abreviatura ?? documento.clienteAbreviatura ?? "-";
}

function getRuc(documento: Documento) {
  return documento.ruc_emisor ?? documento.rucEmisor ?? "-";
}

function getProveedor(documento: Documento) {
  return documento.razon_social_emisor ?? documento.razonSocialEmisor ?? "Sin razón social";
}

function getClave(documento: Documento) {
  return documento.clave_documental ?? documento.claveDocumental ?? "-";
}

function getAnio(documento: Documento) {
  return documento.periodo_anio ?? documento.anio ?? "-";
}

function getMes(documento: Documento) {
  return documento.periodo_mes ?? documento.mes ?? "-";
}

function getFecha(documento: Documento) {
  return documento.fecha_emision ?? documento.fechaEmision ?? documento.creado_en ?? documento.creadoEn ?? "-";
}

function getEstado(documento: Documento) {
  return documento.estado ?? "activo";
}

function getMonto(documento: Documento) {
  return documento.monto_total ?? documento.montoTotal ?? null;
}

function getExpedienteId(documento: Documento) {
  return documento.expediente_id ?? documento.expedienteId ?? null;
}

function getExpedienteCorrelativo(documento: Documento) {
  return documento.expediente_correlativo ?? documento.expedienteCorrelativo ?? null;
}

function getAlertasActivas(documento: Documento) {
  const value = documento.alertas_activas ?? documento.alertasActivas ?? 0;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);

  if (Number.isNaN(numeric)) return String(value);

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function matchesSearch(documento: Documento, search: string) {
  if (!search.trim()) return true;

  const normalized = search.trim().toLowerCase();
  const fields = [
    documento.id,
    getTipo(documento),
    getEmpresa(documento),
    getRuc(documento),
    getProveedor(documento),
    documento.serie,
    documento.numero,
    getClave(documento),
    getEstado(documento),
    getExpedienteCorrelativo(documento),
  ];

  return fields.some((field) => String(field ?? "").toLowerCase().includes(normalized));
}

function matchesFilters(documento: Documento, filters: { empresa: string; tipo: string; estado: string; search: string }) {
  const empresaOk = !filters.empresa || getEmpresa(documento).toLowerCase().includes(filters.empresa.toLowerCase());
  const tipoOk = !filters.tipo || getTipo(documento).toLowerCase().includes(filters.tipo.toLowerCase());
  const estadoOk = !filters.estado || getEstado(documento).toLowerCase().includes(filters.estado.toLowerCase());

  return empresaOk && tipoOk && estadoOk && matchesSearch(documento, filters.search);
}

function isClaveNueva(documento: Documento) {
  const clave = getClave(documento);
  const empresa = getEmpresa(documento);

  return empresa !== "-" && clave.startsWith(`${empresa}|`);
}

export default function DocumentosPage() {
  const [empresa, setEmpresa] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      empresa: empresa.trim().toUpperCase(),
      tipo: tipo.trim().toUpperCase(),
      estado: estado.trim().toLowerCase(),
      search: search.trim(),
    }),
    [empresa, tipo, estado, offset, search],
  );

  const { data, isLoading, error, refetch, isFetching } = useDocumentos(params);

  const documentos = data?.data ?? [];
  const documentosFiltrados = useMemo(
    () => documentos.filter((documento) => matchesFilters(documento, { empresa, tipo, estado, search })),
    [documentos, empresa, tipo, estado, search],
  );

  const total = data?.total ?? 0;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const kpis = useMemo(() => {
    const confirmados = documentosFiltrados.filter((documento) => getEstado(documento).toLowerCase().includes("confirmado")).length;
    const activos = documentosFiltrados.filter((documento) => getEstado(documento).toLowerCase().includes("activo")).length;
    const facturas = documentosFiltrados.filter((documento) => getTipo(documento).toUpperCase() === "FACTURA").length;
    const conClaveNueva = documentosFiltrados.filter(isClaveNueva).length;

    return { confirmados, activos, facturas, conClaveNueva };
  }, [documentosFiltrados]);

  async function copyClave(documento: Documento) {
    const clave = getClave(documento);
    if (!clave || clave === "-") return;

    await navigator.clipboard.writeText(clave);
    setCopiedId(documento.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Buscador documental global. Por ahora usa GET /documentos; después podrá cambiar a /documentos/listado enriquecido con expediente y alertas.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className="mr-1 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total backend"
            value={total}
            description="Documentos registrados en el endpoint actual."
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            title="En esta página"
            value={documentosFiltrados.length}
            description="Resultados visibles después de filtros locales."
            icon={<Filter className="h-5 w-5" />}
          />
          <MetricCard
            title="Facturas"
            value={kpis.facturas}
            description="Facturas visibles en la página actual."
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            title="Clave nueva"
            value={kpis.conClaveNueva}
            description="Claves con formato CLIENTE|TIPO|RUC|SERIE|NUMERO."
            icon={<Hash className="h-5 w-5" />}
            accent={kpis.conClaveNueva === documentosFiltrados.length && documentosFiltrados.length > 0 ? "success" : "warning"}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Empresa</span>
              <Input value={empresa} onChange={(event) => setEmpresa(event.target.value)} placeholder="BBTI / TARMA" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
              <Input value={tipo} onChange={(event) => setTipo(event.target.value)} placeholder="FACTURA" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
              <Input value={estado} onChange={(event) => setEstado(event.target.value)} placeholder="activo" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Búsqueda libre</span>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="F001-237812, RUC, proveedor, clave..." />
            </label>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            No se pudo cargar el listado de documentos. Verifica que el backend responda en GET /documentos.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Listado documental</CardTitle>
            <p className="text-xs text-muted-foreground">
              Página {pageNumber} · límite {data?.limit ?? PAGE_SIZE} · offset {data?.offset ?? offset}
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!canPrev || isFetching} onClick={() => setOffset((value) => Math.max(value - PAGE_SIZE, 0))}>
              Anterior
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!canNext || isFetching} onClick={() => setOffset((value) => value + PAGE_SIZE)}>
              Siguiente
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-11/12" />
              <Skeleton className="h-6 w-10/12" />
            </div>
          ) : documentosFiltrados.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">ID</th>
                    <th>Tipo</th>
                    <th>Empresa</th>
                    <th>Proveedor</th>
                    <th>RUC</th>
                    <th>Serie</th>
                    <th>Número</th>
                    <th>Periodo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Clave</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((documento) => {
                    const expedienteId = getExpedienteId(documento);
                    const alertasActivas = getAlertasActivas(documento);
                    const clave = getClave(documento);

                    return (
                      <tr key={documento.id} className="border-b align-top">
                        <td className="py-2 font-medium">{documento.id}</td>
                        <td>
                          <Badge variant="secondary">{getTipo(documento)}</Badge>
                        </td>
                        <td>{getEmpresa(documento)}</td>
                        <td className="max-w-72 truncate" title={getProveedor(documento)}>
                          {getProveedor(documento)}
                        </td>
                        <td className="font-mono text-xs">{getRuc(documento)}</td>
                        <td>{documento.serie ?? "-"}</td>
                        <td>{documento.numero ?? "-"}</td>
                        <td>
                          {getAnio(documento)}/{getMes(documento)}
                        </td>
                        <td>{formatMoney(getMonto(documento))}</td>
                        <td>
                          <Badge variant="outline">{getEstado(documento)}</Badge>
                        </td>
                        <td className="max-w-80">
                          <div className="flex max-w-80 items-center gap-2">
                            <span className="truncate font-mono text-xs" title={clave}>
                              {clave}
                            </span>
                            {!isClaveNueva(documento) ? (
                              <Badge variant="outline" className="text-amber-600">
                                histórica
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/documentos/${documento.id}`}>Detalle</Link>
                            </Button>

                            {expedienteId ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/expedientes/${expedienteId}`}>Expediente</Link>
                              </Button>
                            ) : null}

                            <Button type="button" size="sm" variant="outline" onClick={() => copyClave(documento)}>
                              <Clipboard className="mr-1 h-3.5 w-3.5" />
                              {copiedId === documento.id ? "Copiada" : "Clave"}
                            </Button>

                            {alertasActivas > 0 ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/alertas?documentoId=${documento.id}`}>Alertas</Link>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Sin documentos visibles</EmptyTitle>
                <EmptyDescription>
                  Ajusta los filtros o cambia de página para encontrar documentos registrados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
