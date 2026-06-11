"use client";

import { Eye, EyeOff, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { login as loginRequest, selectContext } from "@/services/auth";
import { saveAuthSession, saveLoginResult } from "@/lib/auth-storage";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("admin@documental.local");
  const [password, setPassword] = useState("Admin123*");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginRequest(email, password);
      saveLoginResult(result);

      if (result.accesos.length === 1) {
        const access = result.accesos[0];
        const session = await selectContext(result.usuario.id, access.sistema, access.empresa_codigo);
        saveAuthSession(session);
        router.replace("/dashboard");
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
        <section className="relative hidden overflow-hidden bg-[#0B1221] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-70">
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          </div>

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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/75 backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Acceso seguro por empresa y sistema
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-semibold leading-tight tracking-tight">
                Administra expedientes, alertas y trazabilidad documental.
              </h1>
              <p className="max-w-lg text-base leading-7 text-white/65">
                Centraliza OCR, documentos, revisión contable y seguimiento operativo desde un solo panel.
              </p>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-semibold">OCR</p>
                <p className="mt-1 text-xs text-white/55">Captura documental</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-semibold">EXP</p>
                <p className="mt-1 text-xs text-white/55">Expedientes</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-semibold">ALR</p>
                <p className="mt-1 text-xs text-white/55">Alertas</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-white/45">© {currentYear} Loxi1 · BBTI</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Image src="/logo.svg" alt="Documental Platform" width={140} height={42} priority className="h-10 w-auto dark:hidden" />
              <Image src="/logo-dark.svg" alt="Documental Platform" width={140} height={42} priority className="hidden h-10 w-auto dark:block" />
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
              <div className="mb-8 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Bienvenido</p>
                <h2 className="text-3xl font-semibold tracking-tight">Iniciar sesión</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Ingresa con tu correo corporativo. Luego seleccionaremos el contexto de trabajo.
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
                      placeholder="admin@documental.local"
                      className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 dark:focus:ring-white/10"
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
                      className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-11 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 dark:focus:ring-white/10"
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
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" className="h-4 w-4 rounded border-border" />
                    Recordar sesión
                  </label>
                  <Link href="#" className="font-medium text-slate-900 hover:underline dark:text-white">
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
