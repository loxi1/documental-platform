"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthSession, clearAuthSession } from "@/lib/auth-storage";
import { validateToken } from "@/services/auth";

const publicRoutes = ["/login", "/seleccionar-contexto"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        if (active) setChecking(false);
        return;
      }

      const session = getAuthSession();
      if (!session?.accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const result = await validateToken(session.accessToken);
        if (!result.valid) {
          clearAuthSession();
          router.replace("/login");
          return;
        }

        if (active) setChecking(false);
      } catch {
        clearAuthSession();
        router.replace("/login");
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking && !publicRoutes.some((route) => pathname.startsWith(route))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Validando sesión...
      </div>
    );
  }

  return <>{children}</>;
}
