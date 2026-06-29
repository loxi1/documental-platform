"use client";

import { BellRing, ClipboardCheck, Eye, EyeOff, FileText, FolderKanban, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getWorkspaces, login as loginRequest, selectWorkspace } from "@/services/auth";
import { saveAuthSession, saveLoginResult, saveWorkspaces } from "@/lib/auth-storage";
import { getDefaultPathForContext } from "@/lib/workspace-navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginRequest(email, password);
      const workspacesResult = await getWorkspaces(result.identityToken);
      const workspaces = workspacesResult.workspaces ?? [];
      const loginWithWorkspaces = { ...result, workspaces };
      saveLoginResult(loginWithWorkspaces);
      saveWorkspaces(workspaces);

      const favoriteWorkspace = workspaces.find((workspace) => workspace.esFavorito);
      const autoWorkspace = favoriteWorkspace ?? (workspaces.length === 1 ? workspaces[0] : null);

      if (autoWorkspace) {
        const session = await selectWorkspace(
          result.identityToken,
          autoWorkspace.workspaceId,
          Boolean(favoriteWorkspace),
        );
        saveAuthSession(session);
        router.replace(getDefaultPathForContext(session.contexto));
        return;
      }

      router.replace("/seleccionar-contexto");
    } catch (err) {
      setError("No se pudo iniciar sesión. Revisa el correo, la clave o el API Gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950 dark:bg-[#050816] dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#07111f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.28),transparent_34%),radial-gradient(circle_at_78%_74%,rgba(14,165,233,0.2),transparent_38%),linear-gradient(135deg,#07111f_0%,#0f172a_55%,#08111f_100%)]" />
          <div className="absolute inset-0 bg-slate-950/35" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0B1221] shadow-xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">Documental Platform</p>
              <p className="text-sm text-white/60">Gestión documental y expedientes</p>
            </div>
          </div>

          <div className="relative z-10 max-w-xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-sm font-medium text-slate-100 shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Acceso seguro por empresa y perfil
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm">
                Administra tus documentos sin perder el control.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-200">
                Revisa expedientes, documentos pendientes, alertas y validaciones contables desde un solo lugar.
              </p>
            </div>

            <div className="grid max-w-xl gap-3">
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/12 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Documentos listos para revisar</p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">Factura, orden, guía, nota de ingreso y pagos reunidos por expediente.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/12 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Seguimiento por expediente</p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">Consulta el estado, la trazabilidad y los documentos vinculados sin salir del panel.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/12 p-4 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Pendientes y alertas visibles</p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">Detecta qué falta completar y qué requiere atención de cada área.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-300">© {currentYear} Loxi1 · BBTI</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Image src="/logo.svg" alt="Documental Platform" width={140} height={42} priority className="h-10 w-auto dark:hidden" />
              <Image src="/logo-dark.svg" alt="Documental Platform" width={140} height={42} priority className="hidden h-10 w-auto dark:block" />
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
              <div className="mb-8 space-y-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Bienvenido</p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Iniciar sesión</h2>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Ingresa con tu correo corporativo. Luego podrás elegir tu empresa y perfil de trabajo.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="usuario@empresa.com"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/40 dark:focus:ring-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/40 dark:focus:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <input type="checkbox" className="h-4 w-4 rounded border-border" />
                    Recordar sesión
                  </label>
                  <Link href="#" className="font-semibold text-slate-950 hover:underline dark:text-white">
                    ¿Olvidaste tu clave?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                >
                  {loading ? "Ingresando..." : "Continuar"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
