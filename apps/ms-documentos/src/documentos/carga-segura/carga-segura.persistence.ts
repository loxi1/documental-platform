import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import { CargaSeguraError } from './carga-segura.errors';
import type {
  CargaSeguraPersistenciaInput,
  CargaSeguraPersistenciaResult,
} from './carga-segura.types';

type QueryRow = Record<string, unknown>;

@Injectable()
export class CargaSeguraPersistence {
  async persistir(
    input: CargaSeguraPersistenciaInput,
  ): Promise<CargaSeguraPersistenciaResult> {
    return sql.begin(async (tx) => {
      const operacionRows = await tx`
        SELECT
          id,
          estado,
          workspace_id,
          empresa_codigo,
          cliente_destino_id,
          expediente_id,
          actor_id,
          idempotency_key,
          request_id,
          correlation_id,
          canal_ingreso,
          nombre_archivo_original,
          content_type,
          tamano_bytes,
          hash_sha256,
          storage_provider,
          storage_bucket,
          storage_key
        FROM documentos.carga_operaciones
        WHERE id = ${input.operacion.id}::bigint
        FOR UPDATE
        LIMIT 1
      `;

      const operacion = operacionRows[0] as QueryRow | undefined;

      if (!operacion) {
        throw this.persistenceError('La operación de carga no existe', {
          operacionId: input.operacion.id,
        });
      }

      if (operacion.estado !== 'almacenada') {
        throw this.persistenceError(
          'La operación no está lista para persistencia',
          {
            operacionId: input.operacion.id,
            estado: operacion.estado ?? null,
            estadoEsperado: 'almacenada',
          },
        );
      }

      this.validarOperacionContraCommand(operacion, input);

      const storageProvider = this.requiredText(
        operacion.storage_provider,
        'storage_provider',
      );
      const storageBucket = this.requiredText(
        operacion.storage_bucket,
        'storage_bucket',
      );
      const storageKey = this.requiredText(
        operacion.storage_key,
        'storage_key',
      );

      const expedienteId = input.command.expedienteId;

      if (input.command.esPrincipal && expedienteId === null) {
        throw this.persistenceError(
          'Un documento principal requiere expediente',
          {
            operacionId: input.operacion.id,
          },
        );
      }

      if (expedienteId !== null) {
        await tx`
          SELECT pg_advisory_xact_lock(
            hashtextextended(
              'documentos:expediente:' ||
              ${expedienteId}::text,
              0
            )
          )
        `;

        const expedienteRows = await tx`
          SELECT
            id,
            empresa_codigo,
            cliente_destino_id
          FROM documentos.expedientes
          WHERE id = ${expedienteId}::bigint
          FOR UPDATE
          LIMIT 1
        `;

        const expediente = expedienteRows[0] as QueryRow | undefined;

        if (!expediente) {
          throw this.persistenceError('El expediente solicitado no existe', {
            expedienteId,
          });
        }

        if (String(expediente.empresa_codigo) !== input.command.empresaCodigo) {
          throw this.persistenceError(
            'El expediente no pertenece a la empresa indicada',
            {
              expedienteId,
              empresaEsperada: input.command.empresaCodigo,
              empresaActual: expediente.empresa_codigo ?? null,
            },
          );
        }

        if (
          input.command.clienteDestinoId !== null &&
          Number(expediente.cliente_destino_id) !==
            input.command.clienteDestinoId
        ) {
          throw this.persistenceError(
            'El expediente no pertenece al cliente destino indicado',
            {
              expedienteId,
              clienteDestinoIdEsperado: input.command.clienteDestinoId,
              clienteDestinoIdActual: expediente.cliente_destino_id ?? null,
            },
          );
        }

        if (input.command.esPrincipal) {
          const principalRows = await tx`
            SELECT documento_id
            FROM documentos.expediente_documentos
            WHERE expediente_id =
              ${expedienteId}::bigint
              AND es_principal = true
            ORDER BY creado_en ASC
            LIMIT 1
          `;

          if (principalRows[0]) {
            throw this.persistenceError(
              'El expediente ya tiene un documento principal',
              {
                expedienteId,
                documentoPrincipalId: Number(principalRows[0].documento_id),
              },
            );
          }
        }
      }

      const fecha = input.fecha ?? new Date();

      if (Number.isNaN(fecha.getTime())) {
        throw this.persistenceError('La fecha de persistencia es inválida');
      }

      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth() + 1;

      const documentoRows = await tx`
        INSERT INTO documentos.documentos (
          cliente_abreviatura,
          anio,
          mes,
          tipo_documental,
          estado,
          metadata,
          periodo_anio,
          periodo_mes
        )
        VALUES (
          ${input.command.empresaCodigo}::text,
          ${year}::integer,
          ${month}::integer,
          ${input.command.tipoDocumental}::text,
          'pendiente_ocr',
          ${JSON.stringify({
            origen: 'DOCUMENTOS_CARGA_SEGURA_2_1C',
            workspaceId: input.command.workspaceId,
            empresaCodigo: input.command.empresaCodigo,
            clienteDestinoId: input.command.clienteDestinoId,
            expedienteId,
            cargaOperacionId: input.operacion.id,
            canalIngreso: input.command.canalIngreso,
            tipoRelacion: input.command.tipoRelacion,
            esPrincipal: input.command.esPrincipal,
            nombreArchivo: input.command.nombreArchivo,
            contentType: input.command.contentType,
            tamanoBytes: input.command.tamanoBytes,
            hashSha256: input.operacion.hashSha256,
            ...input.command.metadata,
          })}::jsonb,
          ${year}::integer,
          ${month}::integer
        )
        RETURNING id
      `;

      const documentoId = Number(documentoRows[0]?.id);

      if (!Number.isSafeInteger(documentoId) || documentoId <= 0) {
        throw this.persistenceError('No se pudo crear el documento', {
          operacionId: input.operacion.id,
        });
      }

      const archivoRows = await tx`
        INSERT INTO documentos.documentos_archivos (
          documento_id,
          nombre_archivo,
          ruta_archivo,
          hash_sha256,
          tipo_version,
          area_origen,
          estado,
          origen_archivo,
          metadata,
          storage_provider,
          storage_bucket,
          storage_key,
          public_url,
          version,
          es_version_actual,
          workspace_id,
          empresa_codigo,
          cliente_destino_id,
          expediente_id,
          carga_operacion_id,
          creado_por
        )
        VALUES (
          ${documentoId}::integer,
          ${input.command.nombreArchivo}::text,
          ${storageKey}::text,
          ${input.operacion.hashSha256}::text,
          'original',
          ${input.command.canalIngreso}::text,
          'subido',
          ${input.command.canalIngreso}::text,
          ${JSON.stringify({
            origen: 'DOCUMENTOS_CARGA_SEGURA_2_1C',
            contentType: input.command.contentType,
            tamanoBytes: input.command.tamanoBytes,
            tipoDocumental: input.command.tipoDocumental,
            tipoRelacion: input.command.tipoRelacion,
            esPrincipal: input.command.esPrincipal,
            cargaOperacionId: input.operacion.id,
          })}::jsonb,
          ${storageProvider}::text,
          ${storageBucket}::text,
          ${storageKey}::text,
          NULL,
          1,
          true,
          ${input.command.workspaceId}::integer,
          ${input.command.empresaCodigo}::text,
          ${input.command.clienteDestinoId ?? null}::integer,
          ${expedienteId ?? null}::bigint,
          ${input.operacion.id}::bigint,
          ${input.command.actorId}::integer
        )
        RETURNING id
      `;

      const archivoId = Number(archivoRows[0]?.id);

      if (!Number.isSafeInteger(archivoId) || archivoId <= 0) {
        throw this.persistenceError('No se pudo crear el archivo documental', {
          operacionId: input.operacion.id,
          documentoId,
        });
      }

      if (expedienteId !== null) {
        await tx`
          INSERT INTO documentos.expediente_documentos (
            expediente_id,
            documento_id,
            tipo_relacion,
            es_principal,
            orden
          )
          VALUES (
            ${expedienteId}::bigint,
            ${documentoId}::integer,
            ${input.command.tipoRelacion ?? null}::text,
            ${input.command.esPrincipal}::boolean,
            ${input.command.esPrincipal ? 1 : 0}::integer
          )
        `;
      }

      const eventKey =
        `carga-segura:${input.operacion.id}:` + 'documento-creado:v1';

      await tx`
        INSERT INTO documentos.documento_eventos_outbox (
          event_key,
          evento_version,
          carga_operacion_id,
          workspace_id,
          empresa_codigo,
          cliente_destino_id,
          expediente_id,
          documento_id,
          archivo_id,
          actor_id,
          tipo_evento,
          aggregate_type,
          aggregate_id,
          request_id,
          correlation_id,
          idempotency_key,
          payload,
          headers,
          estado
        )
        VALUES (
          ${eventKey}::text,
          1,
          ${input.operacion.id}::bigint,
          ${input.command.workspaceId}::integer,
          ${input.command.empresaCodigo}::text,
          ${input.command.clienteDestinoId ?? null}::integer,
          ${expedienteId ?? null}::bigint,
          ${documentoId}::integer,
          ${archivoId}::integer,
          ${input.command.actorId}::integer,
          'documento.carga-segura.creada',
          'documento',
          ${String(documentoId)}::text,
          ${input.command.requestId ?? null}::text,
          ${
            input.command.correlationId ?? input.command.requestId ?? null
          }::text,
          ${input.command.idempotencyKey}::text,
          ${JSON.stringify({
            operacionId: input.operacion.id,
            documentoId,
            archivoId,
            expedienteId,
            workspaceId: input.command.workspaceId,
            empresaCodigo: input.command.empresaCodigo,
            clienteDestinoId: input.command.clienteDestinoId,
            actorId: input.command.actorId,
            canalIngreso: input.command.canalIngreso,
            tipoDocumental: input.command.tipoDocumental,
            tipoRelacion: input.command.tipoRelacion,
            esPrincipal: input.command.esPrincipal,
            nombreArchivo: input.command.nombreArchivo,
            contentType: input.command.contentType,
            tamanoBytes: input.command.tamanoBytes,
            hashSha256: input.operacion.hashSha256,
            storageProvider,
            storageBucket,
            storageKey,
          })}::jsonb,
          ${JSON.stringify({
            requestId: input.command.requestId,
            correlationId:
              input.command.correlationId ?? input.command.requestId,
            idempotencyKey: input.command.idempotencyKey,
            eventoVersion: 1,
          })}::jsonb,
          'pendiente'
        )
      `;

      const completedRows = await tx`
        UPDATE documentos.carga_operaciones
        SET
          estado = 'completada',
          documento_id =
            ${documentoId}::integer,
          archivo_id = ${archivoId}::integer,
          completada_en = now(),
          actualizado_en = now(),
          requiere_reconciliacion = false,
          error_codigo = NULL,
          error_detalle = NULL
        WHERE id =
          ${input.operacion.id}::bigint
          AND estado = 'almacenada'
        RETURNING id
      `;

      if (!completedRows[0]) {
        throw this.persistenceError(
          'No se pudo completar la operación de carga',
          {
            operacionId: input.operacion.id,
            documentoId,
            archivoId,
          },
        );
      }

      return {
        operacionId: input.operacion.id,
        documentoId,
        archivoId,
        expedienteId,
        outboxEventKey: eventKey,
      };
    });
  }

