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
  const [empresa, setEmpresa] = useState("BBTI");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const contexto = getContexto();
    setEmpresa(contexto?.empresa?.trim() || "BBTI");
  }, []);

  const offset = page * PAGE_SIZE;
  const bandeja = useQuery({
    queryKey: ["compras-bandeja-ocos", empresa, q, PAGE_SIZE, offset],
    queryFn: () => obtenerBandejaCompras({ empresa, q, limit: PAGE_SIZE, offset }),
    enabled: Boolean(q.trim()),
  });

  const rows = bandeja.data?.data ?? [];
  const total = Number(bandeja.data?.total ?? 0);
  const limit = Number(bandeja.data?.limit ?? PAGE_SIZE) || PAGE_SIZE;
  const apiOffset = Number(bandeja.data?.offset ?? offset);
  const start = total ? apiOffset + 1 : 0;
  const end = Math.min(apiOffset + rows.length, total);

  const returnTo = useMemo(() => pathname, [pathname]);

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Compras</p>
        <Button asChild><Link href="/compras/nuevo"><Plus className="mr-2 h-4 w-4" />Agregar OC/OS</Link></Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Órdenes de compra / servicio</CardTitle>
            {q.trim() ? <span className="text-xs text-muted-foreground">{bandeja.isLoading ? "Cargando..." : `Mostrando ${start} a ${end} de ${total} resultados`}</span> : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Empresa</span>
              <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                {empresa}
              </div>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Buscar</span>
              <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setQ(search.trim()); setPage(0); } }} placeholder="Buscar documento, centro de costo, factura, RUC o proveedor..." />
                {search || q ? <Button type="button" size="icon" variant="outline" onClick={() => { setSearch(""); setQ(""); setPage(0); }}><X className="h-4 w-4" /></Button> : null}
              </div>
            </label>
            <div className="flex items-end"><Button type="button" onClick={() => { setQ(search.trim()); setPage(0); }}><Search className="mr-2 h-4 w-4" />Buscar</Button></div>
          </div>
        </CardHeader>
        <CardContent>
          {bandeja.isError ? <div className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">No se pudo cargar GET /expedientes/bandeja-compras.</div> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-4">Documento</th><th className="pr-4">Centro de costo</th><th className="pr-4">Proveedor</th><th className="pr-4">Facturas</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>
                {bandeja.isLoading ? <LoadingRows /> : null}
                {!bandeja.isLoading ? rows.map((fila) => {
                  const params = new URLSearchParams();
                  params.set("returnTo", returnTo);
                  params.set("principalId", String(fila.principal.documentoId));
                  const href = `/compras/${fila.expedienteId}/ver?${params.toString()}`;
                  const proveedor = text(fila.proveedor?.nombre, "");
                  const ruc = text(fila.proveedor?.ruc, "");
                  return <tr key={`${fila.expedienteId}-${fila.principal.documentoId}`} className="border-b align-top hover:bg-muted/30">
                    <td className="py-3 pr-4 font-semibold">{principalLabel(fila)}</td>
                    <td className="py-3 pr-4"><div className="font-mono font-semibold">{text(fila.codigoExpediente)}</div><div className="mt-1 max-w-[280px] text-xs text-muted-foreground">{text(fila.descripcion)}</div></td>
                    <td className="py-3 pr-4"><div className="max-w-[280px] font-medium">{proveedor || "—"}</div>{ruc ? <div className="mt-1 font-mono text-xs text-muted-foreground">RUC {ruc}</div> : null}</td>
                    <td className="py-3 pr-4">{fila.facturas.length ? <div className="flex max-w-[300px] flex-wrap gap-1.5">{fila.facturas.map((f) => <Badge key={`${f.documentoId}-${f.grupoFacturaId}`} variant="outline">{facturaLabel(f)}</Badge>)}</div> : <span className="text-muted-foreground">—</span>}</td>

                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={href}><Eye className="mr-2 h-4 w-4" />Ver</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={`/compras/${fila.expedienteId}/editar?principalId=${fila.principal.documentoId}`}>
                            Adjuntar
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>;
                }) : null}
              </tbody>
            </table>
          </div>
          {!q.trim() ? <p className="py-8 text-center text-sm text-muted-foreground">Ingrese un criterio de búsqueda para consultar OC/OS.</p> : null}
          {q.trim() && !bandeja.isLoading && rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No se encontraron OC/OS para el criterio ingresado.</p> : null}
          {q.trim() ? <div className="mt-4 flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={apiOffset <= 0 || bandeja.isFetching} onClick={() => setPage((v) => Math.max(0, v - 1))}>Anterior</Button><span className="text-xs text-muted-foreground">Offset {apiOffset} · límite {limit}</span><Button type="button" variant="outline" disabled={apiOffset + limit >= total || bandeja.isFetching} onClick={() => setPage((v) => v + 1)}>Siguiente</Button></div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
