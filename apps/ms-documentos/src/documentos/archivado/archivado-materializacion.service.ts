import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from '@documental/database';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { ArchivadoRepository, ArchivadoSql } from './archivado.repository';
import { extensionArchivadoDesdeMime } from './archivado-nomenclatura';
import { conExclusionFisica } from './archivado-exclusion';

type Tx={unsafe:(q:string,v:any[])=>PromiseLike<any[]>};
const adapter=(tx:Tx):ArchivadoSql=>({query:async<T>(q:string,v:unknown[])=>await tx.unsafe(q,v) as T[]});
/** reserve() exposes unsafe/release, not begin. Never returns an uncertain transaction to its owner. */
export async function transaccionReservaDurable<T>(connection:Tx,work:()=>Promise<T>,retener:()=>void):Promise<T>{
 try{
  const begin:any=await connection.unsafe('BEGIN',[]);
  if(begin.command!=='BEGIN')throw new Error('ARCHIVADO_RESERVA_BEGIN_NO_ACREDITADO');
  const result=await work();
  const commit:any=await connection.unsafe('COMMIT',[]);
  if(commit.command!=='COMMIT')throw new Error('ARCHIVADO_RESERVA_COMMIT_NO_ACREDITADO');
  return result;
 }catch(error){
  try{const rollback:any=await connection.unsafe('ROLLBACK',[]);if(rollback.command!=='ROLLBACK')throw new Error('ARCHIVADO_RESERVA_ROLLBACK_NO_ACREDITADO');}
  catch(rollback){retener();throw new AggregateError([error,rollback],'ARCHIVADO_RESERVA_ROLLBACK_INCIERTO');}
  throw error;
 }
}
function identidad(parts:unknown[]):string{
 const h=createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0,32);
 return `${h.slice(0,8)}-${h.slice(8,12)}-8${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20)}`;
}
/** Durable pre-PUT reservation survives a rollback of the final business transaction.
 * The original remains untouched until the common MOVE proves NAS and cleanup safety.
 * No NAS I/O, OCR execution, period or name resolution occurs in this writer. */
