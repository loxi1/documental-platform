"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Eye, Plus, Search, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getContexto } from "@/lib/auth-storage";
import {
  obtenerBandejaCompras,
  type BandejaComprasFila,
} from "@/services/expedientes";

const PAGE_SIZE = 8;

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function principalTipo(fila: BandejaComprasFila) {
  return text(fila.principal.tipoDocumental ?? fila.principal.tipo, "OC/OS").toUpperCase();
}

function principalLabel(fila: BandejaComprasFila) {
  return [principalTipo(fila), text(fila.principal.numero, "")].filter(Boolean).join(" ");
}

function proveedorLabel(fila: BandejaComprasFila) {
  return text(fila.principal.proveedorNombre ?? fila.principal.proveedor);
}

function facturaLabel(factura: BandejaComprasFila["facturas"][number]) {
  return [text(factura.serie, ""), text(factura.numero, "")].filter(Boolean).join("-") || "Factura";
}

function LoadingRows() {
  return <>{Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b">
      <td className="py-4 pr-4"><Skeleton className="h-5 w-28" /></td>
      <td className="py-4 pr-4"><Skeleton className="h-10 w-48" /></td>
      <td className="py-4 pr-4"><Skeleton className="h-10 w-48" /></td>
      <td className="py-4 pr-4"><Skeleton className="h-7 w-32" /></td>
      <td className="py-4 pr-4"><Skeleton className="h-6 w-20" /></td>
      <td className="py-4 text-right"><Skeleton className="ml-auto h-8 w-20" /></td>
    </tr>
  ))}</>;
}

