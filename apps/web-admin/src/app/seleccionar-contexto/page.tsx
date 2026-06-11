"use client";

import { Building2, FileText, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getLoginResult, saveAuthSession } from "@/lib/auth-storage";
import { selectContext } from "@/services/auth";
import type { LoginResult, AuthAccess } from "@/types/auth";

export default function SeleccionarContextoPage() {
  const router = useRouter();
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getLoginResult();
    if (!current) {
      router.replace("/login");
      return;
    }

    setLoginResult(current);
  }, [router]);

  const handleSelect = async (access: AuthAccess) => {
    if (!loginResult) return;

    const key = `${access.sistema}-${access.empresa_codigo}`;
    setLoadingKey(key);
    setError(null);

    try {
      const session = await selectContext(
        loginResult.usuario.id,
        access.sistema,
        access.empresa_codigo,
      );
      saveAuthSession(session);
      router.replace("/dashboard");
    } catch {
      setError("No se pudo seleccionar el contexto. Verifica el API Gateway.");
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Selecciona un acceso</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hola {loginResult?.usuario.nombres ?? "usuario"}. Elige empresa y sistema para continuar.
            </p>
          </div>

          {error ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {(loginResult?.accesos ?? []).map((access) => {
              const key = `${access.sistema}-${access.empresa_codigo}`;
              const loading = loadingKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(access)}
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
                          {access.sistema_nombre || "Gestión Documental"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {access.sistema}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {access.perfil}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
                      <p className="text-base font-semibold">{access.empresa_codigo}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground">
                    {access.permisos.length} permisos disponibles para este contexto.
                  </p>

                  <div className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition group-hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    {loading ? "Ingresando..." : "Entrar a este contexto"}
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
