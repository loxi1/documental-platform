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
