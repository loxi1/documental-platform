"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { clearAuthSession, getAuthSession, getStoredWorkspaces, saveAuthSession } from "@/lib/auth-storage";
import { changePassword, selectWorkspace } from "@/services/auth";
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

function companyName(value?: string | null) {
  const code = (value ?? "").trim().toUpperCase();
  if (code === "BBTI" || code === "BBTI S.A.C.") return "BBTI S.A.C.";
  if (code === "BBTEC" || code === "BB TECNOLOGIA INDUSTRIAL S.A.C.") {
    return "BB TECNOLOGIA INDUSTRIAL S.A.C.";
  }
  return value || "Empresa no disponible";
}

function systemName(value?: string | null) {
  return value?.trim().toUpperCase() === "DOCUMENTAL" ? "Gestión Documental" : value || "Sistema no disponible";
}

function profileName(value?: string | null) {
  const profile = value?.trim();
  if (!profile) return "Perfil no disponible";

  if (profile.toLowerCase() === "almacen") return "Almacén";

  return profile
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function workspaceLabel(workspace: AuthWorkspace) {
  return companyName(workspace.empresaCodigo || workspace.empresa);
}

export default function MiPerfilPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { contexto, refreshSession, logout } = useAuth();
  const [loadingWorkspaceId, setLoadingWorkspaceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const workspaces = useMemo(() => getStoredWorkspaces(), []);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.workspaceId === contexto?.workspaceId),
    [contexto?.workspaceId, workspaces],
  );

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (changingPassword) return;

    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Completa los tres campos.");
      return;
    }

    if (Array.from(newPassword).length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (new TextEncoder().encode(newPassword).byteLength > 72) {
      setPasswordError("La nueva contraseña no puede superar los 72 bytes UTF-8.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmación no coincide.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("La nueva contraseña debe ser diferente.");
      return;
    }

    const session = getAuthSession();

    if (!session?.accessToken) {
      setPasswordError("Sesión no disponible. Inicia sesión nuevamente.");
      return;
    }

    setChangingPassword(true);

    try {
      const result = await changePassword(
        session.accessToken,
        currentPassword,
        newPassword,
        confirmPassword,
      );

      if (!result.success || !result.sessionRevoked || !result.requiresLogin) {
        throw new Error("Cambio no confirmado");
      }

      // Revoke local access before showing success, independent of modal actions.
      clearAuthSession();
      refreshSession();
      setPasswordUpdated(true);
      queryClient.clear();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const failure = error as { response?: { status?: number; data?: { code?: string; error?: { code?: string } } } };
      const code = failure.response?.data?.error?.code ?? failure.response?.data?.code;
      if (failure.response?.status === 401 && code === "CURRENT_PASSWORD_INCORRECT") {
        setPasswordError("La contraseña actual es incorrecta.");
      } else setPasswordError(
        "No se pudo cambiar la contraseña. Verifica los datos ingresados.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

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
      await queryClient.cancelQueries();
      queryClient.clear();
      saveAuthSession(newSession);
      refreshSession();
      router.replace(getDefaultPathForContext(newSession.contexto));
    } catch {
      setError("No se pudo cambiar el espacio de trabajo. Verifica que el servicio de autenticación esté activo.");
    } finally {
      setLoadingWorkspaceId(null);
    }
  };

  if (passwordUpdated) {
    return (
      <Modal
        isOpen
        showCloseButton={false}
        onClose={() => router.replace("/login")}
        className="max-w-md p-6"
      >
        <div role="alertdialog" aria-modal="true" aria-labelledby="password-updated-title" aria-describedby="password-updated-message">
          <h1 id="password-updated-title" className="text-xl font-semibold">Contraseña actualizada</h1>
          <p id="password-updated-message" className="mt-3 text-sm text-muted-foreground">
            Tu contraseña se cambió correctamente. Por seguridad, inicia sesión nuevamente con tu nueva contraseña.
          </p>
          <button type="button" onClick={() => router.replace("/login")} className="mt-6 rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white">
            Ir a iniciar sesión
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mi perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulta tus datos y administra los espacios de trabajo a los que tienes acceso.
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

      <section className="grid gap-4 lg:grid-cols-3">
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Espacio de trabajo actual</p>
              <p className="mt-1 font-semibold">{companyName(contexto?.empresa)}</p>
              <p className="mt-1 font-semibold">{profileName(contexto?.perfil)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sistema</p>
              <p className="mt-1 font-semibold">{systemName(contexto?.sistema)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Espacios de trabajo</h2>
                <p className="text-sm text-muted-foreground">
                  Selecciona otro espacio de trabajo disponible sin volver a iniciar sesión.
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
                        <p className="break-words font-semibold leading-snug">{workspaceLabel(workspace)}</p>
                        <p className="truncate text-sm text-muted-foreground">{systemName(workspace.sistemaNombre || workspace.sistema)}</p>
                      </div>
                    </div>
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Activo
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <div className="w-full rounded-xl bg-background/70 p-3 dark:bg-white/5">
                      <p className="uppercase tracking-wide">Último uso</p>
                      <p className="mt-1 font-medium text-foreground">{formatDate(workspace.ultimoUsoEn)}</p>
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
                    {active ? "Espacio de trabajo activo" : loading ? "Cambiando..." : "Activar espacio de trabajo"}
                  </button>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground xl:col-span-2">
                No hay espacios de trabajo disponibles en esta sesión. Usa «Cambiar espacio de trabajo» para consultar tus opciones.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Información de mi cuenta</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Datos asociados a tu sesión actual.</p>
          <dl className="mt-4 space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Nombre</dt><dd className="mt-1 font-semibold">{contexto?.nombres ?? "Usuario"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Correo</dt><dd className="mt-1 break-words font-semibold">{contexto?.email ?? "Correo no disponible"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Perfil</dt><dd className="mt-1 font-semibold">{contexto?.perfil ?? "Perfil no disponible"}</dd></div>
          </dl>
        </article>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Seguridad</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Actualiza tu contraseña para proteger tu cuenta. Usa al menos 8 caracteres.
            Al confirmar el cambio, se cerrarán tus sesiones anteriores
            y deberás iniciar sesión nuevamente.
          </p>

          <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
            {[
              {
                id: "current-password",
                label: "Contraseña actual",
                value: currentPassword,
                setter: setCurrentPassword,
                autoComplete: "current-password",
              },
              {
                id: "new-password",
                label: "Nueva contraseña",
                value: newPassword,
                setter: setNewPassword,
                autoComplete: "new-password",
              },
              {
                id: "confirm-password",
                label: "Confirmar nueva contraseña",
                value: confirmPassword,
                setter: setConfirmPassword,
                autoComplete: "new-password",
              },
            ].map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="mb-1 block text-sm font-medium">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type="password"
                  autoComplete={field.autoComplete}
                  required
                  minLength={field.id === "current-password" ? undefined : 8}
                  value={field.value}
                  onChange={(event) => field.setter(event.target.value)}
                  disabled={changingPassword}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
            ))}

            {passwordError && (
              <p role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {changingPassword ? "Actualizando contraseña..." : "Cambiar contraseña"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
