"use client";

import Link from "next/link";
import { Eye, FilePlus2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { useExpedientes } from "@/hooks/useExpedientes";
import { getContexto } from "@/lib/auth-storage";
import { buscarExpedientes } from "@/services/expedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

type ExpedientesApiResponse = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: Expediente[];
};

const PAGE_SIZE = 8;

const EMPRESA_LABELS: Record<string, string> = {
  BBTI: "BBTI - BBTI S.A.C.",
  BBTEC: "BBTEC - BB TECNOLOGÍA INDUSTRIAL S.A.C.",
  CIMA: "CIMA - CIMA ENERGY",
  HUANCA: "HUANCA - HUANCA",
  TARMA: "TARMA - TARMA",
  KIMBIRI: "KIMBIRI - KIMBIRI",
};

function empresaLabel(value: string) {
  return EMPRESA_LABELS[value] ?? value;
}


function normalizeExpedientes(input: unknown): Expediente[] {
  if (Array.isArray(input)) return input as Expediente[];

  if (
    input &&
    typeof input === "object" &&
    "data" in input &&
    Array.isArray((input as ExpedientesApiResponse).data)
  ) {
    return (input as ExpedientesApiResponse).data ?? [];
  }

  return [];
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function field<T = unknown>(source: unknown, key: string): T | undefined {
  if (!source || typeof source !== "object") return undefined;
  return (source as unknown as Record<string, T | undefined>)[key];
}

function listField<T = unknown>(source: unknown, key: string): T[] {
  const value = field<unknown>(source, key);
  return Array.isArray(value) ? (value as T[]) : [];
}

function getEmpresa(expediente: Expediente) {
  return text(
    field(expediente, "empresa_codigo") ?? field(expediente, "empresaCodigo"),
    "-",
  );
}

function getCodigoExpediente(expediente: Expediente) {
  return text(
    field(expediente, "codigo_expediente") ?? field(expediente, "codigoExpediente"),
    "",
  );
}

function getClienteNombre(expediente: Expediente) {
  return text(
    field(expediente, "cliente_nombre") ??
      field(expediente, "clienteNombre") ??
      field(expediente, "cliente_abreviatura") ??
      field(expediente, "clienteAbreviatura") ??
      getEmpresa(expediente),
    "-",
  );
}

function getDescripcion(expediente: Expediente) {
  return text(field(expediente, "descripcion"), "Pendiente de descripción");
}

function getEstado(expediente: Expediente) {
  return text(field(expediente, "estado"), "abierto");
}

function getPrincipal(expediente: Expediente): ExpedienteDocumento | null {
  const documentoPrincipal = field<ExpedienteDocumento | null>(
    expediente,
    "documentoPrincipal",
  );

  if (documentoPrincipal) return documentoPrincipal;

  const documentosPrincipales = field<ExpedienteDocumento[]>(
    expediente,
    "documentosPrincipales",
  );
  const documentos = field<ExpedienteDocumento[]>(expediente, "documentos");
  const documentosAdjuntos = field<ExpedienteDocumento[]>(
    expediente,
    "documentosAdjuntos",
  );

  return (
    documentosPrincipales?.[0] ??
    documentos?.find((documento) => Boolean(field(documento, "esPrincipal"))) ??
    documentosAdjuntos?.find((documento) => Boolean(field(documento, "esPrincipal"))) ??
    null
  );
}

function getAllDocuments(expediente: Expediente) {
  const documentos = listField<ExpedienteDocumento>(expediente, "documentos");
  const documentosLista = listField<ExpedienteDocumento>(expediente, "documentosLista");
  const documentosPrincipales =
    listField<ExpedienteDocumento>(expediente, "documentosPrincipales");
  const documentoPrincipal = field<ExpedienteDocumento | null>(
    expediente,
    "documentoPrincipal",
  );
  const documentosAdjuntos =
    listField<ExpedienteDocumento>(expediente, "documentosAdjuntos");

  const all = [
    ...documentos,
    ...documentosLista,
    ...documentosPrincipales,
    ...(documentoPrincipal ? [documentoPrincipal] : []),
    ...documentosAdjuntos,
  ];

  const seen = new Set<string>();
  return all.filter((documento, index) => {
    const doc = documento as unknown as Record<string, unknown>;
    const key = String(
      doc.documentoId ??
        doc.documento_id ??
        doc.claveDocumental ??
        doc.clave_documental ??
        `${doc.tipoDocumental ?? doc.tipo_documental ?? "DOC"}-${index}`,
    );

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasDocument(expediente: Expediente, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());

  return getAllDocuments(expediente).some((documento) => {
    const doc = documento as unknown as Record<string, unknown>;
    const tipo = String(doc.tipoDocumental ?? doc.tipo_documental ?? "").toUpperCase();
    const relacion = String(doc.tipoRelacion ?? doc.tipo_relacion ?? "").toUpperCase();

    return normalizedAliases.some(
      (alias) => tipo.includes(alias) || relacion.includes(alias),
    );
  });
}

function principalLabel(expediente: Expediente) {
  const principal = getPrincipal(expediente);

  if (!principal) return "Sin principal";

  const doc = principal as unknown as Record<string, unknown>;
  const tipo = text(
    doc.tipoDocumental ?? doc.tipo_documental ?? doc.tipoRelacion ?? doc.tipo_relacion,
    "DOC",
  )
    .replace("PRINCIPAL_", "")
    .replace("ADJUNTO_", "")
    .replaceAll("_", " ")
    .toUpperCase();

  const serie = text(doc.serie);
  const numero = text(doc.numero);
  const labelNumero = [serie, numero].filter(Boolean).join("-");

  return labelNumero ? `${tipo} ${labelNumero}` : tipo;
}

function principalDescription(expediente: Expediente) {
  const principal = getPrincipal(expediente);
  if (!principal) return "—";

  const doc = principal as unknown as Record<string, unknown>;
  const proveedor = text(
    doc.razonSocialEmisor ?? doc.razon_social_emisor ?? doc.proveedor ?? doc.razonSocial,
  );
  const fecha = text(doc.fechaEmision ?? doc.fecha_emision);
  const monto = text(doc.montoTotal ?? doc.monto_total);

  return [proveedor, fecha, monto ? `Monto ${monto}` : ""].filter(Boolean).join(" · ") || "—";
}

function documentCount(expediente: Expediente) {
  return getAllDocuments(expediente).length;
}

function AdjuntosBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={active ? "gap-1" : "gap-1 text-muted-foreground"}
      title={active ? `${label} presente` : `${label} pendiente`}
    >
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function ExpedienteCell({ expediente }: { expediente: Expediente }) {
  const codigo = getCodigoExpediente(expediente);
  const descripcion = getDescripcion(expediente);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">
          {codigo || "SIN EXPEDIENTE"}
        </span>
        <Badge variant="outline">{getEmpresa(expediente)}</Badge>
      </div>
      <div className="line-clamp-2 text-xs text-muted-foreground">
        {descripcion}
      </div>
    </div>
  );
}

function ActionsCell({ expediente }: { expediente: Expediente }) {
  return (
    <div className="flex justify-end gap-1">
      <Button asChild size="icon" variant="outline" title="Ver expediente">
        <Link href={`/finanzas/${expediente.id}/ver`} aria-label="Ver expediente">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="icon" variant="outline" title="Adjuntar documento">
        <Link href={`/finanzas/${expediente.id}/editar?accion=adjuntar`} aria-label="Adjuntar documento">
          <FilePlus2 className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalRows === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.filter(
    (item) =>
      item === 1 ||
      item === totalPages ||
      Math.abs(item - page) <= 1,
  );

  return (
    <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        Mostrando {start} a {end} de {totalRows} resultados
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>

        {visiblePages.map((item, index) => {
          const previous = visiblePages[index - 1];
          const showEllipsis = previous !== undefined && item - previous > 1;

          return (
            <div key={item} className="flex items-center gap-1">
              {showEllipsis ? <span className="px-2">...</span> : null}
              <Button
                type="button"
                variant={item === page ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export function FinanzasBandeja() {
  const [workspaceEmpresa, setWorkspaceEmpresa] = useState("BBTI");
  const [empresa, setEmpresa] = useState("BBTI");
  const [estado, setEstado] = useState("abierto");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [remoteRows, setRemoteRows] = useState<Expediente[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const contexto = getContexto();
    const empresaContexto = contexto?.empresa?.trim() || "BBTI";
    setWorkspaceEmpresa(empresaContexto);
    setEmpresa(empresaContexto);
  }, []);

  const { data, isLoading, error } = useExpedientes({
    empresa,
    estado,
    limit: 50,
    offset: 0,
  });

  const expedientes = useMemo(() => normalizeExpedientes(data), [data]);

  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();
    const sourceRows = searchMode ? remoteRows : expedientes;
    const scopedRows = sourceRows.filter((expediente) => getEmpresa(expediente) === empresa);
    const withPrincipal = scopedRows.filter((expediente) => Boolean(getPrincipal(expediente)));

    if (searchMode) return withPrincipal;
    if (!value) return withPrincipal;

    return withPrincipal.filter((expediente) =>
      [
        getEmpresa(expediente),
        getClienteNombre(expediente),
        getCodigoExpediente(expediente),
        getDescripcion(expediente),
        principalLabel(expediente),
        principalDescription(expediente),
        getEstado(expediente),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [empresa, expedientes, remoteRows, search, searchMode]);

  async function ejecutarBusqueda() {
    const value = search.trim();

    if (value.length < 2) {
      setSearchMode(false);
      setRemoteRows([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await buscarExpedientes(value, 50);
      setRemoteRows(results as unknown as Expediente[]);
      setSearchMode(true);
      setPage(1);
    } catch {
      setSearchError("No se pudo buscar expedientes o documentos.");
    } finally {
      setIsSearching(false);
    }
  }

  function limpiarBusqueda() {
    setSearch("");
    setRemoteRows([]);
    setSearchMode(false);
    setSearchError(null);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [currentPage, rows]);

  useEffect(() => {
    setPage(1);
  }, [empresa, estado, search]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchMode(false);
      setRemoteRows([]);
      setSearchError(null);
    }
  }, [search]);

  if (isLoading) {
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

  if (error) {
    return <div className="p-6 text-red-600">Error cargando bandeja de finanzas.</div>;
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            Expedientes con documento principal listos para adjuntar pagos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Filtro</CardTitle>
          <form
            className="grid gap-2 md:grid-cols-[140px_160px_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void ejecutarBusqueda();
            }}
          >
            <div
              className="flex h-8 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-sm font-medium text-foreground"
              title="Empresa definida por el workspace activo"
            >
              {empresaLabel(workspaceEmpresa)}
            </div>

            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              disabled={searchMode}
            >
              <option value="abierto">Abierto</option>
              <option value="en_proceso">En proceso</option>
              <option value="observado">Observado</option>
              <option value="completo">Completo</option>
              <option value="cerrado">Cerrado</option>
            </select>

            <Input
              placeholder="Buscar OC, expediente, factura, transferencia, detracción, RUC o proveedor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSearching}>
                <Search className="h-4 w-4" />
                {isSearching ? "Buscando" : "Buscar"}
              </Button>
              {searchMode ? (
                <Button type="button" size="sm" variant="outline" onClick={limpiarBusqueda}>
                  <X className="h-4 w-4" />
                  Limpiar
                </Button>
              ) : null}
            </div>
          </form>

          {searchMode ? (
            <p className="text-xs text-muted-foreground">
              Búsqueda global activa: {rows.length} expediente(s) con principal. La búsqueda se mantiene limitada a la empresa del workspace activo.
            </p>
          ) : null}
          {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de finanzas</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">📦</EmptyMedia>
                <EmptyTitle>Sin expedientes para finanzas</EmptyTitle>
                <EmptyDescription>
                  {searchMode
                    ? "No se encontraron expedientes con principal para esa búsqueda."
                    : "No hay expedientes con documento principal para los filtros seleccionados."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">Expediente</th>
                      <th>Documento principal</th>
                      <th>Pagos</th>
                      <th>Estado finanzas</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRows.map((expediente) => {
                      const tieneTransferencia = hasDocument(expediente, [
                        "PAGO_TRANSFERENCIA",
                        "TRANSFERENCIA",
                        "ADJUNTO_TRANSFERENCIA",
                      ]);
                      const tieneDetraccion = hasDocument(expediente, [
                        "PAGO_DETRACCION",
                        "DETRACCION",
                        "DETRACCIÓN",
                        "ADJUNTO_DETRACCION",
                      ]);

                      return (
                        <tr key={expediente.id} className="border-b align-top hover:bg-muted/30">
                          <td className="w-[30%] py-3 pr-4">
                            <ExpedienteCell expediente={expediente} />
                          </td>
                          <td className="w-[30%] py-3 pr-4">
                            <div className="font-medium">{principalLabel(expediente)}</div>
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {principalDescription(expediente)}
                            </div>
                          </td>
                          <td className="w-[22%] py-3 pr-4">
                            <div className="flex flex-wrap gap-1.5">
                              <AdjuntosBadge label="Transferencia" active={tieneTransferencia} />
                              <AdjuntosBadge label="Detracción" active={tieneDetraccion} />
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {documentCount(expediente)} documento(s)
                            </div>
                          </td>
                          <td className="w-[10%] py-3 pr-4">
                            <Badge variant="secondary">{getEstado(expediente)}</Badge>
                          </td>
                          <td className="w-[8%] py-3 text-right">
                            <ActionsCell expediente={expediente} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={currentPage}
                totalPages={totalPages}
                totalRows={rows.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
