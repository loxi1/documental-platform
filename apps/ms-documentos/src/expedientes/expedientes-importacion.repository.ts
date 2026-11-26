import type { ArchivadoSql } from '../documentos/archivado/archivado.repository';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { sql } from '@documental/database';

import type {
  ExpedientesCsvResult,
} from './expedientes-csv.parser';

import type {
  SqlExecutor,
} from '../documental-v2/sql-executor';

export interface ImportacionContexto {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number;
  usuarioId: number;
  usuarioEmail: string | null;
  perfil: string | null;
  requestId: string | null;
  sessionContextId: string | null;
}

export interface ImportacionReserva {
  solicitudId: string;
  contexto: ImportacionContexto;
  nombreOriginal: string;
  periodoFecha: string;
  storageKey: string;
  r2Cuenta: string;
  r2Bucket: string;
  tamanoBytes: number;
  sha256: string;
  csv: ExpedientesCsvResult;
}

@Injectable()
export class ExpedientesImportacionRepository {

  private async validarEmpresa(
    executor: SqlExecutor,
    contexto: ImportacionContexto,
  ) {
    const rows = await executor`
      SELECT
        id,
        abreviatura,
        nombre_oficial
      FROM core.clientes_destino
      WHERE id = ${contexto.clienteDestinoId}::int
        AND abreviatura = ${contexto.empresaCodigo}
      FOR SHARE
    `;

    if (rows.length !== 1) {
      throw new ForbiddenException(
        'IMPORTACION_CONTEXTO_EMPRESARIAL_INVALIDO',
      );
    }

    return rows[0];
  }

  private validarIdentidad(
    row: Record<string, any>,
    input: ImportacionReserva,
  ) {
    const ctx = input.contexto;

    if (
      Number(row.workspace_id) !== ctx.workspaceId ||
      row.empresa_codigo !== ctx.empresaCodigo ||
      Number(row.cliente_destino_id) !== ctx.clienteDestinoId ||
      Number(row.usuario_id) !== ctx.usuarioId
    ) {
      throw new ForbiddenException(
        'IMPORTACION_SOLICITUD_CONTEXTO_INVALIDO',
      );
    }

    if (
      row.sha256 !== input.sha256 ||
      Number(row.tamano_bytes) !== input.tamanoBytes ||
      row.nombre_original !== input.nombreOriginal ||
      Number(row.total_registros) !== input.csv.totalRegistros ||
      Number(row.registros_duplicados_csv) !==
        input.csv.registrosDuplicadosCsv
    ) {
      throw new ConflictException(
        'IMPORTACION_SOLICITUD_CONTENIDO_DIFERENTE',
      );
    }
  }

  async reservar(input: ImportacionReserva) {
    return sql.begin(async (tx) => {
      const ctx = input.contexto;

      await this.validarEmpresa(tx, ctx);

      await tx`
        INSERT INTO documentos.expedientes_importaciones (
          solicitud_id,
          workspace_id,
          empresa_codigo,
          cliente_destino_id,
          usuario_id,
          usuario_email,
          nombre_original,
          periodo_fecha,
          storage_key,
          r2_cuenta,
          r2_bucket,
          tamano_bytes,
          sha256,
          total_registros,
          registros_duplicados_csv
        )
        VALUES (
          ${input.solicitudId}::uuid,
          ${ctx.workspaceId}::int,
          ${ctx.empresaCodigo},
          ${ctx.clienteDestinoId}::int,
          ${ctx.usuarioId}::int,
          ${ctx.usuarioEmail},
          ${input.nombreOriginal},
          ${input.periodoFecha}::date,
          ${input.storageKey},
          ${input.r2Cuenta},
          ${input.r2Bucket},
          ${input.tamanoBytes}::bigint,
          ${input.sha256},
          ${input.csv.totalRegistros}::int,
          ${input.csv.registrosDuplicadosCsv}::int
        )
        ON CONFLICT (solicitud_id)
        DO NOTHING
      `;

      const rows = await tx`
        SELECT *
        FROM documentos.expedientes_importaciones
        WHERE solicitud_id = ${input.solicitudId}::uuid
        FOR UPDATE
      `;

      const row = rows[0];

      if (!row) {
        throw new NotFoundException(
          'IMPORTACION_RESERVA_NO_ENCONTRADA',
        );
      }

      this.validarIdentidad(row, input);

      return row;
    });
  }

