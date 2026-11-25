import { randomUUID } from 'node:crypto';

export interface ArchivadoSql {
  query<T>(text: string, params: unknown[]): Promise<T[]>;
}
export type ReservaArchivado = {
  reservaId: string; empresa: string; clienteId: number; expedienteId: number | null;
  workspaceId: number | null; contexto: Record<string, unknown>; regla: string;
  anio: number; mes: number; cuenta: string; bucket: string; key: string;
  sha256: string; bytes: number; nasDestino: string; ruta: string; actorId: number | null;
};
export type ArchivadoRow = {
  id: string; contexto: {modo?:string;origenFisico?:{bucket:string;key:string};origenMaterializacion?:{bucket:string;key:string}}; evidencia?:any[]; reserva_id: string; staging_relativa: string | null; archivo_id: number; documento_id: number; version: number;
  empresa_codigo: string; cliente_destino_id: number; confirmado_en: string;
  r2_cuenta: string; r2_bucket: string; r2_key: string; r2_estado: string;
  sha256: string; tamano_bytes: string; nas_destino: string; ruta_relativa: string;
  nas_estado: string; lease_token: string; generacion: string;
  eliminacion_intento_id: string | null; eliminacion_iniciada_en: string | Date | null; delete_respuesta_intento_id: string | null;
  delete_respuesta_http: number | null; delete_respuesta_en: string | Date | null;
};
export type LeaseArchivado = { id: string; token: string; generacion: string };
const TABLE = 'documentos.archivados_documentales';
export class ArchivadoRepository {
  constructor(private readonly db: ArchivadoSql) {}

  async reservar(i: ReservaArchivado): Promise<'RESERVADO' | 'REPLAY'> {
    if (!/^[0-9a-f]{64}$/.test(i.sha256) || !Number.isSafeInteger(i.bytes) || i.bytes <= 0
      || i.key.startsWith('documentos/tmp/') || !i.ruta.startsWith('documentos/')) throw new Error('ARCHIVADO_RESERVA_INVALIDA');
    // @documental/database shares sql with Drizzle, whose JSONB serializer is transparent.
    // unsafe($n::jsonb) must receive JSON text, not a plain JavaScript object.
    const contexto = JSON.stringify(i.contexto);
    const inserted = await this.db.query<{ id: string }>(`INSERT INTO ${TABLE}
      (reserva_id,empresa_codigo,cliente_destino_id,expediente_id,workspace_origen_id,contexto,
       regla_nomenclatura,periodo_anio,periodo_mes,r2_cuenta,r2_bucket,r2_key,sha256,tamano_bytes,
       nas_destino,ruta_relativa,solicitado_por,evidencia)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        jsonb_build_array(jsonb_build_object('evento','RESERVA','actorId',$17::integer,'fecha',clock_timestamp())))
      ON CONFLICT DO NOTHING RETURNING id`, [i.reservaId,i.empresa,i.clienteId,i.expedienteId,i.workspaceId,
      contexto,i.regla,i.anio,i.mes,i.cuenta,i.bucket,i.key,i.sha256,i.bytes,i.nasDestino,i.ruta,i.actorId]);
    if (inserted.length) return 'RESERVADO';
    // A different reservation never adopts a path, including after R2 deletion.
    const matches = await this.db.query<{ id: string; r2_estado: string }>(`SELECT id,r2_estado FROM ${TABLE}
      WHERE reserva_id=$1 AND empresa_codigo=$2 AND cliente_destino_id=$3
      AND expediente_id IS NOT DISTINCT FROM $4::bigint AND workspace_origen_id IS NOT DISTINCT FROM $5::integer
      AND contexto=$6::jsonb AND regla_nomenclatura=$7 AND periodo_anio=$8 AND periodo_mes=$9
      AND r2_cuenta=$10 AND r2_bucket=$11 AND r2_key=$12 AND sha256=$13 AND tamano_bytes=$14
      AND nas_destino=$15 AND ruta_relativa=$16 AND solicitado_por IS NOT DISTINCT FROM $17::integer`, [i.reservaId,i.empresa,i.clienteId,
      i.expedienteId,i.workspaceId,contexto,i.regla,i.anio,i.mes,i.cuenta,i.bucket,i.key,
      i.sha256,i.bytes,i.nasDestino,i.ruta,i.actorId]);
    if (!matches.length) throw new Error('ARCHIVADO_COLISION_RESERVA_PERMANENTE');
    if (matches[0].r2_estado === 'ELIMINADO_ACREDITADO') throw new Error('ARCHIVADO_IDENTIDAD_YA_ARCHIVADA');
    if (['ELIMINACION_INICIADA','ELIMINACION_INCIERTA','AUSENTE_OBSERVADO'].includes(matches[0].r2_estado))
      throw new Error('ARCHIVADO_IDENTIDAD_EN_CONCILIACION');
    return 'REPLAY';
  }

