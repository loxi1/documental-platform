jest.mock('@documental/database',()=>({sql:{}}));
jest.mock('@documental/shared',()=>({NatsSubjects:{OcrProcesarArchivo:'ocr.procesar-archivo'}}));
import { TmpService } from './tmp.service';
import { ArchivadoDocumentalService } from '../archivado/archivado-documental.service';
import { createHash } from 'node:crypto';
describe('Promoción TEMP semántica efectiva: reserva institucional y MIME exactos',()=>{
 it.each([['application/pdf','pdf'],['image/png','png'],['image/jpeg','jpg']])('%s promueve una vez con destino canónico exacto',async(mime,ext)=>{
  const data=Buffer.from('simulated-content'),hash=createHash('sha256').update(data).digest('hex'),key='documentos/2026/11/BBTEC/OP_185.'+ext;
  const actor:any={actorId:5,workspaceId:10,empresaCodigo:'BBTEC',clienteDestinoId:1,idempotencyKey:'identity'};
  const row:any={id:999,estado:'almacenada',content_type:mime,hash_sha256:hash,tamano_bytes:data.length,storage_bucket:'dev',storage_key:'tmp/999',empresa_codigo:'BBTEC',cliente_destino_id:1,
   metadata:{archivadoReserva:{reservaId:'r',key},destinoReservado:key,promocionIdentity:'identity'}};
  const c:any={unsafe:jest.fn(async()=>[{id:21}])};
  const repo:any={locked:async(_id:any,w:any)=>w(c),own:async()=>row,bind:jest.fn(),promoted:jest.fn(async()=>{row.promovida_en='now';row.destino_storage_key=key}),cleaned:async()=>{row.estado='completada'}};
  let exists=false;
  const storage:any={statObject:async(i:any)=>({exists:i.key==='tmp/999'||exists,hashSha256:hash,tamanoBytes:data.length}),copyObject:jest.fn(async()=>{exists=true}),verifyExistingObject:async()=>{},deleteObject:jest.fn()};
  const bridge=new ArchivadoDocumentalService({get:(k:string)=>k==='R2_NAS_ARCHIVE_ENABLED'?'true':undefined} as any);
  const archive:any={acreditarDestino:bridge.acreditarDestino.bind(bridge),conExclusion:async(_c:any,_r:any,_k:any,w:any)=>w()};
  const service=new TmpService(repo,{get:()=>undefined} as any,storage,{} as any,{} as any,undefined,undefined,archive);
  await service.promote(999,actor,key);await service.promote(999,actor,key);
  expect(storage.copyObject).toHaveBeenCalledTimes(1);expect(repo.promoted).toHaveBeenCalledTimes(1);
  expect(storage.copyObject.mock.calls[0][0]).toMatchObject({destinationKey:key,contentType:mime});
  const proof=c.unsafe.mock.calls.find((call:any)=>call[0].includes('contexto->'));expect(proof).toBeDefined();
 });
 it.each(['wrong-mime','wrong-company','wrong-identity','wrong-reservation','unknown-ext'])('%s rechaza antes de I/O',async change=>{
  const service:any=Object.create(TmpService.prototype);
  const key='documentos/2026/11/BBTEC/OP_185.png',row:any={content_type:'image/png',empresa_codigo:'BBTEC',metadata:{destinoReservado:key,promocionIdentity:'identity'}};
  if(change==='wrong-mime')row.content_type='application/pdf';if(change==='wrong-company')row.empresa_codigo='AJENO';if(change==='wrong-reservation')row.metadata.destinoReservado='other';
  expect(()=>service.destination(row,change==='unknown-ext'?key.replace('.png','.exe'):key,change==='wrong-identity'?'other':'identity',true)).toThrow('TMP_DESTINATION_CONFLICT');
 });
});
