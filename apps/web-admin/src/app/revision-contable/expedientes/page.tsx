"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FolderKanban,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
} from "lucide-react";

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
  createExpedienteMantenimiento,
  getExpedienteMantenimiento,
  getExpedientesMantenimiento,
  updateExpedienteMantenimiento,
  updateExpedienteMantenimientoEstado,
  type ExpedienteMantenimiento,
} from "@/services/expedientes-mantenimiento";

type DetailState = {
  id: number | string;
  fallback?: ExpedienteMantenimiento;
} | null;

type EditState = {
  id: number | string;
  fallback: ExpedienteMantenimiento;
} | null;

type AnnulState = {
  id: number | string;
  fallback: ExpedienteMantenimiento;
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

function codigoExpediente(expediente: ExpedienteMantenimiento) {
  return formatText(
    pick(
      expediente.codigoExpediente,
      expediente.codigo_expediente,
      expediente.codigo,
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

function totalDocumentos(expediente: ExpedienteMantenimiento) {
  const total = expediente.totalDocumentos;
  if (total === null || total === undefined || total === "") return "—";
  return String(total);
}

function tieneDocumentoPrincipal(expediente: ExpedienteMantenimiento) {
  return expediente.tieneDocumentoPrincipal === true;
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;
  return (
    anyError?.response?.data?.error?.message ??
    anyError?.response?.data?.message ??
    anyError?.message ??
    fallback
  );
}

function getAnulacionErrorMessage(error: unknown) {
  const anyError = error as any;
  const status = anyError?.response?.status ?? anyError?.response?.data?.error?.details?.statusCode;
  const backendMessage = anyError?.response?.data?.error?.message ?? anyError?.response?.data?.message;

  if (status === 409 || backendMessage === "Error interno del servidor") {
    return "No se puede anular porque ya tiene documento principal relacionado.";
  }

  return getErrorMessage(error, "No se pudo anular el centro de costo.");
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
            <h2 className="text-2xl font-semibold tracking-tight">Detalle de centro de costo</h2>
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field label="Código" value={codigoExpediente(expediente)} mono />
            <Field label="Estado" value={<Badge variant={estadoBadgeVariant(expediente.estado)}>{estadoLabel(expediente.estado)}</Badge>} />
            <Field label="Descripción" value={descripcion(expediente)} />
            <Field label="Total documentos" value={totalDocumentos(expediente)} />
            <Field label="F. creación" value={creadoEn(expediente)} />
            <Field label="F. actualización" value={actualizadoEn(expediente)} />
            {expediente.motivoAnulacion ? <Field label="Motivo anulación" value={expediente.motivoAnulacion} /> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function CentroCostoFormPanel({
  title,
  submitLabel,
  initialValues,
  onClose,
  onSubmit,
  isSaving,
  errorMessage,
  isDisabled = false,
}: {
  title: string;
  submitLabel: string;
  initialValues?: { codigoExpediente?: string; descripcion?: string };
  onClose: () => void;
  onSubmit: (values: { codigoExpediente: string; descripcion: string }) => void;
  isSaving: boolean;
  errorMessage?: string | null;
  isDisabled?: boolean;
}) {
  const [codigo, setCodigo] = useState(initialValues?.codigoExpediente ?? "");
  const [descripcionValue, setDescripcionValue] = useState(initialValues?.descripcion ?? "");

  useEffect(() => {
    setCodigo(initialValues?.codigoExpediente ?? "");
    setDescripcionValue(initialValues?.descripcion ?? "");
  }, [initialValues?.codigoExpediente, initialValues?.descripcion]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          </div>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>

        {isDisabled ? (
          <div className="mt-6">
            <ErrorBox title="Centro de costo anulado" description="No se permite editar un centro de costo anulado desde la interfaz." />
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6">
            <ErrorBox title="No se pudo guardar" description={errorMessage} />
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isDisabled || isSaving) return;
            onSubmit({ codigoExpediente: codigo.trim(), descripcion: descripcionValue.trim() });
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Código</label>
            <Input value={codigo} onChange={(event) => setCodigo(event.target.value)} disabled={isSaving || isDisabled} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Descripción</label>
            <textarea
              value={descripcionValue}
              onChange={(event) => setDescripcionValue(event.target.value)}
              disabled={isSaving || isDisabled}
              required
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || isDisabled}>
              <Save className="mr-2 h-4 w-4" />{isSaving ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function EditPanel({
  edit,
  onClose,
  onSubmit,
  isSaving,
  errorMessage,
}: {
  edit: EditState;
  onClose: () => void;
  onSubmit: (values: { codigoExpediente: string; descripcion: string }) => void;
  isSaving: boolean;
  errorMessage?: string | null;
}) {
  if (!edit) return null;

  const estadoActual = String(edit.fallback.estado ?? "abierto").toLowerCase();
  const isAnulado = estadoActual === "anulado";

  return (
    <CentroCostoFormPanel
      title="Editar centro de costo"
      submitLabel="Guardar"
      initialValues={{
        codigoExpediente: codigoExpediente(edit.fallback) === "—" ? "" : codigoExpediente(edit.fallback),
        descripcion: formatText(edit.fallback.descripcion) === "—" ? "" : String(edit.fallback.descripcion ?? ""),
      }}
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
      errorMessage={errorMessage}
      isDisabled={isAnulado}
    />
  );
}

function AnnulPanel({
  annul,
  onClose,
  onConfirm,
  isSaving,
  errorMessage,
}: {
  annul: AnnulState;
  onClose: () => void;
  onConfirm: (motivoAnulacion: string) => void;
  isSaving: boolean;
  errorMessage?: string | null;
}) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (annul) setMotivo("");
  }, [annul]);

  if (!annul) return null;

  const estadoActual = String(annul.fallback.estado ?? "abierto").toLowerCase();
  const isAnulado = estadoActual === "anulado";
  const hasPrincipal = tieneDocumentoPrincipal(annul.fallback);
  const isBlocked = isAnulado || hasPrincipal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-50 p-2 text-red-600 dark:bg-red-950/30 dark:text-red-300">
            <Ban className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Anular centro de costo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta acción cambiará el estado a anulado. No será reversible desde la interfaz.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Código</p>
          <p className="mt-1 font-mono text-sm font-medium">{codigoExpediente(annul.fallback)}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Descripción</p>
          <p className="mt-1 text-sm font-medium">{descripcion(annul.fallback)}</p>
        </div>

        {isAnulado ? (
          <div className="mt-4">
            <ErrorBox title="Ya está anulado" description="Este centro de costo ya se encuentra anulado." />
          </div>
        ) : null}

        {hasPrincipal ? (
          <div className="mt-4">
            <ErrorBox title="No se puede anular" description="No se puede anular porque ya tiene documento principal relacionado." />
          </div>
        ) : null}

        {!isBlocked ? (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Motivo de anulación</label>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              disabled={isSaving}
              required
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Ingrese el motivo de anulación"
            />
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4">
            <ErrorBox title="No se pudo anular" description={errorMessage} />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(motivo.trim())}
            disabled={isSaving || isBlocked || !motivo.trim()}
          >
            <Ban className="mr-2 h-4 w-4" />{isSaving ? "Anulando..." : "Anular"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MantenimientoExpedientesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [detail, setDetail] = useState<DetailState>(null);
  const [edit, setEdit] = useState<EditState>(null);
  const [annul, setAnnul] = useState<AnnulState>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [annulError, setAnnulError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const queryParams = useMemo(
    () => ({
      q: q.trim(),
      page,
      pageSize,
    }),
    [q, page],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["expedientes-mantenimiento", queryParams],
    queryFn: () => getExpedientesMantenimiento(queryParams),
  });

  const invalidateMantenimiento = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expedientes-mantenimiento"] });
  };

  const createMutation = useMutation({
    mutationFn: (values: { codigoExpediente: string; descripcion: string }) => createExpedienteMantenimiento(values),
    onSuccess: async () => {
      setIsCreating(false);
      setCreateError(null);
      await invalidateMantenimiento();
    },
    onError: (mutationError) => {
      setCreateError(getErrorMessage(mutationError, "Backend no aceptó la creación del centro de costo."));
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: number | string; values: { codigoExpediente: string; descripcion: string } }) =>
      updateExpedienteMantenimiento(id, values),
    onSuccess: async () => {
      setEdit(null);
      setEditError(null);
      await invalidateMantenimiento();
    },
    onError: (mutationError) => {
      setEditError(getErrorMessage(mutationError, "Backend no aceptó la actualización del centro de costo."));
    },
  });

  const annulMutation = useMutation({
    mutationFn: ({ id, motivoAnulacion }: { id: number | string; motivoAnulacion: string }) =>
      updateExpedienteMantenimientoEstado(id, { estado: "anulado", motivoAnulacion }),
    onSuccess: async () => {
      setAnnul(null);
      setAnnulError(null);
      await invalidateMantenimiento();
    },
    onError: (mutationError) => {
      setAnnulError(getAnulacionErrorMessage(mutationError));
    },
  });

  const items = data?.items ?? [];
  const currentPage = data?.page ?? page;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const hasPreviousPage = data?.hasPreviousPage ?? currentPage > 1;
  const hasNextPage = data?.hasNextPage ?? currentPage < totalPages;
  const startItem = data?.total && items.length ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = data?.total && items.length ? startItem + items.length - 1 : 0;

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
              <Button
                onClick={() => {
                  setCreateError(null);
                  setIsCreating(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />Nuevo
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
                {items.map((expediente) => {
                  const estadoActual = String(expediente.estado ?? "abierto").toLowerCase();
                  const isAnulado = estadoActual === "anulado";
                  const hasPrincipal = tieneDocumentoPrincipal(expediente);
                  const anularDisabled = isAnulado || hasPrincipal;
                  const anularTitle = isAnulado
                    ? "Ya está anulado"
                    : hasPrincipal
                      ? "No se puede anular porque ya tiene documento principal relacionado."
                      : "Anular centro de costo";

                  return (
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
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditError(null);
                              setEdit({ id: expediente.id, fallback: expediente });
                            }}
                            disabled={isAnulado}
                            title={isAnulado ? "No editable porque está anulado" : "Editar código y descripción"}
                          >
                            <Pencil className="mr-2 h-4 w-4" />Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (anularDisabled) return;
                              setAnnulError(null);
                              setAnnul({ id: expediente.id, fallback: expediente });
                            }}
                            disabled={anularDisabled}
                            title={anularTitle}
                          >
                            <Ban className="mr-2 h-4 w-4" />Anular
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}

          {!isLoading && !error && data && items.length ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {startItem} a {endItem} de {data.total} centros de costo
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={isFetching || !hasPreviousPage}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />Anterior
                </Button>
                <span className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={isFetching || !hasNextPage}
                >
                  Siguiente<ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {!isLoading && !error && !items.length ? (
            <Empty className="mt-4">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText className="h-5 w-5" /></EmptyMedia>
                <EmptyTitle>Sin centros de costo para mostrar</EmptyTitle>
                <EmptyDescription>Ajusta los filtros o valida que existan centros de costo registrados.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </CardContent>
      </Card>

      <DetailPanel detail={detail} onClose={() => setDetail(null)} />
      {isCreating ? (
        <CentroCostoFormPanel
          title="Nuevo centro de costo"
          submitLabel="Crear"
          onClose={() => {
            setIsCreating(false);
            setCreateError(null);
          }}
          onSubmit={(values) => {
            setCreateError(null);
            createMutation.mutate(values);
          }}
          isSaving={createMutation.isPending}
          errorMessage={createError}
        />
      ) : null}
      <EditPanel
        edit={edit}
        onClose={() => {
          setEdit(null);
          setEditError(null);
        }}
        onSubmit={(values) => {
          if (!edit) return;
          setEditError(null);
          editMutation.mutate({ id: edit.id, values });
        }}
        isSaving={editMutation.isPending}
        errorMessage={editError}
      />
      <AnnulPanel
        annul={annul}
        onClose={() => {
          setAnnul(null);
          setAnnulError(null);
        }}
        onConfirm={(motivoAnulacion) => {
          if (!annul) return;
          setAnnulError(null);
          annulMutation.mutate({ id: annul.id, motivoAnulacion });
        }}
        isSaving={annulMutation.isPending}
        errorMessage={annulError}
      />
    </main>
  );
}
