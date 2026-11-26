jest.mock('@documental/database',()=>({sql:{reserve:jest.fn()}}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import {sql} from '@documental/database';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {S3Client,DeleteObjectCommand,GetObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {ArchivadoRuntimeService} from './archivado-runtime.service';
import {ArchivadoR2Adapter} from './archivado-r2.adapter';
import {conExclusionFisica} from './archivado-exclusion';
const body=Buffer.from('codigo_expediente,descripcion\n000001,PRUEBA\n'),sha=createHash('sha256').update(body).digest('hex');
const input={origen:'EXPEDIENTES_IMPORTACION' as const,importacionId:'100',solicitudId:'a1000000-0000-4000-8000-000000000001',empresaCodigo:'BBTI',workspaceId:1,clienteDestinoId:2,usuarioId:10,cuenta:'account',bucket:'bucket',storageKey:'documentos/2026/11/BBTI/CENTROS_COSTO/CENTROS_COSTO_20261126_162242381.csv',sha256:sha,tamanoBytes:body.length};
function fixture(){
 const values:Record<string,string>={NODE_ENV:'development',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',R2_ACCOUNT_ID:'account',R2_BUCKET:'bucket',R2_NAS_EXPEDIENTES_CSV_DELETE_ENABLED:'true',R2_NAS_PRODUCTION_DELETE_ENABLED:'false',R2_NAS_DEV_DELETE_ENABLED:'false'};
 const saved:Record<string,any>={id:'100',workspace_id:1,cliente_destino_id:2,usuario_id:10,nas_estado:'pendiente',r2_estado:'verificado',r2_etag:'"etag"',r2_delete_intento_id:null};
 const connection=Object.assign(jest.fn(async()=>[saved]),{unsafe:jest.fn(async()=>[{locked:true}]),release:jest.fn()});(sql.reserve as jest.Mock).mockResolvedValue(connection);
 const nas={publicarSinReemplazo:jest.fn(async()=>({sha256:sha,bytes:body.length})),verificar:jest.fn(async()=>({sha256:sha,bytes:body.length}))};
 const runtime=new ArchivadoRuntimeService({get:(k:string)=>values[k]} as any,{getArchivadoClient:()=>({send:jest.fn()})} as any,{} as any);jest.spyOn(runtime as any,'nas').mockReturnValue(nas);
 const leer=jest.spyOn(ArchivadoR2Adapter.prototype,'leer').mockResolvedValue(Readable.from([body]));
 const head=jest.spyOn(ArchivadoR2Adapter.prototype,'comprobar').mockResolvedValueOnce('PRESENTE').mockResolvedValue('AUSENTE');
 const verify=jest.spyOn(ArchivadoR2Adapter.prototype,'verificarParaEliminar').mockResolvedValue({etag:'"etag"',sha256:sha,bytes:body.length});
 const del=jest.spyOn(ArchivadoR2Adapter.prototype,'eliminarExacto').mockResolvedValue({http:204,requestId:null});
 const events:string[]=[];
 const persist=jest.fn(async(event:string,data:Record<string,unknown>)=>{events.push(event);
  if(event==='NAS_VERIFICADO'){saved.nas_estado='verificado';saved.nas_sha256=sha;saved.nas_tamano_bytes=body.length;}
  if(event==='DELETE_INTENT'){saved.r2_delete_intento_id=data.intentoId;saved.r2_estado='eliminacion_pendiente';}
  if(event==='DELETE_RESPUESTA')saved.r2_delete_respuesta_http=data.http;
  if(event==='DELETE_AUSENCIA')saved.r2_estado='eliminado';
  if(event==='DELETE_INCIERTO')saved.r2_estado='eliminacion_incierta';
 });
 return {runtime,values,saved,connection,nas,leer,head,verify,del,persist,events};
}
describe('CSV-specific authorization and durable NAS-before-DELETE protocol',()=>{
 beforeEach(()=>jest.restoreAllMocks());
 it('persiste NAS e intencion antes de DELETE y acredita respuesta+HEAD',async()=>{
  const f=fixture();await f.runtime.archivarImportacionCsv(input,f.persist);
  expect(f.events).toEqual(['NAS_VERIFICADO','DELETE_INTENT','DELETE_RESPUESTA','DELETE_AUSENCIA']);
  const intent=f.persist.mock.invocationCallOrder[1];expect(intent).toBeLessThan(f.del.mock.invocationCallOrder[0]);
  expect(f.saved.r2_estado).toBe('eliminado');expect(f.connection.release).toHaveBeenCalledTimes(1);
  expect(f.persist.mock.calls[0][1]).toMatchObject({nasSha256:sha,nasTamanoBytes:body.length,importacionId:'100'});
 });
 it('flag CSV ausente/deshabilitado no hereda autorizaciones contables',async()=>{
  const f=fixture();delete f.values.R2_NAS_EXPEDIENTES_CSV_DELETE_ENABLED;f.values.R2_NAS_PRODUCTION_DELETE_ENABLED='true';f.values.R2_NAS_DEV_DELETE_ENABLED='true';
  await f.runtime.archivarImportacionCsv(input,f.persist);expect(f.events).toEqual(['NAS_VERIFICADO']);expect(f.del).not.toHaveBeenCalled();
 });
 it('sin callback durable no puede eliminar',async()=>{
  const f=fixture();await f.runtime.archivarImportacionCsv(input);expect(f.del).not.toHaveBeenCalled();
 });
 it.each(['NAS_ERROR','BAD_HASH','PERSIST_ERROR'])('cero DELETE ante %s',async mode=>{
  const f=fixture();if(mode==='NAS_ERROR')f.nas.publicarSinReemplazo.mockRejectedValue(new Error('NAS_DOWN'));
  if(mode==='BAD_HASH')f.nas.verificar.mockResolvedValue({sha256:'0'.repeat(64),bytes:body.length});
  if(mode==='PERSIST_ERROR')f.persist.mockRejectedValue(new Error('DB_DOWN'));
  await expect(f.runtime.archivarImportacionCsv(input,f.persist)).rejects.toThrow();expect(f.del).not.toHaveBeenCalled();expect(f.connection.release).toHaveBeenCalled();
 });
 it.each([{storageKey:input.storageKey.replace('.csv','.pdf')},{empresaCodigo:'BBTEC'},{origen:'OTRO'},{cuenta:'other'}])('rechaza alcance incorrecto %p',async delta=>{
  const f=fixture();await expect(f.runtime.archivarImportacionCsv({...input,...delta} as typeof input,f.persist)).rejects.toThrow();expect(f.del).not.toHaveBeenCalled();
 });
 it('rechaza cliente distinto persistido',async()=>{
  const f=fixture();f.saved.cliente_destino_id=9;await expect(f.runtime.archivarImportacionCsv(input,f.persist)).rejects.toThrow('ARCHIVADO_IMPORTACION_NO_CONFIRMADA');expect(f.del).not.toHaveBeenCalled();
 });
 it('respuesta perdida seguida de404 permanece incierta, sin repetir DELETE',async()=>{
  const f=fixture();f.del.mockRejectedValue(new Error('LOST_RESPONSE'));
  await expect(f.runtime.archivarImportacionCsv(input,f.persist)).rejects.toThrow('LOST_RESPONSE');expect(f.saved.r2_estado).toBe('eliminacion_incierta');
  f.head.mockReset().mockResolvedValue('AUSENTE');await f.runtime.archivarImportacionCsv(input,f.persist);
  expect(f.del).toHaveBeenCalledTimes(1);expect(f.saved.r2_estado).toBe('eliminacion_incierta');expect(f.events).not.toContain('DELETE_AUSENCIA');expect(f.nas.publicarSinReemplazo).toHaveBeenCalledTimes(1);
 });
 it('HEAD404 sin intento no acredita eliminacion propia',async()=>{
  const f=fixture();f.head.mockReset().mockResolvedValue('AUSENTE');await f.runtime.archivarImportacionCsv(input,f.persist);
  expect(f.events).toEqual(['NAS_VERIFICADO','R2_AUSENCIA_OBSERVADA']);expect(f.del).not.toHaveBeenCalled();
 });
 it('con respuesta exitosa durable puede conciliar ausencia sin nuevo DELETE',async()=>{
  const f=fixture();f.saved.nas_estado='verificado';f.saved.r2_estado='eliminacion_incierta';f.saved.r2_delete_intento_id='a1000000-0000-4000-8000-000000000099';f.saved.r2_delete_respuesta_http=204;
  f.head.mockReset().mockResolvedValue('AUSENTE');await f.runtime.archivarImportacionCsv(input,f.persist);
  expect(f.events).toEqual(['DELETE_AUSENCIA']);expect(f.del).not.toHaveBeenCalled();expect(f.nas.publicarSinReemplazo).not.toHaveBeenCalled();
 });
 it('R2 verificado sustituido no llega a DELETE',async()=>{
  const f=fixture();f.verify.mockResolvedValue({etag:'"other"',sha256:sha,bytes:body.length});await expect(f.runtime.archivarImportacionCsv(input,f.persist)).rejects.toThrow('ARCHIVADO_R2_OBJETO_SUSTITUIDO');expect(f.del).not.toHaveBeenCalled();
 });
});

describe('Real institutional R2 adapter condition and single-attempt client, no network',()=>{
 beforeEach(()=>jest.restoreAllMocks());
 async function run(replaced:boolean){
  const endpoint=async()=>({protocol:'https:',hostname:'account.r2.cloudflarestorage.com'});
  const send=jest.fn(async(command:unknown)=>command instanceof GetObjectCommand?{Body:Readable.from([body]),ContentLength:body.length,ETag:'"etag"',LastModified:new Date(1000)}:{ContentLength:body.length,ETag:replaced?'"changed"':'"etag"',LastModified:new Date(1000)});
  const client={config:{endpoint,region:async()=>'auto',credentials:async()=>({accessKeyId:'test',secretAccessKey:'test'})},send};
  const adapter=new ArchivadoR2Adapter(client as unknown as S3Client,'account','bucket',undefined,{exclusionRequerida:true});
  const deleteSend=jest.spyOn(S3Client.prototype,'send').mockImplementation(async()=>({$metadata:{httpStatusCode:204}}) as never);
  const row={r2_cuenta:'account',r2_bucket:'bucket',r2_key:input.storageKey,sha256:sha,tamano_bytes:String(body.length),nas_destino:'SYNOLOGY_DEV',ruta_relativa:input.storageKey,origen:'EXPEDIENTES_IMPORTACION' as const,importacion_id:'100',solicitud_id:input.solicitudId};
  await conExclusionFisica({unsafe:async()=>[{locked:true}]},'account','bucket',input.storageKey,async()=>{
   await adapter.verificarParaEliminar(row);
   if(replaced)await expect(adapter.eliminarExacto(row)).rejects.toThrow('ARCHIVADO_R2_OBJETO_SUSTITUIDO');else await adapter.eliminarExacto(row);
  });
  return {deleteSend,adapter,send};
 }
 it('envia DeleteObject con IfMatch exacto y maxAttempts1',async()=>{
  const f=await run(false);expect(f.deleteSend).toHaveBeenCalledTimes(1);const cmd=f.deleteSend.mock.calls[0][0] as DeleteObjectCommand;
  expect(cmd).toBeInstanceOf(DeleteObjectCommand);expect(cmd.input).toEqual({Bucket:'bucket',Key:input.storageKey,IfMatch:'"etag"'});
  const internal=f.adapter as unknown as {deleteClient:S3Client};expect(await internal.deleteClient.config.maxAttempts()).toBe(1);
 });
 it('ETag cambiado no envia ningun DELETE ni fallback',async()=>{
  const f=await run(true);expect(f.deleteSend).not.toHaveBeenCalled();expect(f.send.mock.calls.some(c=>c[0] instanceof HeadObjectCommand)).toBe(true);
 });
});
