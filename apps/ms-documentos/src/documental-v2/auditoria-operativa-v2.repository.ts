import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

type JsonRecord = Record<string, unknown>;

type AccionAuditoriaV2 =
  | 'MATERIALIZAR_CONTEXTO_OPERATIVO'
  | 'ASOCIAR_DOCUMENTO_PRINCIPAL'
  | 'GRUPO_FACTURA_CREADO'
  | 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO';

export interface RegistrarAuditoriaOperativaV2Input {
  accion: AccionAuditoriaV2;
  entidad:
    | 'contenedor_operativo'
    | 'documento_operativo_principal'
    | 'grupo_factura'
    | 'grupo_factura_documento';
  entidadId: string | number;
  descripcion: string;
  empresaCodigo?: string | null;
  usuario?: unknown;
  antes?: JsonRecord | null;
  despues?: JsonRecord | null;
}

/**
 * Auditoría operativa V2.
 *
 * Escribe filas físicas en core.auditoria_eventos usando solo columnas existentes.
 * No registrar llamadas idempotentes ni rechazos funcionales por ahora.
 */
@Injectable()
export class AuditoriaOperativaV2Repository {
  async registrarCreacion(input: RegistrarAuditoriaOperativaV2Input): Promise<void> {
    const contexto = normalizarContexto(input.usuario);
    const despues = limpiarJson({
      ...(input.despues ?? {}),
      resultadoOperacion: 'CREADO',
      usuarioEmail: contexto.usuarioEmail,
      correlationId: contexto.correlationId,
      origen: contexto.origen ?? 'api-gateway',
    });

    await sql`
      INSERT INTO core.auditoria_eventos (
        workspace_id,
        session_context_id,
        request_id,
        usuario_id,
        empresa_codigo,
        sistema_codigo,
        perfil_codigo,
        modulo,
        entidad,
        entidad_id,
        accion,
        descripcion,
        antes,
        despues
      ) VALUES (
        ${contexto.workspaceId},
        ${contexto.sessionContextId},
        ${contexto.requestId},
        ${contexto.usuarioId},
        ${input.empresaCodigo ?? contexto.empresaCodigo},
        ${contexto.sistemaCodigo},
        ${contexto.perfilCodigo},
        ${'documental-v2'},
        ${input.entidad},
        ${String(input.entidadId)},
        ${input.accion},
        ${input.descripcion},
        ${input.antes ? JSON.stringify(input.antes) : null}::jsonb,
        ${JSON.stringify(despues)}::jsonb
      )
    `;
  }
}

function normalizarContexto(usuario: unknown) {
  const record = asRecord(usuario);

  return {
    workspaceId: toInteger(record.workspaceId ?? record.workspace_id),
    sessionContextId: toUuid(record.sessionContextId ?? record.session_context_id),
    requestId: toUuid(record.requestId ?? record.request_id),
    usuarioId: toInteger(record.usuarioId ?? record.usuario_id ?? record.id),
    usuarioEmail: toText(record.usuarioEmail ?? record.usuario_email ?? record.email),
    empresaCodigo: toText(record.empresaCodigo ?? record.empresa_codigo),
    sistemaCodigo: toText(record.sistemaCodigo ?? record.sistema_codigo),
    perfilCodigo: toText(record.perfilCodigo ?? record.perfil_codigo),
    correlationId: toUuid(record.correlationId ?? record.correlation_id),
    origen: toText(record.origen),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function toInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toUuid(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function limpiarJson(input: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