  /** Invoke with the domain transaction executor, after confirmation and associations. */
  async confirmar(reservaId: string, archivoId: number, documentoId: number, version: number): Promise<void> {
    const rows = await this.db.query(`UPDATE ${TABLE} a SET archivo_id=$2,documento_id=$3,version=$4,
      expediente_id=coalesce(a.expediente_id,f.expediente_id),
      contexto=a.contexto||jsonb_build_object('documentoId',$3::integer,'archivoId',$2::integer)
        ||CASE WHEN coalesce(a.expediente_id,f.expediente_id) IS NOT NULL
           THEN jsonb_build_object('expedienteId',coalesce(a.expediente_id,f.expediente_id)) ELSE '{}'::jsonb END,
      confirmado_en=coalesce(a.confirmado_en,clock_timestamp()),actualizado_en=clock_timestamp(),
      evidencia=a.evidencia||jsonb_build_array(jsonb_build_object('evento','CONFIRMACION','fecha',clock_timestamp()))
      FROM documentos.documentos_archivos f JOIN documentos.documentos d ON d.id=f.documento_id
      WHERE a.reserva_id=$1 AND f.id=$2 AND f.documento_id=$3 AND f.version=$4
      AND d.estado='confirmado' AND f.storage_provider='r2'
      AND f.storage_bucket=a.r2_bucket AND (f.storage_key=a.r2_key OR (a.contexto->>'modo'='NUEVO_TARDIO'
        AND f.storage_bucket=a.contexto#>>'{origenFisico,bucket}' AND f.storage_key=a.contexto#>>'{origenFisico,key}'))
      AND f.hash_sha256=a.sha256
      AND f.empresa_codigo=a.empresa_codigo AND f.cliente_destino_id=a.cliente_destino_id
      AND (a.expediente_id IS NULL OR f.expediente_id=a.expediente_id)
      AND (f.expediente_id IS NULL OR EXISTS(SELECT 1 FROM documentos.expedientes e WHERE e.id=f.expediente_id
           AND e.empresa_codigo=a.empresa_codigo AND e.cliente_destino_id=a.cliente_destino_id))
      AND (a.archivo_id IS NULL OR a.archivo_id=$2) AND (a.documento_id IS NULL OR a.documento_id=$3)
      RETURNING a.id`, [reservaId,archivoId,documentoId,version]);
    if (rows.length !== 1) throw new Error('ARCHIVADO_CONFIRMACION_NO_ACREDITADA');
  }

  async reclamar(empresa: string, clienteId: number, expedienteId?: number | null): Promise<ArchivadoRow | null> {
    const token = randomUUID();
    const rows = await this.db.query<ArchivadoRow>(`UPDATE ${TABLE} a SET
      trabajo_estado='PROCESANDO',lease_token=$3,lease_hasta=clock_timestamp()+interval '60 seconds',
      generacion=a.generacion+1,intentos=a.intentos+1,actualizado_en=clock_timestamp(),
      operacion=CASE WHEN a.r2_estado IN('ELIMINACION_INICIADA','ELIMINACION_INCIERTA') THEN 'CONCILIAR_ELIMINACION'
        WHEN a.nas_estado='VERIFICADO' THEN 'VERIFICAR_NAS' ELSE 'COPIAR' END,
      evidencia=a.evidencia||jsonb_build_array(jsonb_build_object('evento','CLAIM','token',$3::text,'fecha',clock_timestamp()))
      WHERE a.id=(SELECT id FROM ${TABLE} WHERE empresa_codigo=$1 AND cliente_destino_id=$2 AND ($4::boolean OR expediente_id IS NOT DISTINCT FROM $5::bigint)
        AND confirmado_en IS NOT NULL AND archivo_id IS NOT NULL AND documento_id IS NOT NULL AND version IS NOT NULL
        AND r2_estado<>'ELIMINADO_ACREDITADO'
        AND ((trabajo_estado IN('PENDIENTE','REINTENTABLE') AND (proximo_intento IS NULL OR proximo_intento<=clock_timestamp()))
          OR (trabajo_estado='PROCESANDO' AND lease_hasta<clock_timestamp()))
        ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING a.*`, [empresa,clienteId,token,expedienteId===undefined,expedienteId??null]);
    return rows[0] ?? null;
  }