  private validarOperacionContraCommand(
    operacion: QueryRow,
    input: CargaSeguraPersistenciaInput,
  ): void {
    const mismatches: Record<
      string,
      {
        operacion: unknown;
        command: unknown;
      }
    > = {};

    const compare = (
      field: string,
      operationValue: unknown,
      commandValue: unknown,
    ) => {
      const left =
        operationValue === null || operationValue === undefined
          ? null
          : String(operationValue);

      const right =
        commandValue === null || commandValue === undefined
          ? null
          : String(commandValue);

      if (left !== right) {
        mismatches[field] = {
          operacion: operationValue ?? null,
          command: commandValue ?? null,
        };
      }
    };

    compare('workspaceId', operacion.workspace_id, input.command.workspaceId);
    compare(
      'empresaCodigo',
      operacion.empresa_codigo,
      input.command.empresaCodigo,
    );
    compare(
      'clienteDestinoId',
      operacion.cliente_destino_id,
      input.command.clienteDestinoId,
    );
    compare(
      'expedienteId',
      operacion.expediente_id,
      input.command.expedienteId,
    );
    compare('actorId', operacion.actor_id, input.command.actorId);
    compare(
      'idempotencyKey',
      operacion.idempotency_key,
      input.command.idempotencyKey,
    );
    compare(
      'canalIngreso',
      operacion.canal_ingreso,
      input.command.canalIngreso,
    );
    compare(
      'nombreArchivo',
      operacion.nombre_archivo_original,
      input.command.nombreArchivo,
    );
    compare('contentType', operacion.content_type, input.command.contentType);
    compare('tamanoBytes', operacion.tamano_bytes, input.command.tamanoBytes);
    compare('hashSha256', operacion.hash_sha256, input.operacion.hashSha256);

    if (Object.keys(mismatches).length > 0) {
      throw this.persistenceError(
        'La operación almacenada no coincide con el comando',
        {
          operacionId: input.operacion.id,
          mismatches,
        },
      );
    }
  }

  private requiredText(value: unknown, field: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw this.persistenceError(`La operación no tiene ${field}`, { field });
    }

    return normalized;
  }

  private persistenceError(
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ): CargaSeguraError {
    return new CargaSeguraError(
      'CARGA_SEGURA_PERSISTENCE_FAILED',
      message,
      details,
    );
  }
}
