import { AsyncLocalStorage } from 'node:async_hooks';
const held=new AsyncLocalStorage<ReadonlySet<string>>();
export function poseeExclusionFisica(cuenta:string,bucket:string,key:string):boolean{return held.getStore()?.has(claveExclusionFisica(cuenta,bucket,key))===true;}
/** Shared by every semantic-key writer and the archive worker; no transaction spans I/O. */
export function claveExclusionFisica(cuenta: string, bucket: string, key: string): string {
  if(!cuenta||!bucket||!key)throw new Error('ARCHIVADO_IDENTIDAD_FISICA_INVALIDA');
  return 'r2-nas:'+JSON.stringify([cuenta,bucket,key]);
}
export async function conExclusionFisica<T>(connection: {
  unsafe(query: string, values: any[]): PromiseLike<any[]>;
},cuenta:string,bucket:string,key:string,work:()=>Promise<T>):Promise<T>{
  const identity=claveExclusionFisica(cuenta,bucket,key);
  if(held.getStore()?.has(identity))return work();
  const [row]=await connection.unsafe('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[identity]);
  if(row?.locked!==true)throw new Error('ARCHIVADO_OBJETO_OCUPADO');
  try{return await held.run(new Set([...(held.getStore()??[]),identity]),work);}
  finally{await connection.unsafe('SELECT pg_advisory_unlock(hashtextextended($1,0))',[identity]);}
}

/** Shared immutable-key fence for every institutional writer, including direct uploads. */
export async function protegerReservaConfirmadaFisica(connection:{unsafe(query:string,values:any[]):PromiseLike<any[]>},
  cuenta:string,bucket:string,key:string):Promise<void>{
  if(!poseeExclusionFisica(cuenta,bucket,key))throw new Error('ARCHIVADO_DELETE_SIN_EXCLUSION');
  const rows=await connection.unsafe(`SELECT confirmado_en,r2_estado FROM documentos.archivados_documentales
    WHERE r2_cuenta=$1 AND r2_bucket=$2 AND r2_key=$3`,[cuenta,bucket,key]);
  if(rows.some(r=>r.confirmado_en||['ELIMINACION_INICIADA','ELIMINACION_INCIERTA','ELIMINADO_ACREDITADO','AUSENTE_OBSERVADO'].includes(r.r2_estado)))
    throw new Error('ARCHIVADO_RESERVA_CONFIRMADA_INMUTABLE');
}
