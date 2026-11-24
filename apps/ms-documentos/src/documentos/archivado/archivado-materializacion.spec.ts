jest.mock('@documental/database',()=>({sql:{begin:jest.fn(),reserve:jest.fn()}}));
import { createHash } from 'node:crypto';
import { sql } from '@documental/database';
import { ArchivadoMaterializacionService } from './archivado-materializacion.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
describe('Materializacion definitiva antes del commit documental',()=>{
 const data=Buffer.from('pdf-synthetic'),sha=createHash('sha256').update(data).digest('hex');
 const source='documentos/2026/11/BBTI/uuid__scan.pdf',dest='documentos/2026/04/BBTI/OC_003214.pdf';
 let events:string[],objects:Map<string,any>,storage:any,tx:any,service:ArchivadoMaterializacionService,file:any,durable:any;
 beforeEach(()=>{
  events=[];objects=new Map([[source,{sha,bytes:data.length}]]);
  file={documento_mime:'application/pdf',id:800,documento_id:900,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:999,
   workspace_id:4,creado_por:4,storage_bucket:'dev',storage_key:source,hash_sha256:sha,bytes:data.length};
  durable={unsafe:jest.fn(async(q:string)=>{events.push('reserve-durable');return q.startsWith('INSERT')?[{id:'10'}]:[{id:'10',r2_estado:'PRESENTE'}]})};
  (sql.begin as jest.Mock).mockImplementation(async work=>work(durable));
  (sql.reserve as jest.Mock).mockResolvedValue({unsafe:jest.fn(async(q:string,v:any[])=>{
    if(['BEGIN','COMMIT','ROLLBACK'].includes(q)){events.push(q);return Object.assign([],{command:q});}
    if(q.startsWith('SELECT pg_'))return [{locked:true}];
    return durable.unsafe(q,v);
   }),release:jest.fn()});
  storage={statObject:jest.fn(async()=>({exists:objects.has(dest)})),
   copyObject:jest.fn(async(i:any)=>{events.push('copy');objects.set(i.destinationKey,{sha:i.hashSha256,bytes:i.tamanoBytes,identity:i.operationIdentity})}),
   verifyExistingObject:jest.fn(async(i:any)=>{events.push('verify');expect(objects.get(i.destinationKey)).toEqual({sha,bytes:data.length,identity:i.operationIdentity})})};
  tx={unsafe:jest.fn(async(q:string)=>{events.push(q.startsWith('UPDATE documentos.documentos_archivos')?'bind':'domain-sql');return[{id:800}]})};
  service=new ArchivadoMaterializacionService({get:(k:string)=>k==='R2_ACCOUNT_ID'?'devaccount':undefined} as any,storage);
 });
 it('reserva durable, copia y verificacion preceden binding y commit; NAS es postcommit',async()=>{
  const boundary=new ArchivadoPostcommit();boundary.conectar(async()=>{events.push('nas')});
  await boundary.ejecutar(async()=>{
   await service.ejecutar(tx,file,{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4});
   boundary.registrar(900,800);expect(events).not.toContain('nas');events.push('commit');
  });
  for(const [a,b] of [['reserve-durable','copy'],['copy','verify'],['verify','bind'],['bind','commit'],['commit','nas']])expect(events.indexOf(a)).toBeLessThan(events.indexOf(b));
  expect(tx.unsafe.mock.calls[0][1][1]).toBe(dest);
  expect(objects.has(source)).toBe(true); // source protected until common MOVE cleanup authorization
 });
 it('rollback conserva original y reserva; reintento reutiliza exactamente el destino sin otro PUT',async()=>{
  const boundary=new ArchivadoPostcommit(),nas=jest.fn();boundary.conectar(nas);
  await expect(boundary.ejecutar(async()=>{
   await service.ejecutar(tx,file,{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4});boundary.registrar(900,800);throw new Error('rollback');
  })).rejects.toThrow('rollback');
  expect(nas).not.toHaveBeenCalled();expect(objects.has(source)).toBe(true);
  durable.unsafe.mockImplementation(async()=>[{id:'10',r2_estado:'PRESENTE'}]);
  await service.ejecutar(tx,file,{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4});
  expect(storage.copyObject).toHaveBeenCalledTimes(1);
  expect(storage.verifyExistingObject).toHaveBeenCalledTimes(3);
 });
 it('fallo de copia o integridad no actualiza el archivo ni elimina original',async()=>{
  storage.copyObject.mockRejectedValue(new Error('io'));
  await expect(service.ejecutar(tx,file,{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4})).rejects.toThrow('io');
  expect(tx.unsafe).not.toHaveBeenCalled();expect(objects.has(source)).toBe(true);
 });
 it('CAS del archivo rechazado impide confirmacion final',async()=>{
  tx.unsafe.mockResolvedValue([]);
  await expect(service.ejecutar(tx,file,{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4})).rejects.toThrow('CAS_CONFLICT');
  expect(tx.unsafe).toHaveBeenCalledTimes(1);expect(objects.has(source)).toBe(true);
 });
 it('versiones V2/V3 usan reservas y claves distintas sin sobrescribir V1',async()=>{
  objects.set(dest,{sha:'original-v1',bytes:99});
  storage.statObject.mockImplementation(async(i:any)=>({exists:objects.has(i.key)}));
  for(const version of [2,3])await service.ejecutar(tx,{...file,id:800+version,version},
   {rutaRelativa:dest.replace('.pdf',`__V${version}.pdf`),regla:'R1'},{anio:2026,mes:4});
  expect(objects.get(dest)).toEqual({sha:'original-v1',bytes:99});
  expect(objects.has(dest.replace('.pdf','__V2.pdf'))).toBe(true);expect(objects.has(dest.replace('.pdf','__V3.pdf'))).toBe(true);
  expect(storage.copyObject.mock.calls.map((c:any)=>c[0].destinationKey)).toEqual([dest.replace('.pdf','__V2.pdf'),dest.replace('.pdf','__V3.pdf')]);
 });
 it('MIME no coincidente con extensión bloquea antes de reserva y copia',async()=>{
  await expect(service.ejecutar(tx,{...file,documento_mime:'image/png'},{rutaRelativa:dest,regla:'R1'},{anio:2026,mes:4})).rejects.toThrow('ARCHIVADO_FORMATO_NO_COINCIDE');
  expect(storage.copyObject).not.toHaveBeenCalled();expect(durable.unsafe).not.toHaveBeenCalled();
 });

});
