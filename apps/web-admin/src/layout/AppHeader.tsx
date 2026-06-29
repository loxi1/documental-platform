"use client";

import LogoutButton from "@/components/auth/LogoutButton";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";

type Props = {
  userCod?: string | null;
};

export default function AppHeader({ userCod }: Props) {
  const { toggleMobileSidebar, toggleSidebar, isCollapsed } = useSidebar();
  const { contexto } = useAuth();

  const userName = contexto?.nombres || userCod || "Administrador";
  const empresa = contexto?.empresa || "Sin empresa";
  const perfil = contexto?.perfil
    ? contexto.perfil
        .replace(/_/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : "Sin perfil";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-background/85 backdrop-blur-xl dark:border-white/10">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            onClick={toggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 lg:inline-flex"
            aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
            title={isCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <div className="min-w-0">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/mi-perfil"
            className="hidden min-w-0 rounded-xl px-3 py-2 text-right transition-colors hover:bg-slate-100 dark:hover:bg-white/5 sm:block"
            title="Ver perfil y espacio de trabajo"
          >
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {empresa} · {perfil}
            </p>
          </Link>

          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </button>
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