  async registrarR2Verificado(
    input: ImportacionReserva,
    evidencia: {
      cuenta: string;
      bucket: string;
      storageKey: string;
      sha256: string;
      tamanoBytes: number;
      etag: string | null;
    },
  ) {
    return sql.begin(async (tx) => {
      const rows = await tx`
        SELECT *
        FROM documentos.expedientes_importaciones
        WHERE solicitud_id = ${input.solicitudId}::uuid
        FOR UPDATE
      `;

      const row = rows[0];

      if (!row) {
        throw new NotFoundException(
          'IMPORTACION_RESERVA_NO_ENCONTRADA',
        );
      }

      this.validarIdentidad(row, input);

      if (
        row.r2_cuenta !== evidencia.cuenta ||
        row.r2_bucket !== evidencia.bucket ||
        row.storage_key !== evidencia.storageKey ||
        row.sha256 !== evidencia.sha256 ||
        Number(row.tamano_bytes) !== evidencia.tamanoBytes
      ) {
        throw new ConflictException(
          'IMPORTACION_R2_IDENTIDAD_INVALIDA',
        );
      }

      if (row.estado_importacion === 'confirmada') {
        return row;
      }

      if (row.r2_estado === 'verificado') {
        if (row.r2_etag !== evidencia.etag) {
          throw new ConflictException(
            'IMPORTACION_R2_ETAG_DIFERENTE',
          );
        }

        return row;
      }

      if (row.r2_estado !== 'pendiente') {
        throw new ConflictException(
          'IMPORTACION_R2_ESTADO_INVALIDO',
        );
      }

      const updated = await tx`
        UPDATE documentos.expedientes_importaciones
        SET
          r2_estado = 'verificado',
          evidencia = evidencia || jsonb_build_array(jsonb_build_object('evento','R2_VERIFICADO','fecha',clock_timestamp())),
          r2_etag = ${evidencia.etag},
          r2_verificado_en = now(),
          storage_provider = 'R2',
          ultimo_error_codigo = NULL,
          actualizado_en = now()
        WHERE id = ${row.id}::bigint
        RETURNING *
      `;

      return updated[0];
    });
  }

  async registrarNasVerificado(input:ImportacionReserva,evidencia:{origen:'EXPEDIENTES_IMPORTACION';
    importacionId:string;solicitudId:string;empresaCodigo:string;cuenta:string;bucket:string;
    storageKey:string;sha256:string;tamanoBytes:number;nasDestino:string}){
    return sql.begin(async tx=>{
      const [row]=await tx`SELECT * FROM documentos.expedientes_importaciones
        WHERE solicitud_id=${input.solicitudId}::uuid FOR UPDATE`;
      if(!row)throw new NotFoundException('IMPORTACION_RESERVA_NO_ENCONTRADA');
      this.validarIdentidad(row,input);
      if(evidencia.origen!=='EXPEDIENTES_IMPORTACION'||String(row.id)!==evidencia.importacionId
        ||row.solicitud_id!==evidencia.solicitudId||row.empresa_codigo!==evidencia.empresaCodigo
        ||row.storage_key!==evidencia.storageKey||row.r2_cuenta!==evidencia.cuenta||row.r2_bucket!==evidencia.bucket
        ||row.sha256!==evidencia.sha256||Number(row.tamano_bytes)!==evidencia.tamanoBytes
        ||!evidencia.nasDestino||row.estado_importacion!=='confirmada'||!row.confirmado_en
        ||row.r2_estado!=='verificado')throw new ConflictException('IMPORTACION_NAS_IDENTIDAD_INVALIDA');
      if(row.nas_estado==='verificado')return row;
      const [updated]=await tx`UPDATE documentos.expedientes_importaciones
        SET nas_destino=${evidencia.nasDestino},nas_estado='verificado',nas_verificado_en=now(),
          storage_provider='NAS',nas_sha256=${evidencia.sha256},nas_tamano_bytes=${evidencia.tamanoBytes}::bigint,
          evidencia=evidencia||jsonb_build_array(jsonb_build_object('evento','NAS_VERIFICADO','fecha',clock_timestamp())),
          ultimo_error_codigo=NULL,actualizado_en=now()
        WHERE id=${row.id}::bigint RETURNING *`;
      if(!updated)throw new ConflictException('IMPORTACION_NAS_NO_PERSISTIDA');
      return updated;
    });
  }