export function ComprasBandeja() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [empresa, setEmpresa] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [incluirPendientesValidacion, setIncluirPendientesValidacion] = useState(false);

  useEffect(() => {
    const contexto = getContexto();
    setEmpresa(contexto?.empresa?.trim() ?? "");
  }, []);

  const offset = page * PAGE_SIZE;
  const bandeja = useQuery({
    queryKey: ["compras-bandeja-ocos", empresa, q, PAGE_SIZE, offset, incluirPendientesValidacion],
    queryFn: () => obtenerBandejaCompras({ q, limit: PAGE_SIZE, offset, incluirPendientesValidacion }),
    enabled: Boolean(empresa.trim() && q.trim()),
  });

  const rows = bandeja.data?.data ?? [];
  const total = Number(bandeja.data?.total ?? 0);
  const limit = Number(bandeja.data?.limit ?? PAGE_SIZE) || PAGE_SIZE;
  const apiOffset = Number(bandeja.data?.offset ?? offset);
  const start = total ? apiOffset + 1 : 0;
  const end = Math.min(apiOffset + rows.length, total);
  const currentPage = page + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const returnTo = useMemo(() => pathname, [pathname]);

  return (
    <main className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Compras</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Órdenes de compra / servicio</h1>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Bandeja de Compras</CardTitle>
              {q.trim() ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {bandeja.isLoading
                    ? "Cargando resultados..."
                    : `Mostrando ${start} a ${end} de ${total} resultados`}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Busca OC/OS, centro de costo, factura, RUC o proveedor.
                </p>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start lg:w-auto">
              <div className="min-w-0 flex-1 lg:w-[430px]">
                <div className="flex gap-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = search.trim();
                        if (value.length >= 3) {
                          setQ(value);
                          setPage(0);
                        }
                      }
                    }}
                    placeholder="Buscar documento, centro de costo, factura, RUC o proveedor..."
                  />
                  {search || q ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setQ("");
                        setPage(0);
                      }}
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {search.trim().length > 0 && search.trim().length < 3 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ingrese al menos 3 caracteres para buscar.
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={() => {
                  const value = search.trim();
                  if (value.length >= 3) {
                    setQ(value);
                    setPage(0);
                  }
                }}
                disabled={search.trim().length < 3 || bandeja.isFetching}
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>

              <label className="flex min-h-10 items-center gap-2 whitespace-nowrap text-sm">
                <input type="checkbox" checked={incluirPendientesValidacion} onChange={(event) => {
                  setIncluirPendientesValidacion(event.target.checked);
                  setPage(0);
                }} />
                Mostrar pendientes de validación
              </label>

              <Button asChild>
                <Link href="/compras/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar OC/OS
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bandeja.isError ? (
            <div className="m-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
              No se pudo cargar GET /expedientes/bandeja-compras.
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left align-bottom">
                  <th className="px-4 py-2.5">Documento</th>
                  <th className="px-4 py-2.5">Centro de costo</th>
                  <th className="px-4 py-2.5">Proveedor</th>
                  <th className="px-4 py-2.5">Facturas</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bandeja.isLoading ? <LoadingRows /> : null}
                {!bandeja.isLoading ? rows.map((fila) => {
                  const params = new URLSearchParams();
                  params.set("returnTo", returnTo);
                  params.set("principalId", String(fila.principal.documentoId));
                  const href = `/compras/${fila.expedienteId}/ver?${params.toString()}`;
                  const proveedor = text(fila.proveedor?.nombre, "");
                  const ruc = text(fila.proveedor?.ruc, "");
                  const esPendienteValidacion = fila.estado === "pendiente_validacion";
                  const puedeContinuarValidacion =
                    esPendienteValidacion && fila.ocrResultadoId != null;

                  const hrefAccion = esPendienteValidacion
                    ? puedeContinuarValidacion
                      ? `/compras/nuevo?ocrResultadoId=${encodeURIComponent(String(fila.ocrResultadoId))}&expedienteId=${encodeURIComponent(String(fila.expedienteId))}`
                      : null
                    : `/compras/${fila.expedienteId}/editar?principalId=${fila.principal.documentoId}`;
                  return <tr key={`${fila.expedienteId}-${fila.principal.documentoId}`} className="border-b align-top hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold">{principalLabel(fila)}</td>
                    <td className="px-4 py-2.5"><div className="font-mono font-semibold">{text(fila.codigoExpediente)}</div><div className="mt-1 max-w-[280px] text-xs text-muted-foreground">{text(fila.descripcion)}</div></td>
                    <td className="px-4 py-2.5"><div className="max-w-[280px] font-medium">{proveedor || "—"}</div>{ruc ? <div className="mt-1 font-mono text-xs text-muted-foreground">RUC {ruc}</div> : null}</td>
                    <td className="px-4 py-2.5">{fila.facturas.length ? <div className="flex max-w-[300px] flex-wrap gap-1.5">{fila.facturas.map((f) => <Badge key={`${f.documentoId}-${f.grupoFacturaId}`} variant="outline">{facturaLabel(f)}</Badge>)}</div> : <span className="text-muted-foreground">—</span>}</td>

                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={href}><Eye className="mr-2 h-4 w-4" />Ver</Link>
                        </Button>
                        {hrefAccion ? (
                          <Button asChild size="sm">
                            <Link href={hrefAccion}>
                              {esPendienteValidacion ? "Continuar validación" : "Adjuntar"}
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" disabled>
                            Continuar validación
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>;
                }) : null}
              </tbody>
            </table>
          </div>
          {!q.trim() ? (
            <p className="border-t py-10 text-center text-sm text-muted-foreground">
              Ingrese un criterio de búsqueda para consultar OC/OS.
            </p>
          ) : null}
          {q.trim() && !bandeja.isLoading && rows.length === 0 ? (
            <p className="border-t py-10 text-center text-sm text-muted-foreground">
              No se encontraron OC/OS para el criterio ingresado.
            </p>
          ) : null}
          {q.trim() ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {start} a {end} de {total} resultados
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={apiOffset <= 0 || bandeja.isFetching}
                  onClick={() => setPage((v) => Math.max(0, v - 1))}
                >
                  Anterior
                </Button>
                <span className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={apiOffset + limit >= total || bandeja.isFetching}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
