import { createHash } from 'node:crypto';
import type { CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ArchivadoR2, ContenidoArchivado } from './archivado-move.service';
import type { ArchivadoRow } from './archivado.repository';
import { poseeExclusionFisica } from './archivado-exclusion';

/** Reuses the existing configured SDK client; never discovers credentials or changes bucket settings. */
export class ArchivadoR2Adapter implements ArchivadoR2 {
  private readonly deleteClient:S3Client;
  private readonly pruebas=new Map<string,{etag:string;fecha:number;bytes:number}>();
  constructor(private readonly client: S3Client, private readonly cuenta: string, private readonly bucket: string,
    private readonly transferencia?: Pick<CargaSeguraStorage,'copyObject'|'verifyExistingObject'>,
    private readonly politica:{exclusionRequerida?:boolean}={}) {
    // Reuse the configured endpoint/credentials/handler, but never retry an ambiguous DELETE.
    this.deleteClient=client.config?new S3Client({region:client.config.region,credentials:client.config.credentials,
      endpoint:client.config.endpoint,endpointProvider:client.config.endpointProvider,
      forcePathStyle:client.config.forcePathStyle,requestHandler:client.config.requestHandler,maxAttempts:1}):client;
  }
  identidad() { return { cuenta: this.cuenta, bucket: this.bucket }; }
  private async verificarEndpointReal():Promise<void>{
    if(!this.politica.exclusionRequerida)return;
    const endpoint=await this.client.config?.endpoint?.();
    if(!endpoint||endpoint.protocol!=='https:'||endpoint.hostname!==`${this.cuenta}.r2.cloudflarestorage.com`
      ||(endpoint.path!==undefined&&endpoint.path!=='/'))throw new Error('ARCHIVADO_R2_ENDPOINT_NO_ACREDITADO');
  }
  private input(row: ContenidoArchivado) {
    if (row.r2_cuenta !== this.cuenta || row.r2_bucket !== this.bucket || !row.r2_key
      || row.r2_key.startsWith('documentos/tmp/')) throw new Error('ARCHIVADO_ENTORNO_NO_COINCIDE');
    return { Bucket: this.bucket, Key: row.r2_key };
  }
  async materializar(row:ArchivadoRow):Promise<void>{
    if(row.contexto?.modo!=='NUEVO_TARDIO')return;
    const origin=row.contexto.origenFisico;
    if(!this.transferencia||!origin||origin.bucket!==this.bucket||origin.key===row.r2_key
       ||!origin.key.startsWith('documentos/')||origin.key.startsWith('documentos/tmp/'))throw new Error('ARCHIVADO_ORIGEN_TARDIO_INVALIDO');
    this.input(row);
    const input={provider:'r2' as const,bucket:this.bucket,sourceKey:origin.key,destinationKey:row.r2_key,
      hashSha256:row.sha256,tamanoBytes:Number(row.tamano_bytes),operationIdentity:row.reserva_id,contentType:'application/pdf'};
    if(await this.comprobar(row)==='PRESENTE')await this.transferencia.verifyExistingObject(input);
    else await this.transferencia.copyObject(input);
  }
  async leer(row: ContenidoArchivado): Promise<AsyncIterable<Uint8Array>> {
    const r = await this.client.send(new GetObjectCommand(this.input(row)), { abortSignal: AbortSignal.timeout(30000) });
    if (r.ContentLength !== Number(row.tamano_bytes) || !r.Body) throw new Error('ARCHIVADO_R2_TAMANO_NO_COINCIDE');
    return r.Body as AsyncIterable<Uint8Array>;
  }
  async comprobar(row: ContenidoArchivado): Promise<'PRESENTE' | 'AUSENTE'> {
    try {
      const r = await this.client.send(new HeadObjectCommand(this.input(row)), { abortSignal: AbortSignal.timeout(15000) });
      if (r.ContentLength !== Number(row.tamano_bytes)) throw new Error('ARCHIVADO_R2_TAMANO_NO_COINCIDE');
      // ETag is not SHA256; the NAS publication path hashes the actual object stream.
      if (r.Metadata?.sha256 && r.Metadata.sha256 !== row.sha256) throw new Error('ARCHIVADO_R2_HASH_NO_COINCIDE');
      return 'PRESENTE';
    } catch (err) {
      if ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return 'AUSENTE';
      throw err;
    }
  }
  private origen(row:ArchivadoRow):ArchivadoRow{
    const o=row.contexto?.origenMaterializacion;
    if(row.contexto?.modo!=='NUEVO'||!o||o.bucket!==row.r2_bucket||o.key===row.r2_key
      ||!o.key.startsWith('documentos/')||o.key.startsWith('documentos/tmp/'))throw new Error('ARCHIVADO_ORIGEN_MATERIALIZACION_INVALIDO');
    return {...row,r2_key:o.key};
  }
  async comprobarOrigen(row:ArchivadoRow){return this.comprobar(this.origen(row));}
  async verificarOrigen(row:ArchivadoRow){
    if(this.politica.exclusionRequerida){await this.verificarParaEliminar(this.origen(row));return;}
    const hash=createHash('sha256');let bytes=0;
    for await(const chunk of await this.leer(this.origen(row))){bytes+=chunk.byteLength;
      if(bytes>Number(row.tamano_bytes))throw new Error('ARCHIVADO_ORIGEN_INTEGRIDAD');hash.update(chunk);}
    if(bytes!==Number(row.tamano_bytes)||hash.digest('hex')!==row.sha256)throw new Error('ARCHIVADO_ORIGEN_INTEGRIDAD');
  }
  async eliminarOrigen(row:ArchivadoRow){return this.eliminarExacto(this.origen(row));}
  async verificarParaEliminar(row:ContenidoArchivado):Promise<{etag:string;sha256:string;bytes:number}>{
    this.pruebas.delete(row.r2_key);
    await this.verificarEndpointReal();
    const input=this.input(row);
    if(!poseeExclusionFisica(this.cuenta,this.bucket,row.r2_key))throw new Error('ARCHIVADO_DELETE_SIN_EXCLUSION');
    const r=await this.client.send(new GetObjectCommand(input),{abortSignal:AbortSignal.timeout(30000)});
    const stream=r.Body as AsyncIterable<Uint8Array>|undefined;
    if(!stream||r.ContentLength!==Number(row.tamano_bytes)||!r.ETag||!r.LastModified)
      throw new Error('ARCHIVADO_DELETE_IDENTIDAD_NO_ACREDITADA');
    const hash=createHash('sha256');let bytes=0;
    for await(const chunk of stream){bytes+=chunk.byteLength;
      if(bytes>Number(row.tamano_bytes))throw new Error('ARCHIVADO_R2_INTEGRIDAD');hash.update(chunk);}
    if(bytes!==Number(row.tamano_bytes)||hash.digest('hex')!==row.sha256)throw new Error('ARCHIVADO_R2_INTEGRIDAD');
    this.pruebas.set(row.r2_key,{etag:r.ETag,fecha:r.LastModified.getTime(),bytes});
    return {etag:r.ETag,sha256:row.sha256,bytes};
  }
  async eliminarExacto(row: ContenidoArchivado) {
    const input=this.input(row);
    let ifMatch:string|undefined;
    if(this.politica.exclusionRequerida){
      await this.verificarEndpointReal();
      if(!poseeExclusionFisica(this.cuenta,this.bucket,row.r2_key))throw new Error('ARCHIVADO_DELETE_SIN_EXCLUSION');
      const p=this.pruebas.get(row.r2_key);this.pruebas.delete(row.r2_key);
      if(!p)throw new Error('ARCHIVADO_DELETE_IDENTIDAD_NO_ACREDITADA');
      const current=await this.client.send(new HeadObjectCommand(input),{abortSignal:AbortSignal.timeout(15000)});
      if(current.ETag!==p.etag||current.LastModified?.getTime()!==p.fecha||current.ContentLength!==p.bytes)
        throw new Error('ARCHIVADO_R2_OBJETO_SUSTITUIDO');
      // Conditional DELETE was physically verified in DEV (412 on mismatch; 204/404 on match).
      // ETag is an opaque concurrency token, NOT SHA256. No unconditional production fallback.
      ifMatch=p.etag;
    }
    const r = await this.deleteClient.send(new DeleteObjectCommand({...input,...(ifMatch?{IfMatch:ifMatch}:{})}), { abortSignal: AbortSignal.timeout(15000) });
    const http = r.$metadata.httpStatusCode ?? 0;
    if (http < 200 || http >= 300) throw new Error('ARCHIVADO_DELETE_NO_EXITOSO');
    return { http, requestId: r.$metadata.requestId ?? null };
  }
}