  async registrarErrorNas(input:ImportacionReserva,codigo:string){
    if(!/^(ARCHIVADO|IMPORTACION_NAS)_[A-Z0-9_]{1,70}$/.test(codigo))
      throw new ConflictException('IMPORTACION_NAS_ERROR_INVALIDO');
    return sql.begin(async tx=>{
      const [row]=await tx`SELECT * FROM documentos.expedientes_importaciones
        WHERE solicitud_id=${input.solicitudId}::uuid FOR UPDATE`;
      if(!row)throw new NotFoundException('IMPORTACION_RESERVA_NO_ENCONTRADA');
      this.validarIdentidad(row,input);
      if(row.estado_importacion!=='confirmada'||!['verificado','eliminacion_pendiente','eliminacion_incierta','eliminado'].includes(row.r2_estado))
        throw new ConflictException('IMPORTACION_NAS_NO_CONFIRMADA');
      if(row.r2_estado==='eliminado')return row;
      const [updated]=await tx`UPDATE documentos.expedientes_importaciones
        SET ultimo_error_codigo=${codigo},actualizado_en=now(),
          evidencia=evidencia||jsonb_build_array(jsonb_build_object('evento','NAS_ERROR','codigo',${codigo},'fecha',clock_timestamp()))
        WHERE id=${row.id}::bigint RETURNING *`;
      return updated??row;
    });
  }

