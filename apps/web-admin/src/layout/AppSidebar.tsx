// src/layout/AppSidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  AlertTriangle,
  ClipboardList,
  FileSearch,
  FolderKanban,
  LayoutDashboard,
  Scale,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

type AppSidebarProps = {
  userCod?: string | null;
};

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Gestión",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        name: "Expedientes",
        path: "/expedientes",
        icon: <FolderKanban className="h-4 w-4" />,
      },
      {
        name: "Documentos",
        path: "/documentos",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        name: "OCR Resultados",
        path: "/ocr-resultados",
        icon: <FileSearch className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Contabilidad",
    items: [
      {
        name: "Revisión contable",
        path: "/revision-contable",
        icon: <Scale className="h-4 w-4" />,
      },
      {
        name: "Alertas",
        path: "/alertas",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        name: "Configuración",
        path: "/configuracion",
        icon: <Settings className="h-4 w-4" />,
        badge: "Soon",
      },
    ],
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ userCod }) => {
  const pathname = usePathname();
  const { contexto, hasPermission } = useAuth();
  const {
    isMobileOpen,
    isCollapsed,
    setIsHovered,
    toggleMobileSidebar,
    toggleSidebar,
  } = useSidebar();

  const isActive = (href = "") =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleMobileNavigate = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (contexto?.perfil === "admin") return true;
        if (item.path === "/dashboard")
          return Boolean(contexto?.permisos?.length);
        if (item.path === "/documentos") return hasPermission("documentos.ver");
        if (item.path === "/ocr-resultados")
          return hasPermission("documentos.validar");
        if (item.path === "/expedientes")
          return hasPermission("documentos.ver");
        if (item.path === "/revision-contable")
          return hasPermission("finanzas.ver");
        if (item.path === "/alertas") return hasPermission("documentos.ver");
        return false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      role="navigation"
      aria-label="Menú principal"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-white/10 dark:bg-[#07111f]
        ${isCollapsed ? "lg:w-16" : "lg:w-64"} w-64
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div
        className={`flex h-16 items-center border-b border-slate-100 dark:border-white/10 ${isCollapsed ? "justify-center px-3" : "justify-between px-5"}`}
      >
        <Link
          href="/dashboard"
          className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}
          onClick={handleMobileNavigate}
          title="Documental Platform"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-950 dark:text-white">
            <Image
              src="/logo.svg"
              alt="Documental Platform"
              width={32}
              height={32}
              priority
              className="block h-7 w-auto dark:hidden"
            />
            <Image
              src="/logo-dark.svg"
              alt="Documental Platform"
              width={32}
              height={32}
              priority
              className="hidden h-7 w-auto dark:block"
            />
          </span>
          {!isCollapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-slate-950 dark:text-white">
                Gestión Documental
              </span>
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        className={`flex-1 overflow-y-auto py-5 ${isCollapsed ? "px-2" : "px-4"}`}
      >
        <div className="space-y-7">
          {visibleGroups.map((group) => (
            <section key={group.label}>
              {!isCollapsed ? (
                <h3 className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {group.label}
                </h3>
              ) : (
                <div className="my-3 border-t border-slate-200 dark:border-white/10" />
              )}
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={handleMobileNavigate}
                        aria-current={active ? "page" : undefined}
                        title={isCollapsed ? item.name : undefined}
                        className={`group flex items-center rounded-lg text-sm transition-colors duration-150 ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3"} ${
                          active
                            ? "bg-slate-100 text-slate-950 font-semibold dark:bg-white/10 dark:text-white"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                        } ${item.badge ? "opacity-80" : ""}`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                            active
                              ? "text-slate-950 dark:text-white"
                              : "text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">
                              {item.name}
                            </span>
                            {item.badge ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      <div
        className={`border-t border-slate-100 dark:border-white/10 ${isCollapsed ? "p-3" : "p-4"}`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className={`flex w-full items-center rounded-lg text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3"}`}
          title={
            contexto ? `${contexto.empresa} · ${contexto.perfil}` : "Contexto"
          }
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          {!isCollapsed ? (
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {contexto?.empresa || "Sin empresa"}
              </span>
              <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                {contexto?.perfil || "sin perfil"}
              </span>
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
