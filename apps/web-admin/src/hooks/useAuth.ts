"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { validateToken } from "@/services/auth";
import {
  clearAuthSession,
  getAuthSession,
  getContexto,
  hasAction,
  hasMenu,
  hasPermission,
} from "@/lib/auth-storage";
import type { AuthContext, AuthSession } from "@/types/auth";

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(() => {
    const current = getAuthSession();
    setSession(current);
    setLoading(false);
    return current;
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
    router.replace("/login");
  }, [router]);

  const validateCurrentSession = useCallback(async () => {
    const current = getAuthSession();
    if (!current?.accessToken) {
      setSession(null);
      setLoading(false);
      return false;
    }

    try {
      const result = await validateToken(current.accessToken);
      if (!result.valid) {
        clearAuthSession();
        setSession(null);
        return false;
      }

      setSession(current);
      return true;
    } catch {
      clearAuthSession();
      setSession(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const contexto = useMemo<AuthContext | null>(() => session?.contexto ?? getContexto(), [session]);

  return {
    session,
    contexto,
    loading,
    isAuthenticated: Boolean(session?.accessToken),
    refreshSession,
    validateCurrentSession,
    logout,
    hasPermission,
    hasMenu,
    hasAction,
  };
}
