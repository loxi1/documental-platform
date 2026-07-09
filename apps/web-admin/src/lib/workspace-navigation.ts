import type { AuthContext } from "@/types/auth";

type RouteAccessRule = {
  prefix: string;
  label: string;
  menuKey?: string;
  menuKeys?: string[];
  actionKeys?: string[];
  alwaysVisible?: boolean;
  adminOnly?: boolean;
};

export const workspaceRouteRules: RouteAccessRule[] = [
  { prefix: "/mi-perfil", label: "Mi Perfil", alwaysVisible: true },
  { prefix: "/configuracion", label: "Configuración", adminOnly: true },
  { prefix: "/dashboard", label: "Dashboard", menuKey: "dashboard" },
  { prefix: "/expedientes", label: "Expedientes", menuKey: "expedientes" },
  {
    prefix: "/workspace/expedientes-v1",
    label: "Workspace Documental V2",
    menuKeys: ["documental_v2.workspace", "workspace_documental_v2"],
    actionKeys: ["documental_v2.workspace", "workspace_documental_v2", "documental_v2.workspace.ver", "workspace_documental_v2.ver"],
  },
  {
    prefix: "/documental-v2/workspace",
    label: "Workspace Documental V2",
    menuKeys: ["documental_v2.workspace", "workspace_documental_v2"],
    actionKeys: ["documental_v2.workspace", "workspace_documental_v2", "documental_v2.workspace.ver", "workspace_documental_v2.ver"],
  },
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
  const record = (contexto ?? {}) as AuthContext & { perfilNombre?: string | null };
  const perfil = String(record.perfil ?? "").toLowerCase();
  const perfilNombre = String(record.perfilNombre ?? "").toLowerCase();

  return perfil === "admin" || perfilNombre.includes("admin");
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
  const actions = contexto.permisos?.actions ?? [];
  const routeMenuKeys = [rule.menuKey, ...(rule.menuKeys ?? [])].filter((item): item is string => Boolean(item));
  const hasMenu = routeMenuKeys.some((menuKey) => menus.includes(menuKey));
  const hasAction = rule.actionKeys?.some((actionKey) => actions.includes(actionKey)) ?? false;

  // Las rutas técnicas de documentos/carga/OCR no se habilitan por acciones.
  // Para perfiles operativos se accede a esas funciones desde su módulo principal
  // (/compras, /almacen, /finanzas, /revision-contable), no como menú/ruta directa.
  // Excepción controlada Sprint 1.6H: Workspace Documental V2 puede habilitarse
  // por acción explícita del token o por perfil admin, sin abrirlo a todos los módulos.
  return hasMenu || hasAction;
}

export function getDefaultPathForContext(contexto?: AuthContext | null) {
  if (!contexto) return "/login";
  if (isAdmin(contexto)) return "/dashboard";

  return defaultRouteOrder.find((path) => canAccessPath(path, contexto)) ?? "/mi-perfil";
}

export function getRouteAccessLabel(pathname: string) {
  return findRule(pathname)?.label ?? "este módulo";
}