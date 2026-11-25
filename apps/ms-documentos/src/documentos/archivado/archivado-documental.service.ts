import { idArchivadoDevAdmitido } from './archivado-seguridad';
import { resolverFechaDocumentalR2 } from '../periodo-documental-r2.fecha';
import { resolverPeriodoDesdeRelacionesR2 } from '../periodo-documental-r2.resolver';
import type { ArchivadoMaterializacionService } from './archivado-materializacion.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
import { conExclusionFisica } from './archivado-exclusion';
import { createHash } from 'node:crypto';
import { Injectable, Optional, Inject, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArchivadoRepository, type ArchivadoSql } from './archivado.repository';
import { resolverNombreArchivado, extensionArchivadoDesdeMime } from './archivado-nomenclatura';

type Executor = { unsafe: (query: string, values: any[]) => PromiseLike<any[]> };
function adapter(tx: Executor): ArchivadoSql {
  return { query: async <T>(query: string, values: unknown[]) => await tx.unsafe(query,values) as T[] };
}
function reservaEstable(parts: unknown[]): string {
  const h=createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0,32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-8${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20)}`;
}
export type ReservaDocumental = { reservaId: string; key: string };

/** Domain bridge using existing period rules and writers; NAS remains exclusively postcommit. */
@Injectable()
export class ArchivadoDocumentalService {
  constructor(private readonly config: ConfigService, @Optional() private readonly postcommit?: ArchivadoPostcommit,
    @Optional() @Inject('ARCHIVADO_MATERIALIZACION') private readonly materializacion?:ArchivadoMaterializacionService) {}
  conConfirmacion<T>(work: () => Promise<T>): Promise<T> {
    const commit=()=>this.postcommit ? this.postcommit.ejecutar(work) : work();
    return this.habilitado() && this.materializacion ? this.materializacion.conSesion(commit) : commit();
  }
  habilitado(): boolean { return this.config.get<string>('R2_NAS_ARCHIVE_ENABLED') === 'true'; }

  async prepararCompras(tx: Executor, row: any, input: any, tecnico: string, actor: any, fingerprint: string): Promise<{
    destination: string; reserva: ReservaDocumental | null; bloqueo?: string;
  }> {
    if (!this.habilitado()) return { destination: tecnico, reserva: null };
    if(this.config.get<string>('NODE_ENV')==='development'&&!idArchivadoDevAdmitido(row.id,this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID')))
      throw new ConflictException('ARCHIVADO_ORIGEN_DEV_ANTERIOR');
    // Consume the period/company path already resolved by the existing domain flow.
    const parts=tecnico.split('/');
    if(parts.length!==5||parts[0]!=='documentos'||parts[3]!==row.empresa_codigo) throw new Error('ARCHIVADO_JERARQUIA_NO_COINCIDE');
    const metadata=input.metadata;
    let principal: { tipo: 'OC'|'OS'|'OP'; numero: string } | undefined;
    if(['FACTURA','RECIBO_HONORARIO','GUIA_REMISION','NOTA_INGRESO','TRANSFERENCIA','PAGO_TRANSFERENCIA','DETRACCION','PAGO_DETRACCION'].includes(input.tipoDocumental)) {
      const rows=input.origen==='REGULARIZACION_OP' ? await tx.unsafe(`SELECT d.tipo_documental,d.numero
        FROM documentos.documentos d JOIN documentos.documentos_operativos_principales p ON p.documento_id=d.id
        JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
        WHERE d.id=$1 AND p.tipo_principal='ORDEN_PAGO' AND d.tipo_documental='ORDEN_PAGO'
          AND p.estado='activo' AND p.es_principal_activo=true AND c.estado='activo' AND d.estado='confirmado'
          AND c.empresa_codigo=$2 AND c.cliente_destino_id=$3
          AND c.expediente_v1_id IS NOT DISTINCT FROM $4::bigint`,
          [input.documentoBaseId,row.empresa_codigo,row.cliente_destino_id,input.expedienteId])
        : await tx.unsafe(`SELECT d.tipo_documental,coalesce(d.numero,d.metadata->>'numero') AS numero
        FROM documentos.documentos d WHERE d.id=$1 AND d.estado='confirmado'
        AND d.tipo_documental IN('OC','OS') AND EXISTS(SELECT 1 FROM documentos.documentos_archivos f
          WHERE f.documento_id=d.id AND f.empresa_codigo=$2 AND f.cliente_destino_id=$3 AND f.expediente_id=$4)`,
        [input.documentoBaseId,row.empresa_codigo,row.cliente_destino_id,input.expedienteId]);
      if(rows.length!==1) throw new Error('ARCHIVADO_PRINCIPAL_NO_ACREDITADO');
      principal={tipo:rows[0].tipo_documental==='ORDEN_PAGO'?'OP':rows[0].tipo_documental,numero:String(rows[0].numero??'')};
    }
    const nombre=resolverNombreArchivado({empresa:row.empresa_codigo,periodo:{anio:parts[1],mes:parts[2]},
      tipo:input.tipoDocumental,numero:metadata.numero==null?undefined:String(metadata.numero),
      serie:metadata.serie==null?undefined:String(metadata.serie),
      ruc:String(metadata.ruc??metadata.rucProveedor??metadata.rucEmisor??''),principal,version:1,
      banco:metadata.banco,numeroOperacion:metadata.numeroOperacion,extension:extensionArchivadoDesdeMime(row.content_type)});
    if(nombre.estado==='BLOQUEADO') return {destination:tecnico,reserva:null,bloqueo:nombre.motivo};
    const cuenta=this.config.get<string>('R2_ACCOUNT_ID')||this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const endpoint=this.config.get<string>('R2_ENDPOINT')||this.config.get<string>('R2_ENDPOINT_URL')
      ||this.config.get<string>('CLOUDFLARE_R2_ENDPOINT')||(cuenta?`https://${cuenta}.r2.cloudflarestorage.com`:null);
    if(!endpoint)throw new Error('ARCHIVADO_R2_CUENTA_NO_CONFIGURADA');
    const url=new URL(endpoint),match=/^([a-z0-9]+)\.r2\.cloudflarestorage\.com$/.exec(url.hostname);
    if(url.protocol!=='https:'||url.username||url.password||!match||(cuenta&&cuenta!==match[1]))throw new Error('ARCHIVADO_R2_CUENTA_INVALIDA');
    const reservaId=reservaEstable(['R2_NAS_R1',match[1],row.storage_bucket,Number(row.id),fingerprint]);
    try { await new ArchivadoRepository(adapter(tx)).reservar({reservaId,empresa:row.empresa_codigo,
      clienteId:Number(row.cliente_destino_id),expedienteId:input.expedienteId,workspaceId:Number(row.workspace_id),
      contexto:{origen:input.origen??'COMPRAS',tempId:Number(row.id),documentoBaseId:input.documentoBaseId??null,tipo:input.tipoDocumental,
        ...(input.ordenPagoId?{ordenPagoId:Number(input.ordenPagoId)}:{})},
      regla:nombre.regla,anio:Number(parts[1]),mes:Number(parts[2]),cuenta:match[1],bucket:row.storage_bucket,
      key:nombre.rutaRelativa,sha256:row.hash_sha256,bytes:Number(row.tamano_bytes),
      nasDestino:this.config.get<string>('R2_NAS_DESTINATION')||'SYNOLOGY_DEV',ruta:nombre.rutaRelativa,actorId:actor.actorId}); } catch (error) {
      if (error instanceof Error && error.message==='ARCHIVADO_COLISION_RESERVA_PERMANENTE')
        return {destination:tecnico,reserva:null,bloqueo:'COLISION_NOMENCLATURA_REQUIERE_REGLA'};
      throw error;
    }
    return {destination:nombre.rutaRelativa,reserva:{reservaId,key:nombre.rutaRelativa}};
  }

  async confirmacionArchivada(tx:Executor,row:any,key:string):Promise<boolean>{
    const r=row.metadata?.archivadoReserva;
    if(!r || !row.promovida_en || row.metadata?.integration?.completed!==true || r.key!==key
      || row.metadata?.destinoReservado!==key || !row.archivo_id || !row.documento_id)return false;
    const matches=await tx.unsafe(`SELECT id FROM documentos.archivados_documentales
      WHERE reserva_id=$1 AND archivo_id=$2 AND documento_id=$3 AND r2_bucket=$4 AND r2_key=$5
        AND empresa_codigo=$6 AND cliente_destino_id=$7 AND sha256=$8
        AND nas_estado='VERIFICADO' AND r2_estado='ELIMINADO_ACREDITADO'`,
      [r.reservaId,row.archivo_id,row.documento_id,row.storage_bucket,key,row.empresa_codigo,row.cliente_destino_id,row.hash_sha256]);
    return matches.length===1;
  }

  async acreditarDestino(tx: Executor, row: any, key: string): Promise<boolean> {
    const r=row.metadata?.archivadoReserva;
    if(!r||!this.habilitado()||r.key!==key||row.metadata?.destinoReservado!==key)return false;
    const matches=await tx.unsafe(`SELECT id FROM documentos.archivados_documentales
      WHERE reserva_id=$1 AND r2_bucket=$2 AND r2_key=$3 AND sha256=$4 AND tamano_bytes=$5
      AND empresa_codigo=$6 AND cliente_destino_id=$7 AND contexto->>'tempId'=$8
      `,[r.reservaId,row.storage_bucket,key,row.hash_sha256,
      row.tamano_bytes,row.empresa_codigo,row.cliente_destino_id,String(row.id)]);
    return matches.length===1;
  }

  async confirmar(tx: Executor, row: any, archivoId: number, documentoId: number): Promise<void> {
    const r=row.metadata?.archivadoReserva;
    if(!r)return;
    if(!this.habilitado())throw new Error('ARCHIVADO_RESERVA_REQUIERE_FEATURE');
    // The caller supplies its existing materialization/association transaction.
    await new ArchivadoRepository(adapter(tx)).confirmar(r.reservaId,archivoId,documentoId,1);
    this.postcommit?.registrar(documentoId,archivoId);
  }
  /** Final domain hook: canonical R2 materialization precedes commit; never runs NAS or OCR. */
  async registrarDocumentoConfirmado(tx: Executor, documentoId: number, actorId: number | null,
    origen: string, archivoId?:number): Promise<void> {
    if (!this.habilitado()) return;
    const cuentaActual=this.config.get<string>('R2_ACCOUNT_ID')||this.config.get<string>('CLOUDFLARE_ACCOUNT_ID')||null;
    const files = await tx.unsafe(`SELECT f.*,d.tipo_documental,d.numero,d.serie,d.ruc_emisor,d.fecha_emision::text AS fecha_emision_documental,d.metadata AS documento_metadata,
        coalesce(co.destino_tamano_bytes,co.tamano_bytes,CASE WHEN f.metadata->>'tamanoBytes' ~ '^[0-9]{1,15}$' THEN (f.metadata->>'tamanoBytes')::bigint END,CASE WHEN f.metadata->>'size' ~ '^[0-9]{1,15}$' THEN (f.metadata->>'size')::bigint END) AS bytes,
        coalesce(co.content_type,f.metadata->>'contentType') AS documento_mime
      FROM documentos.documentos_archivos f JOIN documentos.documentos d ON d.id=f.documento_id
      LEFT JOIN documentos.carga_operaciones co ON co.id=f.carga_operacion_id
      WHERE d.id=$1 AND d.estado='confirmado' AND f.storage_provider='r2'
        AND (${this.config.get<string>('NODE_ENV')==='production'}::boolean OR f.id NOT IN(546,552,553))
        AND (($2::integer IS NOT NULL AND f.id=$2) OR ($2::integer IS NULL AND f.es_version_actual=true))
      ORDER BY f.id FOR UPDATE OF f,d`,[documentoId,archivoId??null]);
    for (const f of files) {
      if(this.config.get<string>('NODE_ENV')!=='production'&&[546,552,553].includes(Number(f.id)))continue;
      if(this.config.get<string>('NODE_ENV')==='development'
        &&(!idArchivadoDevAdmitido(f.id,this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID'))
        ||!idArchivadoDevAdmitido(f.carga_operacion_id,this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID'),true)))continue;
      const activation=this.config.get<string>('R2_NAS_ACTIVATION_FROM');
      if(activation && (!Number.isFinite(Date.parse(activation)) || !Number.isFinite(new Date(f.creado_en).getTime())
        || new Date(f.creado_en).getTime()<Date.parse(activation)))continue;
      if(Number(f.version)===1&&f.metadata?.archivadoReserva&&f.origen_archivo==='TEMP_DOCUMENTAL')continue;
      // A later business association must still emit its exact postcommit even if already reserved/confirmed.
      const bound=await tx.unsafe(`SELECT id FROM documentos.archivados_documentales
        WHERE archivo_id=$1 AND documento_id=$2 AND version=$3 AND confirmado_en IS NOT NULL
          AND empresa_codigo=$4 AND cliente_destino_id=$5 AND expediente_id IS NOT DISTINCT FROM $6::bigint
          AND r2_bucket=$7 AND r2_key=$8 AND sha256=$9`,
        [f.id,f.documento_id,f.version,f.empresa_codigo,f.cliente_destino_id,f.expediente_id??null,f.storage_bucket,f.storage_key,f.hash_sha256]);
      if(bound.length===1){this.postcommit?.registrar(documentoId,Number(f.id));continue;}
      if(f.metadata?.archivadoReserva){
        // TMP owns the final association commit and confirms the same reservation after V2 integration.
        if(Number(f.version)===1&&f.origen_archivo==='TEMP_DOCUMENTAL')continue;
        await new ArchivadoRepository(adapter(tx)).confirmar(f.metadata.archivadoReserva.reservaId,
          Number(f.id),Number(f.documento_id),Number(f.version));
        this.postcommit?.registrar(documentoId,Number(f.id));
        continue;
      }
      const bloquear = async (motivo: string) => { await tx.unsafe(`UPDATE documentos.documentos_archivos
        SET metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('archivadoBloqueo',$2::text,'archivadoIntentadoEn',clock_timestamp())
        WHERE id=$1`,[f.id,motivo]); };
      const parts = /^documentos\/(?:carga-segura\/)?(\d{4})\/(0[1-9]|1[0-2])\/([A-Z0-9_-]+)\//.exec(String(f.storage_key??''));
      if (!parts || parts[3]!==f.empresa_codigo || !f.cliente_destino_id || !/^([0-9a-f]{64})$/.test(f.hash_sha256??'') || !Number.isSafeInteger(Number(f.bytes)) || Number(f.bytes)<=0 || !f.version) {
        await bloquear('ARCHIVADO_IDENTIDAD_FISICA_O_CONTEXTO_INCOMPLETO');continue;
      }
      let baseOriginal:string|undefined;
      let periodo={anio:parts[1],mes:parts[2]};
      if(Number(f.version)>1){
        const originals=await tx.unsafe(`SELECT coalesce(a.ruta_relativa,v.storage_key) AS ruta_original,v.expediente_id
          FROM documentos.documentos_archivos v LEFT JOIN documentos.archivados_documentales a
            ON a.archivo_id=v.id AND a.documento_id=v.documento_id AND a.version=v.version
              AND a.empresa_codigo=v.empresa_codigo AND a.cliente_destino_id=v.cliente_destino_id
          WHERE v.documento_id=$1 AND v.id<>$2 AND v.version=1 AND v.empresa_codigo=$3
            AND v.cliente_destino_id=$4 AND v.storage_provider='r2'
            AND (v.expediente_id IS NULL OR EXISTS(SELECT 1 FROM documentos.expedientes e WHERE e.id=v.expediente_id
              AND e.empresa_codigo=v.empresa_codigo AND e.cliente_destino_id=v.cliente_destino_id)) ORDER BY v.id`,
          [f.documento_id,f.id,f.empresa_codigo,f.cliente_destino_id]);
        const original=originals.length===1?String(originals[0].ruta_original??''):'';
        const originalParts=/^documentos\/(\d{4})\/(0[1-9]|1[0-2])\/([A-Z0-9_-]+)\/(.+)$/.exec(original);
        if(!originalParts||originalParts[3]!==f.empresa_codigo){await bloquear('ARCHIVADO_VERSION_ORIGINAL_NO_UNIVOCA');continue;}
        const expedienteOriginal=originals[0].expediente_id==null?null:Number(originals[0].expediente_id);
        if(f.expediente_id!=null&&Number(f.expediente_id)!==expedienteOriginal){await bloquear('ARCHIVADO_VERSION_CONTEXTO_NO_COINCIDE');continue;}
        if(f.expediente_id==null&&expedienteOriginal!==null){
          const filled=await tx.unsafe(`UPDATE documentos.documentos_archivos SET expediente_id=$2
            WHERE id=$1 AND documento_id=$3 AND version=$4 AND empresa_codigo=$5 AND cliente_destino_id=$6
              AND expediente_id IS NULL RETURNING id`,[f.id,expedienteOriginal,f.documento_id,f.version,f.empresa_codigo,f.cliente_destino_id]);
          if(filled.length!==1)throw new Error('ARCHIVADO_VERSION_CONTEXTO_CAS');
          f.expediente_id=expedienteOriginal;
        }
        periodo={anio:originalParts[1],mes:originalParts[2]};
        if(/^(OC|OS|OP)_\d+(?:__|\.)/.test(originalParts[4]))baseOriginal=original;
      }
      let principal: {tipo:'OC'|'OS'|'OP';numero:string}|undefined;
      let ordenPagoId:number|undefined;
      let padres:any[]=[];
      if (!['OC','OS','ORDEN_PAGO'].includes(f.tipo_documental)) {
        const parents=await tx.unsafe(`SELECT DISTINCT p.id AS principal_id,d.id AS principal_documento_id,d.tipo_documental,d.numero,
            coalesce(d.fecha_emision::text,d.metadata->>'fechaEmision') AS fecha_principal,
            g.id AS grupo_id,g.factura_documento_id,coalesce(df.fecha_emision::text,df.metadata->>'fechaEmision') AS fecha_factura FROM documentos.grupos_factura g
          LEFT JOIN documentos.grupo_factura_documentos r ON r.grupo_factura_id=g.id AND r.estado='activo' AND r.documento_id=$1
          JOIN documentos.documentos_operativos_principales p ON p.id=g.documento_operativo_principal_id
          JOIN documentos.documentos d ON d.id=p.documento_id
          JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
          LEFT JOIN documentos.documentos df ON df.id=g.factura_documento_id AND df.cliente_abreviatura=c.empresa_codigo AND df.tipo_documental='FACTURA' AND df.estado='confirmado'
          WHERE (r.documento_id=$1 OR g.factura_documento_id=$1) AND g.estado<>'anulado' AND p.estado='activo'
            AND c.empresa_codigo=$2 AND c.cliente_destino_id=$3 AND c.expediente_v1_id IS NOT DISTINCT FROM $4::bigint
            AND p.tipo_principal IN('OC','OS','ORDEN_PAGO') AND p.es_principal_activo=true
            AND c.estado='activo' AND d.tipo_documental=p.tipo_principal
            AND d.cliente_abreviatura=c.empresa_codigo AND d.estado='confirmado'`,
          [f.documento_id,f.empresa_codigo,f.cliente_destino_id,f.expediente_id??null]);
        if (parents.length!==1) {await bloquear('ARCHIVADO_ASOCIACION_NO_UNIVOCA');continue;}
        padres=parents;
        principal={tipo:parents[0].tipo_documental==='ORDEN_PAGO'?'OP':parents[0].tipo_documental,numero:String(parents[0].numero??'')};
        if(principal.tipo==='OP')ordenPagoId=Number(parents[0].principal_id);
      }
      if(Number(f.version)===1&&f.metadata?.archivadoNuevo===true){
        try{
          if(principal?.tipo==='OP')periodo=resolverFechaDocumentalR2(padres[0].fecha_principal);
          else if(['GUIA_REMISION','NOTA_INGRESO','TRANSFERENCIA','PAGO_TRANSFERENCIA','DETRACCION','PAGO_DETRACCION'].includes(f.tipo_documental)){
            periodo=resolverPeriodoDesdeRelacionesR2({workspaceId:Number(f.workspace_id),empresaCodigo:f.empresa_codigo,
              clienteDestinoId:Number(f.cliente_destino_id),expedienteId:Number(f.expediente_id)},
              {operacion:f.tipo_documental==='GUIA_REMISION'?'NUEVA_GUIA':f.tipo_documental==='NOTA_INGRESO'?'NUEVA_NI':'NUEVO_SUSTENTO',grupoFacturaId:Number(padres[0]?.grupo_id)},
              padres.map(p=>({facturaDocumentoId:Number(p.factura_documento_id),fechaEmision:p.fecha_factura,
                empresaCodigo:f.empresa_codigo,clienteDestinoId:Number(f.cliente_destino_id),expedienteId:Number(f.expediente_id)})));
          }else periodo=resolverFechaDocumentalR2(f.fecha_emision_documental??f.documento_metadata?.fechaEmision);
        }catch{await bloquear('ARCHIVADO_PERIODO_DOCUMENTAL_INCOMPLETO');continue;}
      }
      // These are persisted human-confirmed fields, never the upload filename or raw OCR candidate.
      const validated=f.documento_metadata?.validacionManual?.metadata??f.documento_metadata?.ocr?.metadata??{};
      const n=resolverNombreArchivado({empresa:f.empresa_codigo,periodo,baseOriginal,
        banco:validated.banco,numeroOperacion:validated.numeroOperacion,
        tipo:f.tipo_documental,numero:f.numero==null?undefined:String(f.numero),serie:f.serie??undefined,
        ruc:f.ruc_emisor??undefined,principal,version:Number(f.version),
        extension:extensionArchivadoDesdeMime(f.documento_mime)});
      if(n.estado==='BLOQUEADO'){await bloquear(n.motivo);continue;}
      if(f.metadata?.archivadoNuevo===true && f.storage_key!==n.rutaRelativa){
        if(!this.materializacion)throw new Error('ARCHIVADO_MATERIALIZADOR_REQUERIDO');
        await this.materializacion.ejecutar(tx,f,n,{anio:Number(periodo.anio),mes:Number(periodo.mes)},ordenPagoId);
        this.postcommit?.registrar(documentoId,Number(f.id));
        continue;
      }
      const tardio=f.metadata?.archivadoNuevo===true && f.storage_key!==n.rutaRelativa;
      const modo=tardio?'NUEVO_TARDIO':f.metadata?.archivadoNuevo===true?'NUEVO':'HISTORICO';
      const key=tardio?n.rutaRelativa:f.storage_key;
      const cuenta=this.config.get<string>('R2_ACCOUNT_ID')||this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
      if(!cuenta){await bloquear('ARCHIVADO_R2_CUENTA_NO_CONFIGURADA');continue;}
      const reservaId=reservaEstable(['ARCHIVO_CONFIRMADO',cuenta,f.storage_bucket,f.id,key]);
      const repo=new ArchivadoRepository(adapter(tx));
      try { await repo.reservar({reservaId,empresa:f.empresa_codigo,clienteId:Number(f.cliente_destino_id),
        expedienteId:f.expediente_id==null?null:Number(f.expediente_id),workspaceId:f.workspace_id==null?null:Number(f.workspace_id),
        contexto:{origen,archivoId:Number(f.id),documentoId:Number(f.documento_id),modo,
          ...(ordenPagoId?{ordenPagoId}:{}),
          ...(tardio?{origenFisico:{bucket:f.storage_bucket,key:f.storage_key}}:{})},regla:n.regla,anio:Number(periodo.anio),mes:Number(periodo.mes),
        cuenta,bucket:f.storage_bucket,key,sha256:f.hash_sha256,bytes:Number(f.bytes),
        nasDestino:this.config.get<string>('R2_NAS_DESTINATION')||'SYNOLOGY_DEV',ruta:n.rutaRelativa,actorId});
      } catch(error) {
        if(error instanceof Error && ['ARCHIVADO_COLISION_RESERVA_PERMANENTE','ARCHIVADO_IDENTIDAD_YA_ARCHIVADA'].includes(error.message)){
          await bloquear('COLISION_NOMENCLATURA_REQUIERE_REGLA');continue;
        }
        throw error;
      }
      await repo.confirmar(reservaId,Number(f.id),Number(f.documento_id),Number(f.version));
      this.postcommit?.registrar(documentoId,Number(f.id));
    }
  }

  async prepararRegularizador(tx:Executor,row:any,ordenPagoId:number,tipo:string,metadata:any,
    tecnico:string,actor:any,identity:string){
    const ops=await tx.unsafe(`SELECT p.documento_id,c.expediente_v1_id
      FROM documentos.documentos_operativos_principales p
      JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
      WHERE p.id=$1 AND p.tipo_principal='ORDEN_PAGO' AND p.estado='activo' AND p.es_principal_activo=true
        AND c.estado='activo' AND c.empresa_codigo=$2 AND c.cliente_destino_id=$3`,
      [ordenPagoId,row.empresa_codigo,row.cliente_destino_id]);
    if(ops.length!==1)throw new Error('ARCHIVADO_OP_CONTEXTO_NO_ACREDITADO');
    return this.prepararCompras(tx,row,{tipoDocumental:tipo,origen:'REGULARIZACION_OP',
      documentoBaseId:Number(ops[0].documento_id),ordenPagoId,expedienteId:ops[0].expediente_v1_id,
      metadata},tecnico,{actorId:actor.actorId},identity);
  }

  async prepararOp(tx: Executor,row: any,ids: { documentoId:number;ordenPagoId:number },tecnico:string,actor:any,identity:string) {
    if(!this.habilitado())return{destination:tecnico,reserva:null,bloqueo:undefined};
    const rows=await tx.unsafe(`SELECT d.numero,c.expediente_v1_id FROM documentos.documentos d
      JOIN documentos.documentos_operativos_principales p ON p.documento_id=d.id
      JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
      WHERE d.id=$1 AND p.id=$2 AND d.tipo_documental='ORDEN_PAGO' AND d.estado='confirmado'
      AND c.empresa_codigo=$3 AND c.cliente_destino_id=$4`,[ids.documentoId,ids.ordenPagoId,row.empresa_codigo,row.cliente_destino_id]);
    if(rows.length!==1)throw new Error('ARCHIVADO_OP_CONTEXTO_NO_ACREDITADO');
    return this.prepararCompras(tx,row,{tipoDocumental:'ORDEN_PAGO',origen:'FINANZAS_OP',ordenPagoId:ids.ordenPagoId,expedienteId:rows[0].expediente_v1_id,
      metadata:{numero:rows[0].numero}},tecnico,{actorId:actor.id},identity);
  }

  async conExclusion<T>(tx: Executor,row: any,key:string,work:()=>Promise<T>):Promise<T> {
    const reserva=row.metadata?.archivadoReserva;
    if(!reserva)return work();
    if(!this.habilitado()||reserva.key!==key)throw new Error('ARCHIVADO_DESTINO_NO_ACREDITADO');
    const rows=await tx.unsafe(`SELECT r2_cuenta FROM documentos.archivados_documentales
      WHERE reserva_id=$1 AND r2_bucket=$2 AND r2_key=$3 AND empresa_codigo=$4 AND cliente_destino_id=$5`,
      [reserva.reservaId,row.storage_bucket,key,row.empresa_codigo,row.cliente_destino_id]);
    if(rows.length!==1)throw new Error('ARCHIVADO_DESTINO_NO_ACREDITADO');
    return conExclusionFisica(tx,rows[0].r2_cuenta,row.storage_bucket,key,work);
  }

}
