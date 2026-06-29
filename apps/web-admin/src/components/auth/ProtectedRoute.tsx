"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession, getAuthSession } from "@/lib/auth-storage";
import { canAccessPath, getDefaultPathForContext, getRouteAccessLabel } from "@/lib/workspace-navigation";
import { validateToken } from "@/services/auth";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const publicRoutes = ["/login", "/seleccionar-contexto"];

function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.location.replace("/login");
}

function AccessDenied({ moduleLabel, fallbackPath }: { moduleLabel: string; fallbackPath: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950 dark:bg-[#050816] dark:text-white">
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-sm dark:bg-white/[0.03]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm font-medium text-muted-foreground">Acceso restringido</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">No tienes permiso para acceder a {moduleLabel}.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tu espacio de trabajo actual no incluye este módulo. Cambia de workspace o vuelve a una pantalla permitida.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href={fallbackPath}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            Ir a mi módulo
          </Link>
          <Link
            href="/mi-perfil"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-muted"
          >
            Ver Mi Perfil
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState<{ moduleLabel: string; fallbackPath: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
      const session = getAuthSession();
      setAccessDenied(null);

      if (isPublicRoute) {
        if (active) {
          setAccessDenied(null);
          setChecking(false);
        }
        return;
      }

      if (!session?.accessToken) {
        clearAuthSession();
        redirectToLogin();
        return;
      }

      try {
        const result = await validateToken(session.accessToken);
        if (!result.valid) {
          clearAuthSession();
          redirectToLogin();
          return;
        }

        if (!canAccessPath(pathname, session.contexto)) {
          if (active) {
            setAccessDenied({
              moduleLabel: getRouteAccessLabel(pathname),
              fallbackPath: getDefaultPathForContext(session.contexto),
            });
            setChecking(false);
          }
          return;
        }

        if (active) setChecking(false);
      } catch {
        clearAuthSession();
        redirectToLogin();
      }
    }

    setChecking(true);
    checkAuth();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (checking && !publicRoutes.some((route) => pathname.startsWith(route))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Validando sesión...
      </div>
    );
  }

  if (accessDenied && !publicRoutes.some((route) => pathname.startsWith(route))) {
    return <AccessDenied moduleLabel={accessDenied.moduleLabel} fallbackPath={accessDenied.fallbackPath} />;
  }

  return <>{children}</>;
}
