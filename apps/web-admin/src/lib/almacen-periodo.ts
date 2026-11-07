import type { AuthContext } from '../types/auth';
import type { RevisionContableParams, RevisionContableResponse } from '../types/revision-contable';
type Scope = Pick<AuthContext, 'empresa' | 'workspaceId' | 'clienteDestinoId' | 'sub' | 'sessionContextId'>;
export function almacenPeriodQueryOptions(params: RevisionContableParams, scope: Scope | null,
  fetchPage: (params: RevisionContableParams, signal: AbortSignal) => Promise<RevisionContableResponse>, readScope: () => Scope | null) {
  const identity = (s: Scope | null) => s ? JSON.stringify([s.empresa.trim().toUpperCase(), s.workspaceId, String(s.clienteDestinoId ?? ''), s.sub, s.sessionContextId]) : null;
  const expected = identity(scope);
  const enabled = Boolean(scope?.empresa.trim() && Number(scope.workspaceId) > 0 && Number.isInteger(params.anio) && Number(params.anio) > 0 && Number.isInteger(params.mes) && Number(params.mes) >= 1 && Number(params.mes) <= 12);
  return { queryKey: ['revision-contable', 'ALMACEN', expected, params], enabled,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const check = () => { if (signal.aborted || !enabled || identity(readScope()) !== expected) throw new Error('ALMACEN_PERIODO_O_CONTEXTO_OBSOLETO'); };
      check(); const result = await fetchPage(params, signal); check(); return result;
    }, placeholderData: () => undefined, staleTime: 0, retry: false as const,
    refetchOnWindowFocus: false, refetchOnReconnect: false };
}
