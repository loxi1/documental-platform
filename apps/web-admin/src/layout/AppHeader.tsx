"use client";

import LogoutButton from "@/components/auth/LogoutButton";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu } from "lucide-react";

type Props = {
  userCod?: string | null;
};

export default function AppHeader({ userCod }: Props) {
  const { toggleMobileSidebar } = useSidebar();
  const { contexto } = useAuth();

  const userName = contexto?.nombres || userCod || "Administrador";
  const empresa = contexto?.empresa || "Sin empresa";
  const perfil = contexto?.perfil || "sin perfil";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-[#0B1221]/70">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground">
              {empresa} · {perfil}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </button>
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