  /** Atomic physical audit/state CAS using the already-reserved exclusion connection. */
  async registrarEventoArchivado(input:ImportacionReserva,evento:string,datos:Record<string,unknown>,db:ArchivadoSql){
    const ctx=input.contexto;
    if(datos.origen!=='EXPEDIENTES_IMPORTACION'||datos.solicitudId!==input.solicitudId
      ||datos.empresaCodigo!==ctx.empresaCodigo||datos.cuenta!==input.r2Cuenta||datos.bucket!==input.r2Bucket
      ||datos.sha256!==input.sha256||datos.tamanoBytes!==input.tamanoBytes||typeof datos.importacionId!=='string'||!/^[1-9]\d*$/.test(datos.importacionId))
      throw new ConflictException('IMPORTACION_NAS_IDENTIDAD_INVALIDA');
    const values:unknown[]=[input.solicitudId,ctx.workspaceId,ctx.empresaCodigo,ctx.clienteDestinoId,ctx.usuarioId,
      datos.importacionId,datos.cuenta,datos.bucket,datos.storageKey,datos.sha256,datos.tamanoBytes,
      JSON.stringify({evento,datos,usuarioId:ctx.usuarioId,workspaceId:ctx.workspaceId,empresa:ctx.empresaCodigo,clienteId:ctx.clienteDestinoId,requestId:ctx.requestId,sessionContextId:ctx.sessionContextId,perfil:ctx.perfil})];
    let set:string,condition:string;
    switch(evento){
      case 'NAS_VERIFICADO':
        if(datos.nasSha256!==datos.sha256||datos.nasTamanoBytes!==datos.tamanoBytes||typeof datos.nasDestino!=='string'||!datos.nasDestino.trim())
          throw new ConflictException('IMPORTACION_NAS_INTEGRIDAD_INVALIDA');
        values.push(datos.nasDestino,datos.nasSha256,datos.nasTamanoBytes);
        set="nas_destino=$13,nas_sha256=$14,nas_tamano_bytes=$15::bigint,nas_estado='verificado',nas_verificado_en=clock_timestamp(),storage_provider='NAS',ultimo_error_codigo=NULL";
        condition="nas_estado='pendiente' AND r2_estado='verificado'";break;
      case 'DELETE_INTENT':
        if(typeof datos.intentoId!=='string'||!/^[a-f0-9-]{36}$/i.test(datos.intentoId)||typeof datos.etag!=='string'||!datos.etag)
          throw new ConflictException('IMPORTACION_NAS_DELETE_IDENTIDAD_INVALIDA');
        values.push(datos.intentoId,datos.etag);
        set="r2_estado='eliminacion_pendiente',r2_delete_intento_id=$13::uuid,r2_delete_etag=$14,r2_delete_iniciado_en=clock_timestamp(),r2_ausencia_observada_en=NULL,ultimo_error_codigo=NULL";
        condition="nas_estado='verificado' AND storage_provider='NAS' AND r2_estado='verificado' AND r2_delete_intento_id IS NULL AND r2_etag=$14";break;
      case 'DELETE_RESPUESTA':
        if(!Number.isInteger(datos.http)||Number(datos.http)<200||Number(datos.http)>=300)throw new ConflictException('IMPORTACION_NAS_DELETE_RESPUESTA_INVALIDA');
        values.push(datos.intentoId,datos.http,datos.requestId??null);
        set="r2_delete_respuesta_http=$14::int,r2_delete_respuesta_en=clock_timestamp(),r2_delete_request_id=$15";
        condition="r2_delete_intento_id=$13::uuid AND r2_estado='eliminacion_pendiente' AND r2_delete_respuesta_http IS NULL";break;
      case 'DELETE_AUSENCIA':
        values.push(datos.intentoId);
        set="r2_estado='eliminado',r2_ausencia_observada_en=statement_timestamp(),r2_eliminado_en=statement_timestamp(),ultimo_error_codigo=NULL";
        condition="r2_delete_intento_id=$13::uuid AND r2_estado IN('eliminacion_pendiente','eliminacion_incierta') AND r2_delete_respuesta_http>=200 AND r2_delete_respuesta_http<300";break;
      case 'DELETE_INCIERTO':
        values.push(datos.intentoId);
        set="r2_estado='eliminacion_incierta',ultimo_error_codigo='IMPORTACION_NAS_DELETE_INCIERTO'";
        condition="r2_delete_intento_id=$13::uuid AND r2_estado IN('eliminacion_pendiente','eliminacion_incierta')";break;
      case 'R2_AUSENCIA_OBSERVADA':
        set="r2_ausencia_observada_en=clock_timestamp(),ultimo_error_codigo='IMPORTACION_NAS_AUSENCIA_SIN_AUTORIA'";
        condition="r2_estado='verificado' AND r2_delete_intento_id IS NULL";break;
      default:throw new ConflictException('IMPORTACION_NAS_EVENTO_INVALIDO');
    }
    const rows=await db.query<Record<string,any>>(`UPDATE documentos.expedientes_importaciones SET ${set},actualizado_en=clock_timestamp(),
      evidencia=evidencia||jsonb_build_array($12::jsonb||jsonb_build_object('fecha',clock_timestamp()))
      WHERE solicitud_id=$1::uuid AND workspace_id=$2::int AND empresa_codigo=$3 AND cliente_destino_id=$4::int
        AND usuario_id=$5::int AND id=$6::bigint AND r2_cuenta=$7 AND r2_bucket=$8 AND storage_key=$9
        AND sha256=$10 AND tamano_bytes=$11::bigint AND estado_importacion='confirmada' AND confirmado_en IS NOT NULL
        AND r2_verificado_en IS NOT NULL AND ${condition} RETURNING *`,values);
    if(rows.length!==1)throw new ConflictException('IMPORTACION_NAS_CAS_CONFLICT');
    return rows[0];
  }

