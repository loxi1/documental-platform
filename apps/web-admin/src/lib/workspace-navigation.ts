import type { AuthContext } from "@/types/auth";

type RouteAccessRule = {
  prefix: string;
  label: string;
  menuKey?: string;
  actionKeys?: string[];
  alwaysVisible?: boolean;
  adminOnly?: boolean;
};

export const workspaceRouteRules: RouteAccessRule[] = [
  { prefix: "/mi-perfil", label: "Mi Perfil", alwaysVisible: true },
  { prefix: "/configuracion", label: "Configuración", adminOnly: true },
  { prefix: "/dashboard", label: "Dashboard", menuKey: "dashboard" },
  { prefix: "/expedientes", label: "Expedientes", menuKey: "expedientes" },
  { prefix: "/compras", label: "Compras", menuKey: "compras" },
  { prefix: "/almacen", label: "Almacén", menuKey: "almacen" },
  { prefix: "/finanzas", label: "Finanzas", menuKey: "finanzas" },
  { prefix: "/documentos/cargar", label: "Carga guiada", menuKey: "documentos" },
  { prefix: "/carga-guiada", label: "Carga guiada", menuKey: "documentos" },
  { prefix: "/ocr-resultados", label: "OCR Resultados", menuKey: "documentos" },
  { prefix: "/documentos", label: "Documentos", menuKey: "documentos" },
  { prefix: "/revision-contable", label: "Revisión contable", menuKey: "revision_contable" },
  { prefix: "/alertas", label: "Alertas", menuKey: "alertas" },
].sort((a, b) => b.prefix.length - a.prefix.length);

const defaultRouteOrder = [
  "/dashboard",
  "/revision-contable",
  "/documentos",
  "/compras",
  "/almacen",
  "/finanzas",
  "/expedientes",
  "/alertas",
  "/mi-perfil",
];

function isAdmin(contexto?: AuthContext | null) {
  return contexto?.perfil === "admin";
}

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function findRule(pathname: string) {
  return workspaceRouteRules.find((rule) => matchesPath(pathname, rule.prefix));
}

export function canAccessPath(pathname: string, contexto?: AuthContext | null) {
  if (!contexto) return false;
  if (isAdmin(contexto)) return true;

  const rule = findRule(pathname);
  if (!rule) return false;
  if (rule.alwaysVisible) return true;
  if (rule.adminOnly) return false;

  const menus = contexto.permisos?.menus ?? [];
  const hasMenu = rule.menuKey ? menus.includes(rule.menuKey) : false;

  // Las rutas técnicas de documentos/carga/OCR no se habilitan por acciones.
  // Para perfiles operativos se accede a esas funciones desde su módulo principal
  // (/compras, /almacen, /finanzas, /revision-contable), no como menú/ruta directa.
  return hasMenu;
}

export function getDefaultPathForContext(contexto?: AuthContext | null) {
  if (!contexto) return "/login";
  if (isAdmin(contexto)) return "/dashboard";

  return defaultRouteOrder.find((path) => canAccessPath(path, contexto)) ?? "/mi-perfil";
}

export function getRouteAccessLabel(pathname: string) {
  return findRule(pathname)?.label ?? "este módulo";
}