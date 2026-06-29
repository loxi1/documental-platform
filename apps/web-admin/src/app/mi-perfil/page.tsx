"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthSession, getStoredWorkspaces, saveAuthSession } from "@/lib/auth-storage";
import { selectWorkspace } from "@/services/auth";
import type { AuthWorkspace } from "@/types/auth";
import { getDefaultPathForContext } from "@/lib/workspace-navigation";

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function workspaceLabel(workspace: AuthWorkspace) {
  const empresa = workspace.empresaCodigo || workspace.empresa || "Empresa";
  const perfil = workspace.perfilNombre || workspace.perfil || "Perfil";
  return `${empresa} · ${perfil}`;
}

export default function MiPerfilPage() {
  const router = useRouter();
  const { contexto, refreshSession } = useAuth();
  const [loadingWorkspaceId, setLoadingWorkspaceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaces = useMemo(() => getStoredWorkspaces(), []);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.workspaceId === contexto?.workspaceId),
    [contexto?.workspaceId, workspaces],
  );

  const handleChangeWorkspace = async (workspace: AuthWorkspace) => {
    if (workspace.workspaceId === contexto?.workspaceId) return;

    const currentSession = getAuthSession();
    if (!currentSession?.accessToken) {
      setError("No se encontró una sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    setError(null);
    setLoadingWorkspaceId(workspace.workspaceId);

    try {
      const newSession = await selectWorkspace(
        currentSession.accessToken,
        workspace.workspaceId,
        Boolean(workspace.esFavorito),
      );
      saveAuthSession(newSession);
      refreshSession();
      router.replace(getDefaultPathForContext(newSession.contexto));
    } catch {
      setError("No se pudo cambiar el espacio de trabajo. Verifica que el servicio de autenticación esté activo.");
    } finally {
      setLoadingWorkspaceId(null);
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Cuenta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta tu sesión, contexto actual y espacios de trabajo disponibles.
          </p>
        </div>
        <Link
          href="/seleccionar-contexto"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
        >
          Cambiar espacio de trabajo
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.3fr]">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{contexto?.nombres ?? "Usuario"}</h2>
              <p className="truncate text-sm text-muted-foreground">{contexto?.email ?? "Correo no disponible"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace actual</p>
              <p className="mt-1 font-semibold">{contexto?.empresa ?? "-"} · {contexto?.perfil ?? "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">ID: {contexto?.workspaceId ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sistema</p>
              <p className="mt-1 font-semibold">{contexto?.sistema ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Session Context ID</p>
              <p className="mt-1 break-all font-mono text-xs">{contexto?.sessionContextId ?? "-"}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Espacios de trabajo</h2>
                <p className="text-sm text-muted-foreground">
                  Activa otro workspace sin volver a ingresar contraseña.
                </p>
              </div>
            </div>
            {activeWorkspace?.esFavorito ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                <Star className="h-3.5 w-3.5 fill-current" />
                Favorito
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {workspaces.length ? workspaces.map((workspace) => {
              const active = contexto?.workspaceId === workspace.workspaceId;
              const loading = loadingWorkspaceId === workspace.workspaceId;

              return (
                <div
                  key={workspace.workspaceId}
                  className={`rounded-2xl border p-4 ${active ? "border-slate-950 bg-slate-50 dark:border-white dark:bg-white/10" : "border-border bg-muted/20"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{workspaceLabel(workspace)}</p>
                        <p className="truncate text-sm text-muted-foreground">{workspace.sistemaNombre || workspace.sistema}</p>
                      </div>
                    </div>
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Activo
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-xl bg-background/70 p-3 dark:bg-white/5">
                      <p className="uppercase tracking-wide">Último uso</p>
                      <p className="mt-1 font-medium text-foreground">{formatDate(workspace.ultimoUsoEn)}</p>
                    </div>
                    <div className="rounded-xl bg-background/70 p-3 dark:bg-white/5">
                      <p className="uppercase tracking-wide">Vigencia</p>
                      <p className="mt-1 font-medium text-foreground">
                        {workspace.vigenciaHasta ? `Hasta ${formatDate(workspace.vigenciaHasta)}` : "Sin vencimiento"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChangeWorkspace(workspace)}
                    disabled={active || Boolean(loadingWorkspaceId)}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "cursor-default bg-muted text-muted-foreground"
                        : "bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {active ? "Workspace activo" : loading ? "Cambiando..." : "Activar workspace"}
                  </button>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground xl:col-span-2">
                No hay workspaces cacheados en este navegador. Usa “Cambiar espacio de trabajo” para refrescarlos.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Último acceso</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            El historial detallado de accesos quedará alimentado desde auditoría base.
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contexto actual</p>
            <p className="mt-1 font-semibold">{contexto?.empresa ?? "-"} · {contexto?.perfil ?? "-"}</p>
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Seguridad</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cambio de contraseña y cierre de otras sesiones quedan preparados para el siguiente incremento del módulo de Auth.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground"
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              disabled
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground"
            >
              Cerrar otras sesiones
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