@Injectable()
export class ArchivadoMaterializacionService {
 private readonly session=new AsyncLocalStorage<Awaited<ReturnType<typeof sql.reserve>>>();
 private active=0;
 // No public per-reserved-connection destroy API in postgres@3.4.9. Retain, never release to pool.
 private readonly retenidas=new Set<Awaited<ReturnType<typeof sql.reserve>>>();
 private readonly waiting:Array<()=>void>=[];
 constructor(private readonly config:ConfigService,private readonly storage:R2CargaSeguraStorage){}
 async conSesion<T>(work:()=>Promise<T>):Promise<T>{
  if(this.retenidas.size)throw new ServiceUnavailableException('ARCHIVADO_CONEXION_RETENIDA_REQUIERE_REVISION');
  if(this.session.getStore())return work();
  // Acquire the independent reservation channel BEFORE any business row locks.
  // Bound concurrency prevents all pool slots being held by reservations waiting for business transactions.
  if(this.active>=2)await new Promise<void>(resolve=>this.waiting.push(resolve));else this.active++;
  let connection:Awaited<ReturnType<typeof sql.reserve>>|undefined;
  try{
   if(this.retenidas.size)throw new ServiceUnavailableException('ARCHIVADO_CONEXION_RETENIDA_REQUIERE_REVISION');
   connection=await sql.reserve();return await this.session.run(connection,work);
  }
  finally{
   try{if(connection&&!this.retenidas.has(connection))connection.release();}
   catch(error){if(connection)this.retenidas.add(connection);throw error;}
   finally{const next=this.waiting.shift();if(next)next();else this.active--;}
  }
 }
 async ejecutar(tx:Tx,f:any,n:{rutaRelativa:string;regla:string},periodo:{anio:number;mes:number},ordenPagoId?:number):Promise<void>{
  if([546,552,553].includes(Number(f.id)))throw new Error('ARCHIVADO_ARCHIVO_PROTEGIDO');
  const contentType=f.documento_mime??f.metadata?.contentType;
  const ext=extensionArchivadoDesdeMime(contentType);
  if(ext==='SIN_REGLA'||!n.rutaRelativa.endsWith('.'+ext))throw new Error('ARCHIVADO_FORMATO_NO_COINCIDE');
  const session=this.session.getStore();
  if(!session)return this.conSesion(()=>this.ejecutar(tx,f,n,periodo,ordenPagoId));
  const cuenta=this.config.get<string>('R2_ACCOUNT_ID')||this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
  if(!cuenta)throw new Error('ARCHIVADO_R2_CUENTA_NO_CONFIGURADA');
  const reservaId=identidad(['MATERIALIZACION_CONFIRMADA',cuenta,f.storage_bucket,Number(f.id),n.rutaRelativa]);
  const origen={bucket:f.storage_bucket,key:f.storage_key};
  const reserva={reservaId,empresa:f.empresa_codigo,clienteId:Number(f.cliente_destino_id),
   expedienteId:f.expediente_id==null?null:Number(f.expediente_id),workspaceId:f.workspace_id==null?null:Number(f.workspace_id),
   contexto:{origen:'MATERIALIZACION_CONFIRMADA',modo:'NUEVO',archivoId:Number(f.id),documentoId:Number(f.documento_id),
    origenMaterializacion:origen,...(ordenPagoId?{ordenPagoId}:{})},regla:n.regla,anio:periodo.anio,mes:periodo.mes,
   cuenta,bucket:f.storage_bucket,key:n.rutaRelativa,sha256:f.hash_sha256,bytes:Number(f.bytes),
   nasDestino:this.config.get<string>('R2_NAS_DESTINATION')||'SYNOLOGY_DEV',ruta:n.rutaRelativa,
   actorId:f.creado_por==null?null:Number(f.creado_por)};
  // No uncommitted document/file FK is introduced here; only the physical identity is reserved.
  await transaccionReservaDurable(session,()=>new ArchivadoRepository(adapter(session)).reservar(reserva),()=>{this.retenidas.add(session)});
  const lock=session;
  {
   const keys=[origen.key,n.rutaRelativa].sort();
   await conExclusionFisica(lock,cuenta,f.storage_bucket,keys[0],()=>
    conExclusionFisica(lock,cuenta,f.storage_bucket,keys[1],async()=>{
     const input={provider:'r2' as const,bucket:f.storage_bucket,sourceKey:origen.key,destinationKey:n.rutaRelativa,
      hashSha256:f.hash_sha256,tamanoBytes:Number(f.bytes),operationIdentity:reservaId,contentType};
     const existing=await this.storage.statObject({provider:'r2',bucket:f.storage_bucket,key:n.rutaRelativa});
     if(existing.exists)await this.storage.verifyExistingObject(input);
     else await this.storage.copyObject(input);
     // Re-read/verify even after PUT: a successful request alone is not content evidence.
     await this.storage.verifyExistingObject(input);
     const rows=await tx.unsafe(`UPDATE documentos.documentos_archivos SET storage_key=$2,ruta_archivo=$2,
       metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('archivadoReserva',$3::jsonb,'archivadoOrigenTecnico',$4::jsonb)
       WHERE id=$1 AND documento_id=$5 AND version=$6 AND storage_bucket=$7 AND storage_key=$8
         AND hash_sha256=$9 AND empresa_codigo=$10 AND cliente_destino_id=$11 RETURNING id`,
       [f.id,n.rutaRelativa,JSON.stringify({reservaId,key:n.rutaRelativa}),JSON.stringify(origen),f.documento_id,f.version,
        f.storage_bucket,origen.key,f.hash_sha256,f.empresa_codigo,f.cliente_destino_id]);
     if(rows.length!==1)throw new Error('ARCHIVADO_MATERIALIZACION_CAS_CONFLICT');
     // Move only this file's mutable read pointers; retain original identity in durable audit/context.
     await tx.unsafe(`UPDATE documentos.ocr_resultados SET metadata=coalesce(metadata,'{}'::jsonb)
       ||jsonb_build_object('archivadoOrigenTecnico',$3::text)
       ||CASE WHEN metadata->>'storageKey'=$3 THEN jsonb_build_object('storageKey',$2::text) ELSE '{}'::jsonb END
       ||CASE WHEN metadata->>'storage_key'=$3 THEN jsonb_build_object('storage_key',$2::text) ELSE '{}'::jsonb END
       WHERE archivo_id=$1 AND (metadata->>'storageKey'=$3 OR metadata->>'storage_key'=$3)`,[f.id,n.rutaRelativa,origen.key]);
     await tx.unsafe(`UPDATE documentos.carga_operaciones SET
       storage_key=CASE WHEN storage_key=$3 THEN $2 ELSE storage_key END,
       destino_storage_key=CASE WHEN destino_storage_key=$3 THEN $2 ELSE destino_storage_key END,
       metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('archivadoOrigenTecnico',$3::text)
         ||CASE WHEN metadata->>'destinoReservado'=$3 THEN jsonb_build_object('destinoReservado',$2::text) ELSE '{}'::jsonb END
       WHERE archivo_id=$1 AND storage_bucket=$4
         AND (storage_key=$3 OR destino_storage_key=$3 OR metadata->>'destinoReservado'=$3)`,
       [f.id,n.rutaRelativa,origen.key,f.storage_bucket]);
     await new ArchivadoRepository(adapter(tx)).confirmar(reservaId,Number(f.id),Number(f.documento_id),Number(f.version));
    }));
  }
 }
}