  /**
   * Reclamación focal por identidad completa.
   * No modifica el selector general ni permite adoptar otra reserva.
   */
  async reclamarReservaExacta(
    reservaId: number,
    archivoId: number,
    documentoId: number,
    empresa: string,
    clienteId: number,
    expedienteId: number | null,
    version?: number,
  ): Promise<ArchivadoRow | null> {
    if (![reservaId, archivoId, documentoId, clienteId]
      .every(v => Number.isSafeInteger(v) && v > 0)
      || (expedienteId !== null && (!Number.isSafeInteger(expedienteId) || expedienteId <= 0))
      || (version !== undefined && (!Number.isSafeInteger(version) || version <= 0))
      || !/^[A-Z0-9_-]+$/.test(empresa)) {
      throw new Error('ARCHIVADO_IDENTIDAD_FOCAL_INVALIDA');
    }

    const token = randomUUID();
    const rows = await this.db.query<ArchivadoRow>(`UPDATE ${TABLE} a SET
      trabajo_estado='PROCESANDO',
      lease_token=$7::uuid,
      lease_hasta=clock_timestamp()+interval '60 seconds',
      generacion=a.generacion+1,
      intentos=a.intentos+1,
      actualizado_en=clock_timestamp(),
      operacion=CASE
        WHEN a.r2_estado IN('ELIMINACION_INICIADA','ELIMINACION_INCIERTA')
          THEN 'CONCILIAR_ELIMINACION'
        WHEN a.nas_estado='VERIFICADO' THEN 'VERIFICAR_NAS'
        ELSE 'COPIAR'
      END,
      evidencia=a.evidencia||jsonb_build_array(
        jsonb_build_object('evento','CLAIM','token',$7::text,'fecha',clock_timestamp())
      )
      WHERE a.id=(
        SELECT id FROM ${TABLE}
        WHERE id=$1::bigint
          AND archivo_id=$2
          AND documento_id=$3
          AND empresa_codigo=$4
          AND cliente_destino_id=$5
          AND expediente_id IS NOT DISTINCT FROM $6::bigint
          AND ($8::integer IS NULL OR version=$8::integer)
          AND ($6::bigint IS NOT NULL OR EXISTS (
            SELECT 1 FROM documentos.documentos_operativos_principales p
            JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
            WHERE p.tipo_principal='ORDEN_PAGO' AND p.estado='activo' AND p.es_principal_activo=true
              AND c.estado='activo' AND c.expediente_v1_id IS NULL
              AND c.empresa_codigo=$4 AND c.cliente_destino_id=$5
              AND (p.documento_id=$3 OR EXISTS (
                SELECT 1 FROM documentos.grupos_factura g
                JOIN documentos.grupo_factura_documentos r ON r.grupo_factura_id=g.id
                WHERE g.documento_operativo_principal_id=p.id AND g.estado<>'anulado'
                  AND r.estado='activo' AND r.documento_id=$3))))
          AND confirmado_en IS NOT NULL
          AND version IS NOT NULL
          AND r2_estado<>'ELIMINADO_ACREDITADO'
          AND (
            (trabajo_estado IN('PENDIENTE','REINTENTABLE')
              AND (proximo_intento IS NULL OR proximo_intento<=clock_timestamp()))
            OR (trabajo_estado='PROCESANDO'
              AND lease_hasta<clock_timestamp())
          )
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING a.*`,
      [reservaId, archivoId, documentoId, empresa, clienteId, expedienteId, token, version??null]);

    return rows[0] ?? null;
  }