  async confirmar(input: ImportacionReserva) {
    return sql.begin(async (tx) => {
      const ctx = input.contexto;

      await this.validarEmpresa(tx, ctx);

      const rows = await tx`
        SELECT *
        FROM documentos.expedientes_importaciones
        WHERE solicitud_id = ${input.solicitudId}::uuid
        FOR UPDATE
      `;

      const reserva = rows[0];

      if (!reserva) {
        throw new NotFoundException(
          'IMPORTACION_RESERVA_NO_ENCONTRADA',
        );
      }

      this.validarIdentidad(reserva, input);

      // Una solicitud confirmada nunca vuelve a insertar ni actualizar.
      if (reserva.estado_importacion === 'confirmada') {
        return reserva;
      }

      if (
        reserva.r2_estado !== 'verificado' ||
        reserva.storage_provider !== 'R2' ||
        !reserva.r2_verificado_en
      ) {
        throw new ConflictException(
          'IMPORTACION_R2_NO_VERIFICADO',
        );
      }

      const result = await tx`
        WITH nuevos AS (
          INSERT INTO documentos.expedientes (
            cliente_destino_id,
            empresa_codigo,
            codigo_expediente,
            descripcion,
            estado,
            metadata,
            creado_por,
            actualizado_por,
            creado_en,
            actualizado_en
          )
          SELECT
            ${ctx.clienteDestinoId}::int,
            ${ctx.empresaCodigo},
            csv.codigo_expediente,
            csv.descripcion,
            'abierto',
            '{}'::jsonb,
            ${ctx.usuarioId}::bigint,
            ${ctx.usuarioId}::bigint,
            now(),
            now()
          FROM jsonb_to_recordset(
            ${JSON.stringify(input.csv.rows)}::jsonb
          ) AS csv (
            codigo_expediente TEXT,
            descripcion TEXT
          )
          ORDER BY csv.codigo_expediente
          ON CONFLICT (
            empresa_codigo,
            cliente_destino_id,
            codigo_expediente
          )
          DO NOTHING
          RETURNING
            id,
            empresa_codigo,
            cliente_destino_id,
            codigo_expediente,
            descripcion,
            estado,
            metadata
        ),
        auditorias AS (
          INSERT INTO documentos.expediente_auditoria (
            expediente_id,
            accion,
            estado_anterior,
            estado_nuevo,
            codigo_anterior,
            codigo_nuevo,
            descripcion_anterior,
            descripcion_nueva,
            metadata_anterior,
            metadata_nueva,
            usuario_id,
            usuario_email,
            perfil,
            empresa_codigo,
            cliente_destino_id,
            request_id,
            session_context_id,
            detalle
          )
          SELECT
            n.id,
            'expediente.creado',
            NULL::text,
            n.estado,
            NULL::text,
            n.codigo_expediente,
            NULL::text,
            n.descripcion,
            'null'::jsonb,
            n.metadata,
            ${ctx.usuarioId}::bigint,
            ${ctx.usuarioEmail}::text,
            ${ctx.perfil}::text,
            n.empresa_codigo,
            n.cliente_destino_id,
            ${ctx.requestId}::uuid,
            ${ctx.sessionContextId}::uuid,
            jsonb_build_object(
              'origen', 'EXPEDIENTES_IMPORTACION',
              'importacionId', ${String(reserva.id)}::text,
              'solicitudId', ${input.solicitudId}::text
            )
          FROM nuevos n
          RETURNING expediente_id
        )
        SELECT
          (SELECT count(*)::int FROM nuevos) AS insertados,
          (SELECT count(*)::int FROM auditorias) AS auditados
      `;

      const insertados = Number(result[0]?.insertados);
      const auditados = Number(result[0]?.auditados);

      if (
        !Number.isInteger(insertados) ||
        insertados < 0 ||
        insertados > input.csv.rows.length ||
        auditados !== insertados
      ) {
        throw new Error(
          'IMPORTACION_RESULTADO_TRANSACCIONAL_INVALIDO',
        );
      }

      // Actualizacion masiva de descripciones.
      // Los registros nuevos ya tienen la descripcion del CSV.
      // Los anulados permanecen intactos.
      const cambios = await tx`
        WITH candidatos AS MATERIALIZED (
          SELECT
            e.id,
            e.empresa_codigo,
            e.cliente_destino_id,
            e.codigo_expediente,
            e.descripcion AS descripcion_anterior,
            csv.descripcion AS descripcion_nueva,
            e.estado,
            e.metadata
          FROM documentos.expedientes e
          JOIN jsonb_to_recordset(
            ${JSON.stringify(input.csv.rows)}::jsonb
          ) AS csv (
            codigo_expediente TEXT,
            descripcion TEXT
          )
            ON csv.codigo_expediente = e.codigo_expediente
          WHERE e.empresa_codigo = ${ctx.empresaCodigo}
            AND e.cliente_destino_id = ${ctx.clienteDestinoId}::int
            AND e.estado <> 'anulado'
            AND e.anulado_en IS NULL
            AND e.descripcion IS DISTINCT FROM csv.descripcion
          ORDER BY e.codigo_expediente
          FOR UPDATE OF e
        ),
        modificados AS (
          UPDATE documentos.expedientes e
          SET
            descripcion = c.descripcion_nueva,
            actualizado_por = ${ctx.usuarioId}::bigint,
            actualizado_en = now()
          FROM candidatos c
          WHERE e.id = c.id
            AND e.empresa_codigo = ${ctx.empresaCodigo}
            AND e.cliente_destino_id = ${ctx.clienteDestinoId}::int
            AND e.estado <> 'anulado'
            AND e.anulado_en IS NULL
            AND e.descripcion IS DISTINCT FROM c.descripcion_nueva
          RETURNING
            e.id,
            e.empresa_codigo,
            e.cliente_destino_id,
            e.codigo_expediente,
            e.descripcion,
            e.estado,
            e.metadata,
            c.descripcion_anterior
        ),
        auditorias AS (
          INSERT INTO documentos.expediente_auditoria (
            expediente_id,
            accion,
            estado_anterior,
            estado_nuevo,
            codigo_anterior,
            codigo_nuevo,
            descripcion_anterior,
            descripcion_nueva,
            metadata_anterior,
            metadata_nueva,
            usuario_id,
            usuario_email,
            perfil,
            empresa_codigo,
            cliente_destino_id,
            request_id,
            session_context_id,
            detalle
          )
          SELECT
            m.id,
            'expediente.actualizado',
            m.estado,
            m.estado,
            m.codigo_expediente,
            m.codigo_expediente,
            m.descripcion_anterior,
            m.descripcion,
            m.metadata,
            m.metadata,
            ${ctx.usuarioId}::bigint,
            ${ctx.usuarioEmail}::text,
            ${ctx.perfil}::text,
            m.empresa_codigo,
            m.cliente_destino_id,
            ${ctx.requestId}::uuid,
            ${ctx.sessionContextId}::uuid,
            jsonb_build_object(
              'origen', 'EXPEDIENTES_IMPORTACION',
              'importacionId', ${String(reserva.id)}::text,
              'solicitudId', ${input.solicitudId}::text
            )
          FROM modificados m
          RETURNING expediente_id
        )
        SELECT
          (SELECT count(*)::int FROM modificados) AS modificados,
          (SELECT count(*)::int FROM auditorias) AS auditados
      `;

      const modificados = Number(cambios[0]?.modificados);
      const cambiosAuditados = Number(cambios[0]?.auditados);

      if (
        !Number.isInteger(modificados) ||
        modificados < 0 ||
        insertados + modificados > input.csv.rows.length ||
        cambiosAuditados !== modificados
      ) {
        throw new Error(
          'IMPORTACION_MODIFICACIONES_TRANSACCIONALES_INVALIDAS',
        );
      }

      const existentes =
        input.csv.rows.length - insertados - modificados;

      const updated = await tx`
        UPDATE documentos.expedientes_importaciones
        SET
          registros_insertados = ${insertados}::int,
          registros_existentes = ${existentes}::int,
          registros_modificados = ${modificados}::int,
          estado_importacion = 'confirmada',
          evidencia = evidencia || jsonb_build_array(jsonb_build_object('evento','CONFIRMACION','fecha',clock_timestamp())),
          confirmado_en = now(),
          ultimo_error_codigo = NULL,
          actualizado_en = now()
        WHERE id = ${reserva.id}::bigint
        RETURNING *
      `;

      if (!updated[0]) {
        throw new Error(
          'IMPORTACION_CONFIRMACION_NO_PERSISTIDA',
        );
      }

      return updated[0];
    });
  }
}
