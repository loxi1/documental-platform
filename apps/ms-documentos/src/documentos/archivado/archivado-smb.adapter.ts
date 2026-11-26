import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import type { ArchivadoNas, PruebaContenido, ContenidoArchivado } from './archivado-move.service';

type SmbConfig = { host: string; share: string; raiz: string; usuario: string; authFile: string; destino: string; production?: boolean };
/** DEV adapter only. Credentials are read by smbclient from a protected DEV auth file. */
export class ArchivadoSmbAdapter implements ArchivadoNas {
  constructor(private readonly config: SmbConfig) {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/.test(config.host)
      || !/^[A-Z0-9_-]+$/i.test(config.share) || !/^[A-Z0-9_-]+$/i.test(config.usuario)
      || (config.raiz!=='' && !/^[A-Z0-9_-]+(?:\/[A-Z0-9_-]+)*$/i.test(config.raiz)))
      throw new Error('ARCHIVADO_SMB_DESTINO_NO_AUTORIZADO');
    if (!config.production && (config.host !== '192.168.0.198' || config.share !== 'GESTION-DOCUMENTARIA'
      || config.raiz !== '_DEV_DOCUMENTAL_PLATFORM' || config.usuario !== 'documental_platform_dev')) {
      throw new Error('ARCHIVADO_SMB_DESTINO_NO_AUTORIZADO');
    }
  }
  private ruta(row: ContenidoArchivado): string {
    const csv=/^documentos\/((?!0000)\d{4})\/(0[1-9]|1[0-2])\/([A-Z0-9_-]{1,20})\/CENTROS_COSTO\/CENTROS_COSTO_\1\2(0[1-9]|[12]\d|3[01])_\d{9}\.csv$/.exec(row.ruta_relativa);
    const rutaValida=row.origen==='EXPEDIENTES_IMPORTACION'
      ?!!csv&&csv[3]===row.empresa_codigo&&/^[1-9]\d*$/.test(row.importacion_id??'')
        &&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.solicitud_id??'')
        &&Number.isFinite(Date.parse(`${csv[1]}-${csv[2]}-${csv[4]}T00:00:00Z`))
        &&new Date(`${csv[1]}-${csv[2]}-${csv[4]}T00:00:00Z`).toISOString().slice(0,10)===`${csv[1]}-${csv[2]}-${csv[4]}`
      :/^documentos\/\d{4}\/(0[1-9]|1[0-2])\/[A-Z0-9]+(?:[-_][A-Z0-9]+)*\/[A-Z0-9_,-]+\.(pdf|png|jpg)$/.test(row.ruta_relativa);
    if (row.nas_destino !== this.config.destino
      || !rutaValida
      || row.ruta_relativa.length > 220) throw new Error('ARCHIVADO_SMB_RUTA_INVALIDA');
    return [this.config.raiz,row.ruta_relativa].filter(Boolean).join('/');
  }
  private comando(command: string, allowCollision = false, allowMissing = false): Promise<'OK' | 'COLLISION' | 'ABSENT'> {
    return new Promise((resolve,reject) => {
      const child = spawn('smbclient',[`//${this.config.host}/${this.config.share}`,'-A',this.config.authFile,'-m','SMB3','-c',command], {
        shell:false,stdio:['ignore','pipe','pipe'],
        env:{PATH:process.env.PATH ?? '/usr/bin:/bin',LANG:'C'},timeout:30000,
      });
      let output = ''; let overflow = false;
      const collect = (b: Buffer) => { if (output.length + b.length > 16384) { overflow = true;child.kill(); } else output += b.toString(); };
      child.stdout!.on('data',collect);child.stderr!.on('data',collect);
      child.once('error',()=>reject(new Error('ARCHIVADO_SMB_EXEC_FAILED')));
      child.once('close',(code,signal)=>{
        const codes=output.match(/NT_STATUS_[A-Z0-9_]+/g) ?? [];
        if (!overflow && !signal && allowMissing && codes.length && codes.every(c=>['NT_STATUS_OBJECT_NAME_NOT_FOUND','NT_STATUS_OBJECT_PATH_NOT_FOUND'].includes(c))) return resolve('ABSENT');
        if (!overflow && !signal && allowCollision && codes.length && codes.every(c=>c==='NT_STATUS_OBJECT_NAME_COLLISION')) return resolve('COLLISION');
        if (overflow || signal || code !== 0 || codes.length) return reject(new Error('ARCHIVADO_SMB_IO_FAILED'));
        resolve('OK');
      });
    });
  }
  private async hash(file: string): Promise<PruebaContenido> {
    const h=createHash('sha256');let bytes=0;
    for await (const chunk of createReadStream(file)) { bytes+=chunk.length;h.update(chunk); }
    return {sha256:h.digest('hex'),bytes};
  }
  async leerParaVisor(row: ContenidoArchivado): Promise<Buffer> {
    const remote=this.ruta(row),dir=await mkdtemp(join(tmpdir(),'bbti-archive-view-'));
    try {
      const target=join(dir,'read.bin');await this.comando(`get ${remote} ${target}`);
      const p=await this.hash(target);
      if(p.bytes!==Number(row.tamano_bytes)||p.sha256!==row.sha256)throw new Error('ARCHIVADO_NAS_INTEGRIDAD');
      return await readFile(target);
    } finally {await rm(dir,{recursive:true,force:true});}
  }
  async verificar(row: ContenidoArchivado): Promise<PruebaContenido> {
    const remote=this.ruta(row),dir=await mkdtemp(join(tmpdir(),'bbti-archive-read-'));
    try {const target=join(dir,'read.bin');await this.comando(`get ${remote} ${target}`);
      const p=await this.hash(target);
      if (p.bytes!==Number(row.tamano_bytes)||p.sha256!==row.sha256) throw new Error('ARCHIVADO_NAS_INTEGRIDAD');return p;
    } finally {await rm(dir,{recursive:true,force:true});}
  }
  async publicarSinReemplazo(row: ContenidoArchivado, source: AsyncIterable<Uint8Array>, renovar: () => Promise<void>, registrarStaging: (ruta: string) => Promise<void>): Promise<PruebaContenido> {
    const remote=this.ruta(row),dir=await mkdtemp(join(tmpdir(),'bbti-archive-copy-'));
    try {
      const local=join(dir,'payload.bin'),expected=Number(row.tamano_bytes);
      if (!Number.isSafeInteger(expected)||expected<=0) throw new Error('ARCHIVADO_TAMANO_INVALIDO');
      let bytes=0;const hash=createHash('sha256');
      const check = new Transform({transform(chunk:Buffer,_encoding,callback){bytes+=chunk.length;
        if(bytes>expected)return callback(new Error('ARCHIVADO_R2_TAMANO_EXCEDIDO'));
        hash.update(chunk);callback(null,chunk);}});
      await pipeline(source,check,createWriteStream(local,{flags:'wx',mode:0o600}));
      if(bytes!==expected||hash.digest('hex')!==row.sha256)throw new Error('ARCHIVADO_R2_INTEGRIDAD');
      if((await stat(local)).size!==expected)throw new Error('ARCHIVADO_SPOOL_INTEGRIDAD');
      await renovar();
      const parts=remote.split('/');let parent='';
      for(const segment of parts.slice(0,-1)){parent=parent?`${parent}/${segment}`:segment;await this.comando(`mkdir ${parent}`,true);}
      const stagingId=row.origen==='EXPEDIENTES_IMPORTACION'?row.solicitud_id:row.reserva_id;
      if (!/^[0-9a-f-]{36}$/.test(stagingId??'')) throw new Error('ARCHIVADO_RESERVA_INVALIDA');
      const relativa=`${row.ruta_relativa.slice(0,row.ruta_relativa.lastIndexOf('/'))}/staging-${stagingId}`;
      if (row.staging_relativa && row.staging_relativa!==relativa) throw new Error('ARCHIVADO_STAGING_NO_COINCIDE');
      await registrarStaging(relativa);
      const staging=[this.config.raiz,relativa].filter(Boolean).join('/');
      await this.comando(`mkdir ${staging}`,true);
      const uploaded=join(dir,'uploaded.bin');
      const previous=await this.comando(`get ${staging}/payload.bin ${uploaded}`,false,true);
      if(previous==='ABSENT') {
        await this.comando(`put ${local} ${staging}/payload.bin`);
        await this.comando(`get ${staging}/payload.bin ${uploaded}`);
      }
      const p=await this.hash(uploaded);
      if(p.bytes!==expected||p.sha256!==row.sha256)throw new Error('ARCHIVADO_NAS_STAGING_INTEGRIDAD');
      await renovar();
      // No -f. Existing target is accepted only after full identity verification.
      await this.comando(`rename ${staging}/payload.bin ${remote}`,true);
      return await this.verificar(row);
    } finally { await rm(dir,{recursive:true,force:true}); }
  }
}
