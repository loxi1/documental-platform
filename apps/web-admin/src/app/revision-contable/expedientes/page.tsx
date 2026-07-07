"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye, FileText, FolderKanban, Pencil, RefreshCcw, Search } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatText } from "@/lib/format";
import {
  getExpedienteMantenimiento,
  getExpedientesMantenimiento,
  type ExpedienteMantenimiento,
} from "@/services/expedientes-mantenimiento";

type DetailState = {
  id: number | string;
  fallback?: ExpedienteMantenimiento;
} | null;

function pick<T>(...values: T[]) {
  return values.find((value) => value !== null && value !== undefined && value !== "");
}

function estadoBadgeVariant(estado?: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch ((estado ?? "abierto").toLowerCase()) {
    case "abierto":
      return "default";
    case "cerrado":
      return "secondary";
    case "observado":
      return "outline";
    case "anulado":
      return "destructive";
    default:
      return "outline";
  }
}

function estadoLabel(estado?: string | null) {
  return estado || "abierto";
}

function empresa(expediente: ExpedienteMantenimiento) {
  return formatText(
    pick(
      expediente.empresaAbreviatura,
      expediente.empresa_abreviatura,
      expediente.empresaCodigo,
      expediente.empresa_codigo,
      expediente.empresa,
    ),
  );
}

function codigoExpediente(expediente: ExpedienteMantenimiento) {
  return formatText(
    pick(
      expediente.codigoExpediente,
      expediente.codigo_expediente,
      expediente.codigo,
    ),
  );
}

function clienteDestino(expediente: ExpedienteMantenimiento) {
  return formatText(
    pick(
      expediente.clienteDestinoAbreviatura,
      expediente.cliente_destino_abreviatura,
      expediente.clienteAbreviatura,
      expediente.cliente_abreviatura,
      expediente.clienteDestino,
      expediente.cliente_destino,
      expediente.clienteDestinoNombre,
      expediente.cliente_destino_nombre,
      expediente.clienteNombre,
      expediente.cliente_nombre,
    ),
  );
}

function descripcion(expediente: ExpedienteMantenimiento) {
  return formatText(expediente.descripcion) === "—" ? "Sin descripción" : formatText(expediente.descripcion);
}

function creadoEn(expediente: ExpedienteMantenimiento) {
  return formatDateTime(expediente.creadoEn ?? expediente.creado_en);
}

function actualizadoEn(expediente: ExpedienteMantenimiento) {
  return formatDateTime(expediente.actualizadoEn ?? expediente.actualizado_en);
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm font-medium text-foreground ${mono ? "font-mono break-all" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function ErrorBox({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

function DetailPanel({ detail, onClose }: { detail: DetailState; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["expedientes-mantenimiento", "detalle", detail?.id],
    queryFn: () => getExpedienteMantenimiento(detail!.id),
    enabled: Boolean(detail?.id),
  });

  if (!detail) return null;

  const expediente = data ?? detail.fallback;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fase 1 · Solo lectura</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Detalle de expediente contable</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta vista no modifica documentos vinculados ni estados del expediente.
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {error ? (
          <div className="mt-6">
            <ErrorBox title="No se pudo cargar el detalle" description="El listado sigue disponible. Revisa que el endpoint de detalle esté expuesto en el backend." />
          </div>
        ) : null}

        {expediente ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ID" value={expediente.id} mono />
              <Field label="Estado" value={<Badge variant={estadoBadgeVariant(expediente.estado)}>{estadoLabel(expediente.estado)}</Badge>} />
              <Field label="Empresa" value={empresa(expediente)} />
              <Field label="Código expediente" value={codigoExpediente(expediente)} mono />
              <Field label="Cliente destino" value={clienteDestino(expediente)} />
              <Field label="Fecha creación" value={creadoEn(expediente)} />
              <Field label="Fecha actualización" value={actualizadoEn(expediente)} />
              <Field label="Descripción" value={descripcion(expediente)} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              No se muestra <span className="font-mono">cliente_destino_id</span>. Para cliente destino se usa la abreviatura o nombre funcional devuelto por backend.
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export default function MantenimientoExpedientesPage() {
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<DetailState>(null);

  const queryParams = useMemo(
    () => ({
      q: q.trim(),
      page: 1,
      pageSize: 50,
    }),
    [q],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["expedientes-mantenimiento", queryParams],
    queryFn: () => getExpedientesMantenimiento(queryParams),
  });

  const items = data?.items ?? [];

  return (
    <main className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Contabilidad</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Centro de costo</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FolderKanban className="h-5 w-5" />Centro de costo</CardTitle>
              {data ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Total: {data.total} · Página {data.page} de {data.totalPages} · Tamaño: {data.pageSize}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar código o descripción" className="h-10 w-full pl-9 sm:w-72" />
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCcw className="mr-2 h-4 w-4" />Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorBox title="No se pudo cargar el mantenimiento" description="Valida que el backend exponga GET /api/v1/expedientes/mantenimiento para admin y contabilidad." />
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!isLoading && !error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>F. creación</TableHead>
                  <TableHead>F. actualización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((expediente) => (
                  <TableRow key={String(expediente.id)}>
                    <TableCell className="font-mono text-xs">{codigoExpediente(expediente)}</TableCell>
                    <TableCell className="max-w-md truncate" title={descripcion(expediente)}>{descripcion(expediente)}</TableCell>
                    <TableCell><Badge variant={estadoBadgeVariant(expediente.estado)}>{estadoLabel(expediente.estado)}</Badge></TableCell>
                    <TableCell>{creadoEn(expediente)}</TableCell>
                    <TableCell>{actualizadoEn(expediente)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetail({ id: expediente.id, fallback: expediente })}>
                          <Eye className="mr-2 h-4 w-4" />Ver
                        </Button>
                        <Button size="sm" variant="secondary" disabled title="Disponible en Fase 2">
                          <Pencil className="mr-2 h-4 w-4" />Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {!isLoading && !error && !items.length ? (
            <Empty className="mt-4">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText className="h-5 w-5" /></EmptyMedia>
                <EmptyTitle>Sin expedientes para mostrar</EmptyTitle>
                <EmptyDescription>Ajusta los filtros o valida que existan expedientes contables registrados.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </CardContent>
      </Card>

      <DetailPanel detail={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
