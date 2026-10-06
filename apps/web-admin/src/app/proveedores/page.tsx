"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
} from "lucide-react";

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
import { useAuth } from "@/hooks/useAuth";
import {
  createProveedorMantenimiento,
  getProveedorMantenimiento,
  getProveedoresMantenimiento,
  updateProveedorMantenimiento,
  type ProveedorMantenimiento,
  type ProveedorMantenimientoPayload,
  type TipoPersonaProveedor,
} from "@/services/proveedores-mantenimiento";

type DetailState = {
  id: number | string;
  fallback?: ProveedorMantenimiento;
} | null;

type EditState = {
  id: number | string;
  fallback: ProveedorMantenimiento;
} | null;

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

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className={`mt-2 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function DetailPanel({
  detail,
  onClose,
}: {
  detail: DetailState;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["proveedores-mantenimiento", "detalle", detail?.id],
    queryFn: () => getProveedorMantenimiento(detail!.id),
    enabled: Boolean(detail?.id),
  });

  if (!detail) return null;

  const proveedor = data ?? detail.fallback;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Detalle de proveedor
            </h2>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
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
            <ErrorBox
              title="No se pudo cargar el detalle"
              description="El listado sigue disponible. Intenta nuevamente."
            />
          </div>
        ) : null}

        {proveedor ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field label="RUC" value={formatText(proveedor.ruc)} mono />
            <Field
              label="Tipo de persona"
              value={formatText(proveedor.tipoPersona)}
            />
            <Field
              label="Razón social"
              value={formatText(proveedor.razonSocial)}
            />
            <Field
              label="Dirección"
              value={formatText(proveedor.direccion)}
            />
            <Field
              label="F. creación"
              value={formatDateTime(proveedor.creadoEn)}
            />
            <Field
              label="F. actualización"
              value={formatDateTime(proveedor.actualizadoEn)}
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ProveedorFormPanel({
  title,
  submitLabel,
  initialValues,
  onClose,
  onSubmit,
  isSaving,
}: {
  title: string;
  submitLabel: string;
  initialValues?: ProveedorMantenimiento;
  onClose: () => void;
  onSubmit: (payload: ProveedorMantenimientoPayload) => void;
  isSaving: boolean;
}) {
  const [ruc, setRuc] = useState(initialValues?.ruc ?? "");
  const [razonSocial, setRazonSocial] = useState(
    initialValues?.razonSocial ?? "",
  );
  const [direccion, setDireccion] = useState(initialValues?.direccion ?? "");
  const [tipoPersona, setTipoPersona] = useState<TipoPersonaProveedor>(
    initialValues?.tipoPersona ?? "JURIDICA",
  );

  useEffect(() => {
    setRuc(initialValues?.ruc ?? "");
    setRazonSocial(initialValues?.razonSocial ?? "");
    setDireccion(initialValues?.direccion ?? "");
    setTipoPersona(initialValues?.tipoPersona ?? "JURIDICA");
  }, [initialValues]);

  const valid =
    /^\d{11}$/.test(ruc) &&
    razonSocial.trim().length > 0 &&
    (tipoPersona === "NATURAL" || tipoPersona === "JURIDICA");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isSaving) return;

    onSubmit({
      ruc,
      razonSocial: razonSocial.trim(),
      direccion: direccion.trim() || null,
      tipoPersona,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="ruc">
              RUC
            </label>
            <Input
              id="ruc"
              value={ruc}
              inputMode="numeric"
              maxLength={11}
              onChange={(event) =>
                setRuc(event.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="20123456789"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Debe contener exactamente 11 dígitos.
            </p>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="razonSocial"
            >
              Razón social
            </label>
            <Input
              id="razonSocial"
              value={razonSocial}
              onChange={(event) => setRazonSocial(event.target.value)}
              required
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="direccion"
            >
              Dirección
            </label>
            <textarea
              id="direccion"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="tipoPersona"
            >
              Tipo de persona
            </label>
            <select
              id="tipoPersona"
              value={tipoPersona}
              onChange={(event) =>
                setTipoPersona(event.target.value as TipoPersonaProveedor)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="JURIDICA">JURÍDICA</option>
              <option value="NATURAL">NATURAL</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const { contexto } = useAuth();

  const isAdmin = contexto?.perfil === "admin";
  const actions = contexto?.permisos?.actions ?? [];
  const canCreate = isAdmin || actions.includes("proveedores.crear");
  const canEdit = isAdmin || actions.includes("proveedores.editar");

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<DetailState>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);
  const pageSize = 50;

  const query = useQuery({
    queryKey: ["proveedores-mantenimiento", { q, page, pageSize }],
    queryFn: () =>
      getProveedoresMantenimiento({
        q: q || undefined,
        page,
        pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createProveedorMantenimiento,
    onSuccess: async () => {
      setCreating(false);
      await queryClient.invalidateQueries({
        queryKey: ["proveedores-mantenimiento"],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | string;
      payload: ProveedorMantenimientoPayload;
    }) => updateProveedorMantenimiento(id, payload),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({
        queryKey: ["proveedores-mantenimiento"],
      });
    },
  });

  const items = query.data?.items ?? [];
  const totalPages = Math.max(1, query.data?.totalPages ?? 1);

  const mutationError = useMemo(() => {
    const error = createMutation.error ?? updateMutation.error;
    if (!error) return null;

    if (error instanceof Error) return error.message;
    return "No se pudo completar la operación.";
  }, [createMutation.error, updateMutation.error]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Catálogo compartido
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta y mantenimiento del catálogo de proveedores.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>

          {canCreate ? (
            <Button onClick={() => setCreating(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo proveedor
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Proveedores
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={submitSearch}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar RUC, razón social o dirección"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          {mutationError ? (
            <ErrorBox
              title="No se pudo guardar el proveedor"
              description={mutationError}
            />
          ) : null}

          {query.error ? (
            <ErrorBox
              title="No se pudo cargar proveedores"
              description="Revisa la conexión o los permisos del módulo."
            />
          ) : null}

          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : null}

          {!query.isLoading && !query.error && items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No hay proveedores</EmptyTitle>
                <EmptyDescription>
                  No se encontraron proveedores con los filtros actuales.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!query.isLoading && !query.error && items.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RUC</TableHead>
                    <TableHead>Razón social</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Tipo persona</TableHead>
                    <TableHead>F. creación</TableHead>
                    <TableHead>F. actualización</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((proveedor) => (
                    <TableRow key={proveedor.id}>
                      <TableCell className="font-mono font-medium">
                        {formatText(proveedor.ruc)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatText(proveedor.razonSocial)}
                      </TableCell>
                      <TableCell>
                        {formatText(proveedor.direccion)}
                      </TableCell>
                      <TableCell>
                        {formatText(proveedor.tipoPersona)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(proveedor.creadoEn)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(proveedor.actualizadoEn)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDetail({
                                id: proveedor.id,
                                fallback: proveedor,
                              })
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>

                          {canEdit ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditing({
                                  id: proveedor.id,
                                  fallback: proveedor,
                                })
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {!query.isLoading && !query.error && query.data ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {query.data.total} proveedor
                {query.data.total === 1 ? "" : "es"} · Página {page} de{" "}
                {totalPages}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || query.isFetching}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DetailPanel detail={detail} onClose={() => setDetail(null)} />

      {creating ? (
        <ProveedorFormPanel
          title="Nuevo proveedor"
          submitLabel="Crear proveedor"
          onClose={() => setCreating(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          isSaving={createMutation.isPending}
        />
      ) : null}

      {editing ? (
        <ProveedorFormPanel
          title="Editar proveedor"
          submitLabel="Guardar cambios"
          initialValues={editing.fallback}
          onClose={() => setEditing(null)}
          onSubmit={(payload) =>
            updateMutation.mutate({ id: editing.id, payload })
          }
          isSaving={updateMutation.isPending}
        />
      ) : null}
    </div>
  );
}
