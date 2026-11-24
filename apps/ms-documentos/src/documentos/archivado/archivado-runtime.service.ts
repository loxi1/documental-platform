import { idArchivadoDevAdmitido } from './archivado-seguridad';
import { mimeArchivadoDesdeContenido, extensionArchivadoDesdeMime } from './archivado-nomenclatura';
import { configuracionNas, origenPublicoArchivado } from './archivado-configuracion';
import { ArchivadoPostcommit } from './archivado-postcommit';
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { conExclusionFisica } from './archivado-exclusion';
import { Injectable, Inject, ServiceUnavailableException, UnauthorizedException, ForbiddenException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { sql } from '@documental/database';
import { NatsSubjects } from '@documental/shared';
import { NATS_CLIENT } from '../../nats/nats-client.provider';
import { lstatSync, readFileSync } from 'node:fs';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { ArchivadoRepository, type ArchivadoRow, type ArchivadoSql } from './archivado.repository';
import { ArchivadoMoveService, type ResultadoMove } from './archivado-move.service';
import { ArchivadoR2Adapter } from './archivado-r2.adapter';
import { ArchivadoSmbAdapter } from './archivado-smb.adapter';
import { ArchivadoPreviewToken } from './archivado-preview-token';
type Exacta={id:number;archivoId:number;documentoId:number;version:number;autorizado?:boolean};
export type ReservaPendienteExacta={reservaId:number;archivoId:number;documentoId:number;empresa:string;clienteId:number;expedienteId:number|null};
// Current PO storage-deletion authorization; not the ordinary archive eligibility rule.
export const RECUPERACION_DEV_554_555:ReadonlyArray<ReservaPendienteExacta>=Object.freeze([
  Object.freeze({reservaId:3,archivoId:554,documentoId:549,empresa:'BBTEC',clienteId:1,expedienteId:6}),
  Object.freeze({reservaId:4,archivoId:555,documentoId:550,empresa:'BBTEC',clienteId:1,expedienteId:6}),
]);
type Scope={empresa:string;clienteId:number;expedienteId:number|null};
@Injectable()
export class ArchivadoRuntimeService {
  constructor(private readonly config:ConfigService,private readonly storage:R2CargaSeguraStorage,
    @Inject(NATS_CLIENT) private readonly nats:ClientProxy, @Optional() private readonly documental?:ArchivadoDocumentalService,
    @Optional() private readonly postcommit?:ArchivadoPostcommit) {}
  onModuleInit(){ this.postcommit?.conectar((ids,archivos)=>this.procesarDocumentosConfirmados(ids,archivos)); }
  private automaticoHabilitado(){return this.habilitado() && this.config.get<string>('R2_NAS_AUTO_ENABLED')==='true';}
  private permitidos(key='R2_NAS_DEV_ALLOWED_FILE_IDS'):number[]{
    return String(this.config.get<string>(key)??'').split(',')
      .filter(v=>/^[1-9]\d*$/.test(v)).map(Number).filter(Number.isSafeInteger);
  }
  private contextoDevPermitido(row:any):boolean{
    // Institutional relations in nuevoAutorizado remain authoritative; DEV dynamic mode is explicit.
    if(this.config.get<string>('R2_NAS_DEV_DYNAMIC_CONTEXTS')==='true')return true;
    const raw=this.config.get<string>('R2_NAS_DEV_CONTEXTS');
    if(raw!==undefined){
      try{
        const pairs=JSON.parse(raw);
        return Array.isArray(pairs)&&pairs.length>0&&pairs.every(p=>p&&typeof p.empresa==='string'&&/^[A-Z0-9_-]+$/.test(p.empresa)
          &&Number.isSafeInteger(p.clienteId)&&p.clienteId>0)
          &&pairs.some(p=>p.empresa===row.empresa_codigo&&p.clienteId===Number(row.cliente_destino_id));
      }catch{return false;}
    }
    // Compatibility only for one unambiguous legacy pair, never a Cartesian product.
    const empresas=String(this.config.get<string>('R2_NAS_DEV_EMPRESAS')??'').split(',').map(s=>s.trim()).filter(Boolean);
    const clientes=this.permitidos('R2_NAS_DEV_CLIENTE_IDS');
    return empresas.length===1&&clientes.length===1&&empresas[0]===row.empresa_codigo&&clientes[0]===Number(row.cliente_destino_id);
  }
  private async nuevoAutorizado(row:any):Promise<boolean>{
    const production=this.config.get<string>('NODE_ENV')==='production';
    const enabled=this.config.get<string>(production?'R2_NAS_NEW_DOCUMENTS_ENABLED':'R2_NAS_DEV_NEW_DOCUMENTS_ENABLED')==='true';
    if(!enabled)return false;
    if(!production && (this.config.get<string>('NODE_ENV')!=='development'||this.config.get<string>('R2_NAS_DESTINATION')!=='SYNOLOGY_DEV'
      ||!this.contextoDevPermitido(row)))return false;
    const from=this.config.get<string>('R2_NAS_ACTIVATION_FROM');
    if(!from||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(from)||!Number.isFinite(Date.parse(from)))return false;
    // One persisted identity watermark for the next DEV acceptance, not a per-file allowlist.
    const configuredFloor=this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID');
    if(!production&&this.config.get<string>('R2_NAS_DEV_DELETE_NEW_CONFIRMED')==='true'&&!configuredFloor)return false;
    const floor=production?'1':(configuredFloor??'1');
    if(!/^[1-9]\d*$/.test(floor)||!Number.isSafeInteger(Number(floor))||Number(row.archivo_id)<Number(floor))return false;
    const cargaFloor=production?undefined:this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID');
    if(!idArchivadoDevAdmitido(null,cargaFloor,true))return false;
    const cargaMin=cargaFloor===undefined?null:Number(cargaFloor);
    const matches=await sql`SELECT f.id FROM documentos.documentos_archivos f
      JOIN documentos.documentos d ON d.id=f.documento_id
      LEFT JOIN documentos.expedientes e ON e.id=f.expediente_id
      WHERE f.id=${row.archivo_id} AND f.documento_id=${row.documento_id} AND f.version=${row.version}
        AND f.metadata->>'archivadoNuevo'='true' AND f.creado_en>=${from}::timestamptz
        AND f.id>=${Number(floor)}
        AND (${cargaMin}::bigint IS NULL OR f.carga_operacion_id IS NULL OR f.carga_operacion_id>=${cargaMin})
        AND d.estado='confirmado' AND f.empresa_codigo=${row.empresa_codigo} AND f.cliente_destino_id=${row.cliente_destino_id}
        AND ((e.id IS NOT NULL AND e.empresa_codigo=f.empresa_codigo AND e.cliente_destino_id=f.cliente_destino_id)
          OR (f.expediente_id IS NULL AND EXISTS(SELECT 1 FROM documentos.documentos_operativos_principales p
            JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
            JOIN documentos.documentos pd ON pd.id=p.documento_id
            WHERE p.tipo_principal='ORDEN_PAGO' AND p.estado='activo' AND p.es_principal_activo=true
              AND c.estado='activo' AND c.expediente_v1_id IS NULL
              AND c.empresa_codigo=f.empresa_codigo AND c.cliente_destino_id=f.cliente_destino_id
              AND (pd.id=d.id OR EXISTS(SELECT 1 FROM documentos.grupos_factura g
                JOIN documentos.grupo_factura_documentos r ON r.grupo_factura_id=g.id
                WHERE g.documento_operativo_principal_id=p.id AND g.estado<>'anulado' AND r.estado='activo' AND r.documento_id=d.id)))))`;
    return matches.length===1&&Number(matches[0].id)===Number(row.archivo_id);
  }
  private async permitido(row:any):Promise<boolean>{
    if([546,552,553].includes(Number(row.archivo_id)))return false;
    if(this.config.get<string>('NODE_ENV')==='development'
      &&!idArchivadoDevAdmitido(row.id,this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_RESERVA_ID')))return false;
    // Explicit legacy IDs never bypass age, confirmation or tenant identity.
    return this.nuevoAutorizado(row);
  }
  async recuperarPendientesExactosDev(expected:ReservaPendienteExacta[]){
    this.requireEnabled();
    if(this.config.get<string>('NODE_ENV')!=='development'||this.config.get<string>('R2_NAS_DESTINATION')!=='SYNOLOGY_DEV'
      ||!expected.length||expected.length>20)throw new ForbiddenException('ARCHIVADO_RECUPERACION_DEV_INVALIDA');
    const ids=new Set<number>(),ready:any[]=[];
    // Validate the complete batch before any claim/storage operation.
    for(const e of expected){
      if(![e.reservaId,e.archivoId,e.documentoId,e.clienteId].every(v=>Number.isSafeInteger(v)&&v>0)
        ||(e.expedienteId!==null&&(!Number.isSafeInteger(e.expedienteId)||e.expedienteId<=0))
        ||!/^[A-Z0-9_-]+$/.test(e.empresa)||[546,552,553].includes(e.archivoId)||ids.has(e.reservaId))
        throw new ForbiddenException('ARCHIVADO_RECUPERACION_IDENTIDAD_INVALIDA');
      ids.add(e.reservaId);
      const rows=await sql.unsafe(`SELECT a.* FROM documentos.archivados_documentales a
        JOIN documentos.documentos_archivos f ON f.id=a.archivo_id AND f.documento_id=a.documento_id AND f.version=a.version
        JOIN documentos.documentos d ON d.id=a.documento_id
        WHERE a.id=$1 AND a.archivo_id=$2 AND a.documento_id=$3 AND a.empresa_codigo=$4 AND a.cliente_destino_id=$5
          AND a.expediente_id IS NOT DISTINCT FROM $6::bigint AND a.confirmado_en IS NOT NULL AND d.estado='confirmado'
          AND f.empresa_codigo=a.empresa_codigo AND f.cliente_destino_id=a.cliente_destino_id
          AND f.metadata->>'archivadoNuevo'='true' AND f.storage_bucket=a.r2_bucket AND f.storage_key=a.r2_key
          AND f.hash_sha256=a.sha256`,[e.reservaId,e.archivoId,e.documentoId,e.empresa,e.clienteId,e.expedienteId]);
      const row=rows[0];
      if(rows.length!==1||Number(row.id)!==e.reservaId||Number(row.archivo_id)!==e.archivoId||Number(row.documento_id)!==e.documentoId
        ||row.empresa_codigo!==e.empresa||Number(row.cliente_destino_id)!==e.clienteId
        ||(row.expediente_id==null?null:Number(row.expediente_id))!==e.expedienteId
        ||!await this.permitido(row)||row.r2_key!==row.ruta_relativa||row.contexto?.modo==='NUEVO_TARDIO'
        ||row.contexto?.origenFisico||row.contexto?.origenMaterializacion)
        throw new ForbiddenException('ARCHIVADO_RECUPERACION_NO_ACREDITADA');
      ready.push({e,row});
    }
    const results:any[]=[];
    for(const {e,row} of ready){
      if(row.r2_estado==='ELIMINADO_ACREDITADO'&&row.trabajo_estado==='COMPLETADO'&&row.nas_estado==='VERIFICADO'){
        results.push({reservaId:e.reservaId,archivoId:e.archivoId,resultados:['SIN_TRABAJO']});continue;
      }
      try{
        const result=await this.procesarContexto({empresa:e.empresa,clienteId:e.clienteId,expedienteId:e.expedienteId},
          {id:e.reservaId,archivoId:e.archivoId,documentoId:e.documentoId,version:Number(row.version),autorizado:true});
        results.push({reservaId:e.reservaId,archivoId:e.archivoId,resultados:result.resultados});
      }catch(error){
        if(error instanceof Error)Object.assign(error,{resultadosParciales:results});
        throw error;
      }
    }
    return results;
  }
  async procesarDocumentosConfirmados(ids:number[],archivoIds:number[]=[]):Promise<void>{
    if(!this.automaticoHabilitado())return;
    const documentos=[...new Set(ids)].filter(v=>Number.isSafeInteger(v)&&v>0);
    const archivos=[...new Set(archivoIds)].filter(v=>Number.isSafeInteger(v)&&v>0);
    if(!documentos.length||!archivos.length)return;
    const rows=await sql.unsafe(`SELECT a.* FROM documentos.archivados_documentales a
      JOIN documentos.documentos_archivos f ON f.id=a.archivo_id AND f.documento_id=a.documento_id AND f.version=a.version
      JOIN documentos.documentos d ON d.id=a.documento_id
      WHERE a.documento_id=ANY($1::integer[]) AND a.archivo_id=ANY($2::integer[]) AND a.confirmado_en IS NOT NULL
        AND d.estado='confirmado' AND f.metadata->>'archivadoNuevo'='true'
        AND a.archivo_id NOT IN(546,552,553) AND a.r2_estado<>'ELIMINADO_ACREDITADO'
        AND f.empresa_codigo=a.empresa_codigo AND f.cliente_destino_id=a.cliente_destino_id`,[documentos,archivos]);
    for(const row of rows){
      if(!await this.permitido(row))continue;
      try{await this.procesarContexto({empresa:row.empresa_codigo,clienteId:Number(row.cliente_destino_id),
        expedienteId:row.expediente_id==null?null:Number(row.expediente_id)},
        {id:Number(row.id),archivoId:Number(row.archivo_id),documentoId:Number(row.documento_id),version:Number(row.version),autorizado:true});}
      catch{/* persistent reservation records failure; the domain commit is never rolled back */}
    }
  }
  habilitado(){return this.config.get<string>('R2_NAS_ARCHIVE_ENABLED')==='true';}
  visorHabilitado(){return this.config.get<string>('R2_NAS_VIEWER_ENABLED')==='true';}
  private requireViewerEnabled(){
    if(!this.visorHabilitado())throw new ServiceUnavailableException('ARCHIVADO_VISOR_NO_HABILITADO');
  }
  private requireEnabled(){if(!this.habilitado())throw new ServiceUnavailableException('ARCHIVADO_NO_HABILITADO');}
  private db():ArchivadoSql{return{query:async<T>(q:string,v:unknown[])=>await sql.unsafe(q,v as any[]) as T[]};}
  private tokens(){return new ArchivadoPreviewToken(this.config.get<string>('R2_NAS_PREVIEW_SECRET')??'');}
  private nas(){
    const file=this.config.get<string>('R2_NAS_SMB_AUTH_FILE');
    if(!file)throw new ServiceUnavailableException('ARCHIVADO_NAS_AUTH_NO_CONFIGURADA');
    const destino=configuracionNas(this.config);
    return new ArchivadoSmbAdapter({...destino,
      authFile:(()=>{
        const info=lstatSync(file);
        if(!info.isFile()||(info.mode&0o077)!==0
          || (typeof process.getuid==='function' && info.uid!==process.getuid()))
          throw new Error('ARCHIVADO_NAS_AUTH_PERMISOS');
        if(info.size<=0||info.size>4096)throw new Error('ARCHIVADO_NAS_AUTH_FORMATO');
        const first=readFileSync(file,'utf8').split(/\r?\n/,1)[0];
        const user=/^\s*username\s*=\s*(.*?)\s*$/i.exec(first)?.[1];
        if(user!==destino.usuario)throw new Error('ARCHIVADO_NAS_AUTH_IDENTIDAD');
        return file;
      })()});
  }
  private async scope(expedienteId:number,authorization?:string,escritura=false):Promise<Scope>{
    if(!Number.isSafeInteger(expedienteId)||expedienteId<=0)throw new ForbiddenException('ARCHIVADO_CONTEXTO_INVALIDO');
    if(!authorization?.startsWith('Bearer '))throw new UnauthorizedException('Token requerido');
    const auth:any=await firstValueFrom(this.nats.send(NatsSubjects.AuthValidateToken,{token:authorization.slice(7).trim()}).pipe(timeout(10000)));
    if(!auth?.valid)throw new UnauthorizedException('Token inválido');
    const p=auth.payload,empresa=String(p?.empresa??p?.empresaCodigo??'').trim().toUpperCase(),clienteId=Number(p?.clienteDestinoId);
    if(p?.sistema!=='DOCUMENTAL'||!Number.isSafeInteger(clienteId)||clienteId<=0||!empresa
      ||(escritura && (!Array.isArray(p?.permisos?.actions)||!p.permisos.actions.some((v:string)=>['documentos.confirmar_ocr','ocr.confirmar'].includes(v)))))
      throw new ForbiddenException('ARCHIVADO_PERMISO_REQUERIDO');
    const rows=await sql`SELECT id FROM documentos.expedientes WHERE id=${expedienteId} AND empresa_codigo=${empresa} AND cliente_destino_id=${clienteId}`;
    if(rows.length!==1)throw new ForbiddenException('ARCHIVADO_CONTEXTO_NO_AUTORIZADO');
    return{empresa,clienteId,expedienteId};
  }
  async resumen(expedienteId:number,authorization?:string){this.requireViewerEnabled();const s=await this.scope(expedienteId,authorization);return this.resumenScope(s);}
  private async resumenScope(s:Scope){
    const rows=await sql`SELECT nas_estado,r2_estado,trabajo_estado,count(*)::integer AS cantidad
      FROM documentos.archivados_documentales WHERE empresa_codigo=${s.empresa} AND cliente_destino_id=${s.clienteId}
      AND expediente_id IS NOT DISTINCT FROM ${s.expedienteId}::bigint AND confirmado_en IS NOT NULL GROUP BY nas_estado,r2_estado,trabajo_estado`;
    const bloqueos=await sql`SELECT coalesce(f.metadata->>'archivadoBloqueo',co.metadata->>'archivadoBloqueo') AS motivo,count(*)::integer AS cantidad
      FROM documentos.documentos_archivos f JOIN documentos.documentos d ON d.id=f.documento_id
      LEFT JOIN documentos.carga_operaciones co ON co.id=f.carga_operacion_id
      WHERE f.empresa_codigo=${s.empresa} AND f.cliente_destino_id=${s.clienteId} AND f.expediente_id IS NOT DISTINCT FROM ${s.expedienteId}::bigint
      AND d.estado='confirmado' AND coalesce(f.metadata->>'archivadoBloqueo',co.metadata->>'archivadoBloqueo') IS NOT NULL
      GROUP BY coalesce(f.metadata->>'archivadoBloqueo',co.metadata->>'archivadoBloqueo')`;
    return{expedienteId:s.expedienteId,estados:rows,bloqueosNomenclatura:bloqueos};
  }
  async regularizar(expedienteId:number,authorization?:string){
    this.requireEnabled();
    const s=await this.scope(expedienteId,authorization,true);
    if(this.documental)await sql.begin(async tx=>{
      const docs=await tx<{id:number}[]>`SELECT d.id FROM documentos.documentos d JOIN documentos.documentos_archivos f ON f.documento_id=d.id
        WHERE d.estado='confirmado' AND f.empresa_codigo=${s.empresa} AND f.cliente_destino_id=${s.clienteId}
          AND f.expediente_id IS NOT DISTINCT FROM ${s.expedienteId}::bigint AND f.storage_provider='r2'
          AND f.metadata->>'archivadoNuevo'='true' AND f.id NOT IN(546,552,553)
          AND NOT EXISTS(SELECT 1 FROM documentos.archivados_documentales a WHERE a.archivo_id=f.id)
        GROUP BY d.id ORDER BY min(f.metadata->>'archivadoIntentadoEn') NULLS FIRST,d.id LIMIT 20`;
      for(const d of docs)await this.documental!.registrarDocumentoConfirmado(tx,Number(d.id),null,'REGULARIZACION_MANUAL');
    });
    return this.procesarContexto(s);
  }
  async alGuardar(documentoIds:number[],archivoIds:number[]){return this.procesarDocumentosConfirmados(documentoIds,archivoIds);}
  /** Existing operational invocation may call this method; no cron/timer is created. */
  async ejecutarDiario(){this.requireEnabled();const scopes=await sql<Scope[]>`SELECT DISTINCT empresa_codigo AS empresa,cliente_destino_id AS "clienteId",expediente_id AS "expedienteId"
    FROM documentos.archivados_documentales WHERE confirmado_en IS NOT NULL AND trabajo_estado<>'COMPLETADO' ORDER BY empresa_codigo,cliente_destino_id,expediente_id LIMIT 100`;
    for(const s of scopes)await this.procesarContexto(s);return{contextos:scopes.length};}
  async procesarReservaExactaDev():Promise<ResultadoMove>{
    throw new ForbiddenException('ARCHIVADO_FOCAL_546_CERRADO');
  }

  private eliminacionDevAutorizada(s:Scope,exacta?:Exacta):boolean{
    const floor=this.config.get<string>('R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID');
    const newRun=!!floor&&/^[1-9]\d*$/.test(floor)&&Number.isSafeInteger(Number(floor))
      &&!!exacta&&exacta.archivoId>=Number(floor);
    return !!exacta&&exacta.autorizado===true
      &&![546,552,553].includes(exacta.archivoId)
      &&(this.config.get<string>('R2_NAS_DEV_DELETE_NEW_CONFIRMED')==='true'&&newRun
        ||(RECUPERACION_DEV_554_555.some(e=>e.reservaId===exacta.id&&e.archivoId===exacta.archivoId&&e.documentoId===exacta.documentoId
          &&e.empresa===s.empresa&&e.clienteId===s.clienteId&&e.expedienteId===s.expedienteId)
          &&this.permitidos('R2_NAS_DEV_DELETE_FILE_IDS').includes(exacta.archivoId)))
      &&this.config.get<string>('NODE_ENV')==='development'
      &&this.config.get<string>('R2_NAS_DESTINATION')==='SYNOLOGY_DEV'
      &&this.config.get<string>('R2_NAS_VIEWER_ACCEPTED')==='true'
      &&this.config.get<string>('R2_NAS_DEV_DELETE_ENABLED')==='true';
  }

  private async procesarContexto(s:Scope,exacta?:Exacta):Promise<{resultados:ResultadoMove[];expedienteId:number|null;estados:any[];bloqueosNomenclatura:any[]}>{
    this.requireEnabled();const nas=this.nas(),repo=new ArchivadoRepository(this.db());
    const cuenta=this.config.get<string>('R2_ACCOUNT_ID')||this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const bucket=this.config.get<string>('R2_BUCKET')||this.config.get<string>('R2_BUCKET_NAME')||this.config.get<string>('STORAGE_R2_BUCKET');
    if(!cuenta||!bucket)throw new ServiceUnavailableException('ARCHIVADO_R2_IDENTIDAD_NO_CONFIGURADA');
    const r2=new ArchivadoR2Adapter(this.storage.getArchivadoClient(),cuenta,bucket,this.storage);
    const deleteRequested=this.eliminacionDevAutorizada(s,exacta);
    const deleteEligible=deleteRequested&&await this.permitido({id:exacta!.id,archivo_id:exacta!.archivoId,documento_id:exacta!.documentoId,
      version:exacta!.version,empresa_codigo:s.empresa,cliente_destino_id:s.clienteId});
    const service=new ArchivadoMoveService(repo,r2,nas,{
      conExclusion:async(row,work)=>{const c=await sql.reserve();try{
        const keys=[row.r2_key,...(row.contexto?.origenFisico?[row.contexto.origenFisico.key]:[]),...(row.contexto?.origenMaterializacion?[row.contexto.origenMaterializacion.key]:[])].sort();
        const run=async(i:number):Promise<any>=>i===keys.length?work():conExclusionFisica(c,row.r2_cuenta,row.r2_bucket,keys[i],()=>run(i+1));
        return await run(0);
      }finally{c.release();}},
      verificarLectura:async row=>{
        // Actual viewer acceptance is an explicit future gate, never inferred from a build.
        if(this.config.get<string>('R2_NAS_VIEWER_ACCEPTED')!=='true')return false;
        const ticket=this.tokens().emitir({archivoId:row.archivo_id,reservaId:row.reserva_id,empresa:row.empresa_codigo,clienteId:row.cliente_destino_id,sha256:row.sha256},Date.now());
        await this.leerPreview(row.archivo_id,ticket);return true;
      },
      verificarOrigenMaterializacion:async row=>{
        const origin=row.contexto?.origenMaterializacion;if(!origin)return true;
        const [r]=await sql`SELECT
          NOT EXISTS(SELECT 1 FROM documentos.documentos_archivos f WHERE f.storage_bucket=${origin.bucket}
            AND (f.storage_key=${origin.key} OR f.ruta_archivo=${origin.key}))
          AND NOT EXISTS(SELECT 1 FROM documentos.carga_operaciones c WHERE c.storage_bucket=${origin.bucket}
            AND (c.storage_key=${origin.key} OR c.destino_storage_key=${origin.key} OR c.metadata->>'destinoReservado'=${origin.key}))
          AND NOT EXISTS(SELECT 1 FROM documentos.ocr_resultados o WHERE o.metadata->>'storageKey'=${origin.key}
            OR o.metadata->>'storage_key'=${origin.key})
          AND NOT EXISTS(SELECT 1 FROM documentos.archivados_documentales a WHERE a.r2_cuenta=${row.r2_cuenta}
            AND a.r2_bucket=${origin.bucket} AND a.r2_key=${origin.key}) AS safe`;
        return r?.safe===true;
      },
      verificarReferenciasYExclusion:async row=>{
        const [r]=await sql`SELECT EXISTS(SELECT 1 FROM documentos.documentos_archivos f
          JOIN documentos.documentos d ON d.id=f.documento_id
          WHERE f.id=${row.archivo_id} AND f.documento_id=${row.documento_id} AND f.version=${row.version}
            AND d.estado='confirmado' AND f.storage_bucket=${row.r2_bucket} AND f.storage_key=${row.r2_key}
            AND f.hash_sha256=${row.sha256} AND f.empresa_codigo=${row.empresa_codigo} AND f.cliente_destino_id=${row.cliente_destino_id})
          AND NOT EXISTS(SELECT 1 FROM documentos.documentos_archivos f WHERE f.id<>${row.archivo_id}
            AND (f.storage_bucket=${row.r2_bucket} OR f.storage_bucket IS NULL)
            AND (f.storage_key=${row.r2_key} OR f.ruta_archivo=${row.r2_key}))
          AND NOT EXISTS(SELECT 1 FROM documentos.carga_operaciones co
            WHERE ((co.storage_bucket=${row.r2_bucket} AND co.storage_key=${row.r2_key})
              OR (co.destino_storage_bucket=${row.r2_bucket} AND co.destino_storage_key=${row.r2_key})
              OR (co.storage_bucket=${row.r2_bucket} AND co.metadata->>'destinoReservado'=${row.r2_key}))
            AND NOT((co.archivo_id=${row.archivo_id} AND co.promovida_en IS NOT NULL
              AND co.metadata#>>'{integration,completed}'='true') IS TRUE)
              AND NOT((co.archivo_id=${row.archivo_id} AND co.documento_id=${row.documento_id}
                AND co.estado IN('almacenada','completada') AND co.almacenada_en IS NOT NULL
                AND co.requiere_reconciliacion=false) IS TRUE))
          AND NOT EXISTS(SELECT 1 FROM documentos.ocr_resultados o
            WHERE (o.metadata->>'storageKey'=${row.r2_key} OR o.metadata->>'storage_key'=${row.r2_key})
              AND NOT((o.archivo_id=${row.archivo_id} AND o.documento_id=${row.documento_id}
                AND o.estado IN('confirmado','confirmado_como_version')) IS TRUE)) AS safe`;
        return r?.safe===true;
      },
    },{eliminacionRealHabilitada:deleteEligible});
    const resultados:ResultadoMove[]=[];
    if(exacta){
      resultados.push(await service.procesarReservaExacta(exacta.id,exacta.archivoId,exacta.documentoId,
        s.empresa,s.clienteId,s.expedienteId,exacta.version));
    }else{
      // Manual/daily use the same exact selector; never claim unrelated/historical rows.
      const rows=await sql`SELECT a.* FROM documentos.archivados_documentales a
        JOIN documentos.documentos_archivos f ON f.id=a.archivo_id
        WHERE a.empresa_codigo=${s.empresa} AND a.cliente_destino_id=${s.clienteId}
          AND a.expediente_id IS NOT DISTINCT FROM ${s.expedienteId}::bigint
          AND a.confirmado_en IS NOT NULL AND a.r2_estado<>'ELIMINADO_ACREDITADO'
          AND f.metadata->>'archivadoNuevo'='true' AND a.archivo_id NOT IN(546,552,553)
        ORDER BY a.id LIMIT 20`;
      for(const row of rows)if(await this.permitido(row)){
        const r=await this.procesarContexto(s,{id:Number(row.id),archivoId:Number(row.archivo_id),
          documentoId:Number(row.documento_id),version:Number(row.version),autorizado:true});
        resultados.push(...r.resultados);
      }
    }
    return{resultados,...await this.resumenScope(s)};
  }
  async previewUrl(archivoId:number,authorization?:string):Promise<{url:string;expiresIn:number}|null>{
    const rows=await sql<ArchivadoRow[]>`SELECT * FROM documentos.archivados_documentales WHERE archivo_id=${archivoId}`;
    const row=rows[0];if(!row)return null;
    if(!this.visorHabilitado()){
      if(row.r2_estado==='ELIMINADO_ACREDITADO')throw new ServiceUnavailableException('ARCHIVADO_VISOR_NO_HABILITADO');
      return null;
    }
    if(!authorization?.startsWith('Bearer '))throw new UnauthorizedException('Token requerido');
    const auth:any=await firstValueFrom(this.nats.send(NatsSubjects.AuthValidateToken,{token:authorization.slice(7).trim()}).pipe(timeout(10000)));
    if(!auth?.valid)throw new UnauthorizedException('Token inválido');
    const p=auth.payload,empresa=String(p?.empresa??p?.empresaCodigo??'').trim().toUpperCase();
    if(p?.sistema!=='DOCUMENTAL'||empresa!==row.empresa_codigo||Number(p?.clienteDestinoId)!==row.cliente_destino_id
      )
      throw new ForbiddenException('ARCHIVADO_PREVIEW_CONTEXTO');
    if(row.nas_estado!=='VERIFICADO'){
      if(row.r2_estado==='ELIMINADO_ACREDITADO')throw new ServiceUnavailableException('ARCHIVADO_NAS_NO_DISPONIBLE');return null;
    }
    const base=this.config.get<string>('R2_NAS_PUBLIC_GATEWAY_URL');
    if(!base){if(row.r2_estado==='ELIMINADO_ACREDITADO')throw new ServiceUnavailableException('ARCHIVADO_VISOR_NO_CONFIGURADO');return null;}
    let origin:string;
    try{origin=origenPublicoArchivado(this.config,base);}catch{throw new ServiceUnavailableException('ARCHIVADO_VISOR_ORIGEN_INVALIDO');}
    try{await this.nas().verificar(row);}catch{
      if(row.r2_estado==='PRESENTE')return null;
      throw new ServiceUnavailableException('ARCHIVADO_NAS_NO_DISPONIBLE');
    }
    const ticket=this.tokens().emitir({archivoId,reservaId:row.reserva_id,empresa:row.empresa_codigo,clienteId:row.cliente_destino_id,sha256:row.sha256},Date.now());
    return{url:`${origin}/api/v1/documentos/archivado/preview/${archivoId}?ticket=${encodeURIComponent(ticket)}`,expiresIn:120};
  }
  async leerPreview(archivoId:number,ticket:string):Promise<Buffer>{
    this.requireViewerEnabled();let c;try{c=this.tokens().validar(ticket,archivoId,Date.now());}catch{throw new UnauthorizedException('ARCHIVADO_PREVIEW_INVALID');}
    const rows=await sql<ArchivadoRow[]>`SELECT a.* FROM documentos.archivados_documentales a
      JOIN documentos.documentos_archivos f ON f.id=a.archivo_id WHERE a.archivo_id=${archivoId} AND a.reserva_id=${c.reservaId}
      AND a.empresa_codigo=${c.empresa} AND a.cliente_destino_id=${c.clienteId} AND a.sha256=${c.sha256}
      AND a.nas_estado='VERIFICADO' AND f.empresa_codigo=a.empresa_codigo AND f.cliente_destino_id=a.cliente_destino_id`;
    if(rows.length!==1)throw new ForbiddenException('ARCHIVADO_PREVIEW_CONTEXTO');
    const data=await this.nas().leerParaVisor(rows[0]);
    const mime=mimeArchivadoDesdeContenido(data);
    if(!mime||!rows[0].ruta_relativa.endsWith('.'+extensionArchivadoDesdeMime(mime)))throw new ServiceUnavailableException('ARCHIVADO_FORMATO_NO_COINCIDE');
    return data;
  }
}