  async evidenciaOrigen(l:LeaseArchivado,evento:'ORIGEN_INTENTO'|'ORIGEN_RESPUESTA'|'ORIGEN_AUSENCIA',datos:Record<string,unknown>):Promise<any>{
    const rows=await this.db.query<{evento:any}>(`UPDATE ${TABLE} SET actualizado_en=clock_timestamp(),
      evidencia=evidencia||jsonb_build_array(jsonb_build_object('evento',$4::text,'datos',$5::jsonb,'fecha',clock_timestamp()))
      WHERE id=$1 AND lease_token=$2 AND generacion=$3 AND trabajo_estado='PROCESANDO'
        AND lease_hasta>clock_timestamp() RETURNING evidencia->-1 AS evento`,
      [l.id,l.token,l.generacion,evento,JSON.stringify(datos)]);
    if(rows.length!==1)throw new Error('ARCHIVADO_LEASE_PERDIDO');
    return rows[0].evento;
  }

  async renovar(l: LeaseArchivado): Promise<void> {
    await this.cas(l,`lease_hasta=clock_timestamp()+interval '60 seconds'`,'LEASE_RENOVADO');
  }

  async registrarStaging(l: LeaseArchivado, ruta: string): Promise<void> {
    if (!/^documentos\/\d{4}\/(0[1-9]|1[0-2])\/[A-Z0-9_-]+\/staging-[0-9a-f-]{36}$/.test(ruta)) throw new Error('ARCHIVADO_STAGING_INVALIDO');
    await this.cas(l,`staging_relativa=$4`,'NAS_STAGING_RESERVADO',[ruta]);
  }
  async nasVerificado(l: LeaseArchivado, hash: string, bytes: number, lectura = false): Promise<void> {
    await this.cas(l,`nas_estado='VERIFICADO',nas_sha256=$4,nas_tamano_bytes=$5,
      nas_verificado_en=clock_timestamp(),nas_lectura_verificada_en=CASE WHEN $6::boolean THEN clock_timestamp() ELSE nas_lectura_verificada_en END`, 'NAS_VERIFICADO', [hash,bytes,lectura]);
  }
  async materializado(l:LeaseArchivado):Promise<void>{
    const rows=await this.db.query(`WITH owned AS(SELECT * FROM ${TABLE} WHERE id=$1 AND lease_token=$2
      AND generacion=$3 AND trabajo_estado='PROCESANDO' AND lease_hasta>clock_timestamp() FOR UPDATE),
      bound AS(UPDATE documentos.documentos_archivos f SET storage_key=a.r2_key,ruta_archivo=a.r2_key,
        metadata=coalesce(f.metadata,'{}'::jsonb)||jsonb_build_object('archivadoOrigenFisico',a.contexto->'origenFisico')
      FROM owned a WHERE f.id=a.archivo_id AND f.documento_id=a.documento_id AND f.version=a.version
        AND f.hash_sha256=a.sha256 AND f.storage_bucket=a.r2_bucket AND f.empresa_codigo=a.empresa_codigo
        AND f.cliente_destino_id=a.cliente_destino_id
        AND (f.storage_key=a.r2_key OR f.storage_key=a.contexto#>>'{origenFisico,key}') RETURNING f.id)
      UPDATE ${TABLE} a SET r2_estado='PRESENTE',actualizado_en=clock_timestamp(),
        evidencia=a.evidencia||jsonb_build_array(jsonb_build_object('evento','NOMENCLATURA_MATERIALIZADA','fecha',clock_timestamp()))
      FROM bound WHERE a.id=$1 AND a.archivo_id=bound.id RETURNING a.id`,[l.id,l.token,l.generacion]);
    if(rows.length!==1)throw new Error('ARCHIVADO_MATERIALIZACION_CAS_CONFLICT');
  }
  async observarAusencia(l: LeaseArchivado, intentoIniciado: boolean): Promise<void> {
    await this.cas(l,`r2_ausencia_observada_en=clock_timestamp(),
      r2_estado=CASE WHEN $4::boolean THEN 'ELIMINACION_INCIERTA' ELSE 'AUSENTE_OBSERVADO' END`,
      'AUSENCIA_OBSERVADA_SIN_ATRIBUIR_AUTORIA',[intentoIniciado]);
  }
  async iniciarEliminacion(l: LeaseArchivado, intento: string): Promise<void> {
    await this.cas(l,`r2_estado='ELIMINACION_INICIADA',operacion='ELIMINAR_R2',
      eliminacion_intento_id=$4,eliminacion_iniciada_en=clock_timestamp(),delete_respuesta_http=NULL,
      delete_respuesta_en=NULL,delete_request_id=NULL,delete_respuesta_intento_id=NULL,
      ausencia_intento_id=NULL,r2_ausencia_comprobada_en=NULL`, 'DELETE_INTENT', [intento]);
  }
  async autorizarEliminacion(l:LeaseArchivado,decision:Record<string,unknown>):Promise<void>{
    const rows=await this.db.query(`UPDATE ${TABLE} SET actualizado_en=clock_timestamp(),
      evidencia=evidencia||jsonb_build_array(jsonb_build_object('evento','DELETE_PRODUCCION_AUTORIZADO',
        'datos',$4::jsonb,'fecha',clock_timestamp()))
      WHERE id=$1 AND lease_token=$2 AND generacion=$3 AND trabajo_estado='PROCESANDO'
        AND lease_hasta>clock_timestamp() RETURNING id`,[l.id,l.token,l.generacion,JSON.stringify(decision)]);
    if(rows.length!==1)throw new Error('ARCHIVADO_LEASE_PERDIDO');
  }
  async respuestaDelete(l: LeaseArchivado, intento: string, http: number, requestId: string | null): Promise<void> {
    if (http < 200 || http >= 300) throw new Error('ARCHIVADO_DELETE_NO_EXITOSO');
    await this.cas(l,`delete_respuesta_intento_id=$4,delete_respuesta_http=$5,delete_request_id=$6,delete_respuesta_en=clock_timestamp()`,
      'DELETE_RESPUESTA_EXITOSA', [intento,http,requestId],intento);
  }
  async completar(l: LeaseArchivado, intento: string): Promise<void> {
    await this.cas(l,`r2_estado='ELIMINADO_ACREDITADO',ausencia_intento_id=$4,r2_ausencia_comprobada_en=statement_timestamp(),
      r2_eliminado_en=statement_timestamp(),trabajo_estado='COMPLETADO',operacion=NULL,lease_token=NULL,lease_hasta=NULL`,
      'AUSENCIA_POST_DELETE_ACREDITADA',[intento],intento);
  }
  async liberar(l: LeaseArchivado, motivo: string, incierta = false): Promise<void> {
    if (!/^[A-Z0-9_]{1,80}$/.test(motivo)) throw new Error('ARCHIVADO_ERROR_NO_SANITIZADO');
    await this.cas(l,`trabajo_estado='REINTENTABLE',operacion=NULL,lease_token=NULL,lease_hasta=NULL,
      proximo_intento=clock_timestamp()+interval '5 minutes',ultimo_error_codigo=$4,
      r2_estado=CASE WHEN $5::boolean THEN 'ELIMINACION_INCIERTA' ELSE r2_estado END`, motivo,[motivo,incierta]);
  }
  private async cas(l: LeaseArchivado, assignments: string, event: string, values: unknown[] = [], intento?: string): Promise<void> {
    // assignments/event are internal constants, never request input or raw exception text.
    const rows = await this.db.query(`UPDATE ${TABLE} SET ${assignments},actualizado_en=clock_timestamp(),
      evidencia=evidencia||jsonb_build_array(jsonb_build_object('evento','${event}','fecha',clock_timestamp(),
        'datos',$${values.length+4}::jsonb,'intentoAnterior',eliminacion_intento_id,
        'respuestaAnterior',jsonb_build_object('intentoId',delete_respuesta_intento_id,'http',delete_respuesta_http,
          'fecha',delete_respuesta_en,'requestId',delete_request_id),
        'ausenciaAnterior',jsonb_build_object('intentoId',ausencia_intento_id,'fecha',r2_ausencia_comprobada_en)))
      WHERE id=$1 AND lease_token=$2 AND generacion=$3 AND trabajo_estado='PROCESANDO'
      AND lease_hasta>clock_timestamp()${intento ? ` AND eliminacion_intento_id=$${values.length+5}::uuid` : ''} RETURNING id`,
      [l.id,l.token,l.generacion,...values,JSON.stringify(values),...(intento?[intento]:[])]);
    if (rows.length !== 1) throw new Error('ARCHIVADO_LEASE_PERDIDO');
  }
}
