jest.mock('@documental/database',()=>({sql:Object.assign(jest.fn(),{begin:jest.fn(),reserve:jest.fn()})}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import { sql } from '@documental/database';
import { ArchivadoMaterializacionService,transaccionReservaDurable } from './archivado-materializacion.service';
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
import { OrquestarConfirmacionDocumentalV2UseCase } from '../../documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase';
import { ArchivadoSmbAdapter } from './archivado-smb.adapter';
import { ArchivadoRuntimeService } from './archivado-runtime.service';
import { resolverNombreArchivado } from './archivado-nomenclatura';
describe('Contrato reservado postgres: unsafe/release reales, sin begin inventado',()=>{
 const result=(command:string)=>Object.assign([],{command});
 it('BEGIN→trabajo→COMMIT usa exclusivamente la misma conexión',async()=>{
  const events:string[]=[],c={unsafe:jest.fn(async(q:string)=>{events.push(q);return result(q)})};
  const retain=jest.fn();expect(await transaccionReservaDurable(c,async()=>{events.push('RESERVA');return 7},retain)).toBe(7);
  expect(events).toEqual(['BEGIN','RESERVA','COMMIT']);expect(retain).not.toHaveBeenCalled();expect((c as any).begin).toBeUndefined();
 });
 it.each(['BEGIN','WORK','COMMIT'])('error %s provoca ROLLBACK, no copia ni falso éxito',async phase=>{
  const events:string[]=[],c={unsafe:jest.fn(async(q:string)=>{events.push(q);if(q===phase)throw Error(phase);return result(q)})};
  const retain=jest.fn();await expect(transaccionReservaDurable(c,async()=>{if(phase==='WORK')throw Error('WORK');return 1},retain)).rejects.toThrow(phase);
  expect(events.at(-1)).toBe('ROLLBACK');expect(retain).not.toHaveBeenCalled();
 });
 it('COMMIT que responde ROLLBACK nunca permite COPY',async()=>{
  const c={unsafe:jest.fn(async(q:string)=>result(q==='COMMIT'?'ROLLBACK':q))},retain=jest.fn();
  await expect(transaccionReservaDurable(c,async()=>1,retain)).rejects.toThrow('ARCHIVADO_RESERVA_COMMIT_NO_ACREDITADO');expect(retain).not.toHaveBeenCalled();
 });
 it('rollback fallido retiene la conexión, nunca la devuelve al pool',async()=>{
  const c={unsafe:jest.fn(async(q:string)=>{if(q==='ROLLBACK')throw Error('network');return result(q)}),release:jest.fn()};
  (sql.reserve as jest.Mock).mockResolvedValue(c);
  const service=new ArchivadoMaterializacionService({get:()=>undefined} as any,{} as any);
  await expect(service.conSesion(()=>transaccionReservaDurable(c,async()=>{throw Error('work')},()=>{(service as any).retenidas.add(c)}))).rejects.toThrow('ARCHIVADO_RESERVA_ROLLBACK_INCIERTO');
  expect(c.release).not.toHaveBeenCalled();await expect(service.conSesion(async()=>1)).rejects.toThrow('CONEXION_RETENIDA');expect(sql.reserve).toHaveBeenCalledTimes(1);
 });
});
describe('Confirmación Guía/NI efectiva → reserva independiente → materialización → postcommit',()=>{
 it.each([['GUIA_REMISION',false],['NOTA_INGRESO',false],['GUIA_REMISION',true],['NOTA_INGRESO',true]] as const)('%s real, fallo=%s, reserve() sin begin()',async(tipo,fail)=>{
  const events:string[]=[],post=new ArchivadoPostcommit();post.conectar(async()=>{events.push('NAS')});
  let durableCommitted=false;
  const connection:any={unsafe:jest.fn(async(q:string)=>{
   if(['BEGIN','COMMIT','ROLLBACK'].includes(q)){events.push('DURABLE_'+q);if(q==='COMMIT')durableCommitted=true;return Object.assign([],{command:q});}
   if(q.startsWith('SELECT pg_'))return[{locked:true}];return [{id:10}];
  }),release:jest.fn()};(sql.reserve as jest.Mock).mockResolvedValue(connection);
  const config:any={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'dev'} as any)[k]};
  const storage:any={statObject:async()=>({exists:false}),copyObject:jest.fn(async()=>{expect(durableCommitted).toBe(true);events.push('COPY');if(fail)throw new Error('SIM_IO')}),verifyExistingObject:async()=>{}};
  const material=new ArchivadoMaterializacionService(config,storage),bridge=new ArchivadoDocumentalService(config,post,material);
  const f={id:900,documento_id:901,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6,workspace_id:10,
   hash_sha256:'a'.repeat(64),bytes:10,storage_bucket:'dev',storage_key:'documentos/2026/03/BBTEC/900__scan.pdf',
   metadata:{archivadoNuevo:true},documento_mime:'application/pdf',tipo_documental:tipo,numero:tipo==='GUIA_REMISION'?'0030634':'0000003257',serie:'TG01',ruc_emisor:'20508179031'};
  const tx:any={unsafe:jest.fn(async(q:string)=>{
   if(q.startsWith('SELECT f.*'))return[f];
   if(q.includes('SELECT id FROM documentos.archivados_documentales'))return[];
   if(q.startsWith('SELECT DISTINCT'))return[{principal_id:184,tipo_documental:'OC',numero:'002968',grupo_id:161,factura_documento_id:570,fecha_factura:'2026-03-12'}];
   return [{id:900}];
  })};
  (sql.begin as jest.Mock).mockImplementation(async(work:any)=>{try{const r=await work(tx);events.push('FUNCTIONAL_COMMIT');return r}catch(e){events.push('FUNCTIONAL_ROLLBACK');throw e}});
  const confirmed={documento:{id:901},documentoBaseId:569,tipoDocumental:tipo,tipoRelacion:tipo==='GUIA_REMISION'?'adjunto_guia':'adjunto_nota_ingreso',expediente:{id:6,empresaCodigo:'BBTEC',clienteDestinoId:1},vinculo:{es_principal:false},ocrResultado:{archivo_id:900}};
  const usecase=new OrquestarConfirmacionDocumentalV2UseCase({confirmarOcrResultadoConExpedienteConExecutor:async()=>confirmed} as any,
   {buscarPorId:async()=>({tipoDocumental:'OC'})} as any,{listarPorDocumentoOperativoPrincipal:async()=>[{id:161,estado:'activo'}]} as any,
   {execute:async()=>({contenedorOperativo:{id:37}})} as any,{execute:async()=>({documentoOperativoPrincipal:{id:184}})} as any,
   {} as any,{execute:async()=>({documentoGrupoFactura:{id:1000}})} as any,{} as any,bridge);
  const work=()=>usecase.execute(999,{expedienteId:6,documentoBaseId:569,grupoFacturaId:161,tipoRelacion:confirmed.tipoRelacion,metadata:{}} as any);
  if(fail){await expect(work()).rejects.toThrow('SIM_IO');expect(durableCommitted).toBe(true);expect(events.at(-1)).toBe('FUNCTIONAL_ROLLBACK');expect(events).not.toContain('NAS');expect(connection.release).toHaveBeenCalledTimes(1);return;}
  await work();
  expect(events.indexOf('DURABLE_COMMIT')).toBeLessThan(events.indexOf('COPY'));expect(events.indexOf('COPY')).toBeLessThan(events.indexOf('FUNCTIONAL_COMMIT'));expect(events.at(-1)).toBe('NAS');
  const key=storage.copyObject.mock.calls[0][0].destinationKey;
  expect(key).toBe('documentos/2026/03/BBTEC/OC_002968__'+(tipo==='GUIA_REMISION'?'GUIA_TG01-0030634_20508179031':'NOTA_INGRESO_0000003257')+'.pdf');expect(connection.release).toHaveBeenCalledTimes(1);
 });
});
describe('Ruta SMB segura coincide con los nombres aprobados y formatos OP',()=>{
 const adapter=new ArchivadoSmbAdapter({host:'192.168.0.198',share:'GESTION-DOCUMENTARIA',raiz:'_DEV_DOCUMENTAL_PLATFORM',usuario:'documental_platform_dev',authFile:'/not-read',destino:'SYNOLOGY_DEV'});
 it.each(['pdf','png','jpg'])('admite %s sin ejecutar smbclient',ext=>{expect((adapter as any).ruta({nas_destino:'SYNOLOGY_DEV',ruta_relativa:'documentos/2026/11/BBTEC/OP_185.'+ext})).toContain('OP_185.'+ext)});
 it('operación validada conserva coma, no filename ni número genérico',()=>{
  for(const tipo of ['TRANSFERENCIA','DETRACCION'])for(const principal of ['OC','OS','OP'] as const){
   const n=resolverNombreArchivado({empresa:'BBTEC',periodo:{anio:'2026',mes:'03'},tipo,principal:{tipo:principal,numero:'002968'},version:1,extension:'pdf',banco:'BBVA',numeroOperacion:'2,453-0'});
   expect(n.estado).toBe('RESUELTO');if(n.estado==='RESUELTO')expect((adapter as any).ruta({nas_destino:'SYNOLOGY_DEV',ruta_relativa:n.rutaRelativa})).toContain('BBVA_2,453-0.pdf');
  }
  for(const name of ['evil;quit.pdf','../evil.pdf','evil.png;del','file.exe'])expect(()=>(adapter as any).ruta({nas_destino:'SYNOLOGY_DEV',ruta_relativa:'documentos/2026/11/BBTEC/'+name})).toThrow('SMB_RUTA_INVALIDA');
 });
});


