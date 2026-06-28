"use client";

import { Building2, FileText, ShieldCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAuthSession,
  getLoginResult,
  getStoredWorkspaces,
  saveAuthSession,
  saveLoginResult,
  saveWorkspaces,
} from "@/lib/auth-storage";
import { getWorkspaces, selectWorkspace } from "@/services/auth";
import type { AuthWorkspace, LoginResult } from "@/types/auth";

function workspaceKey(workspace: AuthWorkspace) {
  return String(workspace.workspaceId);
}

export default function SeleccionarContextoPage() {
  const router = useRouter();
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<AuthWorkspace[]>([]);
  const [rememberWorkspace, setRememberWorkspace] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const current = getLoginResult();
      const activeSession = getAuthSession();
      const token = current?.identityToken ?? activeSession?.accessToken;

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoginResult(current);
      setSelectionToken(token);

      try {
        const stored = current?.workspaces?.length ? current.workspaces : getStoredWorkspaces();
        if (stored.length) setWorkspaces(stored);

        const response = await getWorkspaces(token);
        if (!mounted) return;
        setWorkspaces(response.workspaces);
        saveWorkspaces(response.workspaces);
        if (current) saveLoginResult({ ...current, workspaces: response.workspaces });
      } catch {
        if (!mounted) return;
        setError("No se pudieron cargar los espacios de trabajo. Vuelve a iniciar sesión.");
      } finally {
        if (mounted) setLoadingWorkspaces(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSelect = async (workspace: AuthWorkspace) => {
    if (!selectionToken) return;

    const key = workspaceKey(workspace);
    setLoadingKey(key);
    setError(null);

    try {
      const session = await selectWorkspace(
        selectionToken,
        workspace.workspaceId,
        rememberWorkspace,
      );
      saveAuthSession(session);
      router.replace("/dashboard");
    } catch {
      setError("No se pudo seleccionar el espacio de trabajo. Verifica el API Gateway.");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-5 py-10 text-slate-950 dark:bg-[#050816] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Contexto de trabajo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Selecciona un espacio de trabajo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hola {loginResult?.usuario.nombres ?? "usuario"}. Elige empresa, sistema y perfil para continuar.
            </p>
          </div>

          {error ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mx-auto flex max-w-2xl items-center justify-center rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm dark:bg-white/[0.03]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberWorkspace}
                onChange={(event) => setRememberWorkspace(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Recordar este espacio de trabajo para el próximo ingreso
            </label>
          </div>

          {loadingWorkspaces ? (
            <div className="rounded-3xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm dark:bg-white/[0.03]">
              Cargando espacios de trabajo...
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.map((workspace) => {
              const key = workspaceKey(workspace);
              const loading = loadingKey === key;
              const empresa = workspace.empresaCodigo || workspace.empresa;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(workspace)}
                  disabled={Boolean(loadingKey)}
                  className="group rounded-3xl border border-border bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.03] dark:hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-slate-950 group-hover:text-white dark:bg-white/10 dark:text-white dark:group-hover:bg-white dark:group-hover:text-slate-950">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {workspace.sistemaNombre || workspace.sistema || "Sistema"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {workspace.sistema}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {workspace.esFavorito ? <Star className="h-3.5 w-3.5 fill-current" /> : null}
                      {workspace.perfilNombre || workspace.perfil}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
                      <p className="text-base font-semibold">{empresa}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground">
                    {(workspace.permisos?.menus?.length ?? 0)} menús y {(workspace.permisos?.actions?.length ?? 0)} acciones disponibles.
                  </p>

                  <div className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition group-hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    {loading ? "Ingresando..." : `Entrar a ${empresa} · ${workspace.perfil}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
