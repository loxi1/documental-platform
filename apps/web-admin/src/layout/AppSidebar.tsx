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
    label: "Gestión documental",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        description: "Indicadores",
      },
      {
        name: "Expedientes",
        path: "/expedientes",
        icon: <FolderKanban className="h-4 w-4" />,
        description: "Unidad principal",
      },
      {
        name: "Documentos",
        path: "/documentos",
        icon: <ClipboardList className="h-4 w-4" />,
        description: "Buscador global",
      },
      {
        name: "OCR Resultados",
        path: "/ocr-resultados",
        icon: <FileSearch className="h-4 w-4" />,
        description: "Validación OCR",
      },
    ],
  },
  {
    label: "Control contable",
    items: [
      {
        name: "Revisión contable",
        path: "/revision-contable",
        icon: <Scale className="h-4 w-4" />,
        description: "Periodo mensual",
      },
      {
        name: "Alertas",
        path: "/alertas",
        icon: <AlertTriangle className="h-4 w-4" />,
        description: "Observaciones",
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
        description: "Próximamente",
        badge: "Soon",
      },
    ],
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ userCod }) => {
  const pathname = usePathname();
  const { contexto, hasPermission } = useAuth();
  const { isMobileOpen, setIsHovered, toggleMobileSidebar } = useSidebar();

  const isActive = (href = "") => pathname === href || pathname.startsWith(`${href}/`);

  const handleMobileNavigate = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (contexto?.perfil === "admin") return true;
        if (item.path === "/dashboard") return Boolean(contexto?.permisos?.length);
        if (item.path === "/documentos") return hasPermission("documentos.ver");
        if (item.path === "/ocr-resultados") return hasPermission("documentos.validar");
        if (item.path === "/expedientes") return hasPermission("documentos.ver");
        if (item.path === "/revision-contable") return hasPermission("finanzas.ver");
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
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/30 backdrop-blur-xl transition-transform duration-300 dark:border-white/10 dark:bg-[#07111f]/95 dark:shadow-black/20
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5 dark:border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={handleMobileNavigate}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10">
            <Image
              src="/logo.svg"
              alt="Documental Platform"
              width={34}
              height={34}
              priority
              className="block h-8 w-auto dark:hidden"
            />
            <Image
              src="/logo-dark.svg"
              alt="Documental Platform"
              width={34}
              height={34}
              priority
              className="hidden h-8 w-auto dark:block"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">
              Documental
            </span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
              Expedientes y OCR
            </span>
          </span>
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

      <div className="px-5 py-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-white/10 dark:from-white/10 dark:to-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
              {contexto?.nombres?.slice(0, 1).toUpperCase() || userCod?.slice(0, 1).toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {contexto?.nombres || userCod || "Administrador"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {contexto ? `${contexto.empresa} · ${contexto.perfil}` : "Sin contexto"}
              </p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sesión activa
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {group.label}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={handleMobileNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
                        active
                          ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      } ${item.badge ? "opacity-80" : ""}`}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" />
                      ) : null}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          active
                            ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950"
                            : "bg-slate-100 text-slate-500 group-hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-white/15"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.name}</span>
                        {item.description ? (
                          <span
                            className={`block truncate text-xs ${
                              active
                                ? "text-white/70 dark:text-slate-700"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      {item.badge ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            active
                              ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950"
                              : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4 dark:border-white/10">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Contexto seguro</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {contexto ? `${contexto.sistema} · ${contexto.empresa} · permisos por perfil.` : "Permisos por perfil."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
