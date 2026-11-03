// Call only with the context returned by server-side Auth validation.
// Same menu check used by the existing Finanzas operation guard.
export function hasFinanzasWorkspaceAccess(context: any): boolean {
  const menus = context?.permisos?.menus ?? context?.permissions?.menus ?? [];
  return Array.isArray(menus) && menus.includes('finanzas');
}
