"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}
