"use client";

import Link from "next/link";
import { Building2, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStoredWorkspaces } from "@/lib/auth-storage";

export default function MiPerfilPage() {
  const { contexto } = useAuth();
  const workspaces = getStoredWorkspaces();

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Cuenta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta tu contexto actual, espacios de trabajo disponibles y datos básicos de sesión.
          </p>
        </div>
        <Link
          href="/seleccionar-contexto"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
        >
          Cambiar espacio de trabajo
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{contexto?.nombres ?? "Usuario"}</h2>
              <p className="text-sm text-muted-foreground">{contexto?.email ?? "Correo no disponible"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace actual</p>
              <p className="mt-1 font-semibold">{contexto?.empresa ?? "-"} · {contexto?.perfil ?? "-"}</p>
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
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Espacios de trabajo</h2>
          </div>

          <div className="mt-5 space-y-3">
            {workspaces.length ? workspaces.map((workspace) => {
              const active = contexto?.workspaceId === workspace.workspaceId;
              return (
                <div
                  key={workspace.workspaceId}
                  className={`rounded-2xl border p-4 ${active ? "border-slate-950 bg-slate-50 dark:border-white dark:bg-white/10" : "border-border bg-muted/20"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{workspace.empresaCodigo || workspace.empresa} · {workspace.perfil}</p>
                        <p className="text-sm text-muted-foreground">{workspace.sistemaNombre || workspace.sistema}</p>
                      </div>
                    </div>
                    {workspace.esFavorito ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                        Favorito
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No hay workspaces cacheados en este navegador. Usa “Cambiar espacio de trabajo” para refrescarlos.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Seguridad</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Cambio de contraseña y cierre de otras sesiones quedan preparados para el siguiente incremento del módulo de Auth.
        </p>
      </section>
    </main>
  );
}