describe('Fronteras propuestas de aceptación: archivo578/carga410/reserva21, no activadas',()=>{
 const config:any={get:(k:string)=>({NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_DEV_DYNAMIC_CONTEXTS:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID:'578',R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID:'410',R2_NAS_DEV_ACCEPTANCE_MIN_RESERVA_ID:'21'} as any)[k]};
 it('TEMP anterior sin archivo no recibe otra reserva semántica',async()=>{
  const bridge=new ArchivadoDocumentalService(config),tx={unsafe:jest.fn()};
  await expect(bridge.prepararCompras(tx,{id:409},{} as any,'unchanged',{},'identity')).rejects.toThrow('ARCHIVADO_ORIGEN_DEV_ANTERIOR');expect(tx.unsafe).not.toHaveBeenCalled();
 });
 it('archivo nuevo nacido de TEMP anterior no materializa ni archiva',async()=>{
  const material={ejecutar:jest.fn()},bridge=new ArchivadoDocumentalService(config,undefined,material as any);
  const tx={unsafe:jest.fn(async()=>[{id:578,carga_operacion_id:409,metadata:{archivadoNuevo:true}}])};
  await bridge.registrarDocumentoConfirmado(tx,999,5,'CONFIRMACION_DOCUMENTAL');expect(tx.unsafe).toHaveBeenCalledTimes(1);expect(material.ejecutar).not.toHaveBeenCalled();
 });
 it('reserva vieja no se reclama aun con archivo nuevo; SQL nuevo también filtra carga',async()=>{
  const runtime:any=new ArchivadoRuntimeService(config,{} as any,{} as any),process=jest.spyOn(runtime,'procesarContexto').mockResolvedValue({resultados:[]});
  (sql as any).unsafe=jest.fn().mockResolvedValue([{id:20,archivo_id:578,documento_id:999,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6}]);
  (sql as unknown as jest.Mock).mockReset();
  await runtime.alGuardar([999],[578]);expect(process).not.toHaveBeenCalled();expect(sql).not.toHaveBeenCalled();
  (sql as any).unsafe.mockResolvedValue([{id:21,archivo_id:578,documento_id:999,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6}]);
  (sql as unknown as jest.Mock).mockResolvedValue([]);await runtime.alGuardar([999],[578]);expect(process).not.toHaveBeenCalled();
  const call=(sql as unknown as jest.Mock).mock.calls[0];expect(call).toContain(410);expect(call[0].join('')).toContain('f.carga_operacion_id>=');
 });
});
