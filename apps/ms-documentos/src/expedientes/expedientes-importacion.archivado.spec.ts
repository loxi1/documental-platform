jest.mock('@documental/database',()=>({sql:{}}));
import {ExpedientesImportacionRepository,type ImportacionReserva} from './expedientes-importacion.repository';
const input:ImportacionReserva={solicitudId:'a1000000-0000-4000-8000-000000000001',contexto:{workspaceId:1,empresaCodigo:'BBTI',clienteDestinoId:2,usuarioId:10,usuarioEmail:null,perfil:'compras',requestId:null,sessionContextId:null},nombreOriginal:'cc.csv',periodoFecha:'2026-11-26',storageKey:'not-regenerated-on-retry',r2Cuenta:'account',r2Bucket:'bucket',tamanoBytes:100,sha256:'a'.repeat(64),csv:{rows:[{codigo_expediente:'000001',descripcion:'ONE'}],totalRegistros:1,registrosDuplicadosCsv:0}};
const proof={origen:'EXPEDIENTES_IMPORTACION',importacionId:'100',solicitudId:input.solicitudId,empresaCodigo:'BBTI',cuenta:'account',bucket:'bucket',storageKey:'documentos/2026/11/BBTI/CENTROS_COSTO/CENTROS_COSTO_20261126_162242381.csv',sha256:input.sha256,tamanoBytes:100,nasDestino:'SYNOLOGY_DEV',nasSha256:input.sha256,nasTamanoBytes:100,intentoId:'a1000000-0000-4000-8000-000000000002',etag:'"etag"',http:204,requestId:null};
describe('CSV physical audit CAS stays in the reserved connection',()=>{
 const repo=new ExpedientesImportacionRepository();
 it.each(['NAS_VERIFICADO','DELETE_INTENT','DELETE_RESPUESTA','DELETE_AUSENCIA','DELETE_INCIERTO','R2_AUSENCIA_OBSERVADA'])('audita %s con identidad completa y parametros vinculados',async event=>{
  const query=jest.fn().mockResolvedValue([{id:'100'}]);await repo.registrarEventoArchivado(input,event,proof,{query});
  const [q,v]=query.mock.calls[0];expect(q).toContain('estado_importacion=\'confirmada\'');expect(q).toContain('evidencia=evidencia||');
  expect(q).toContain('workspace_id=$2');expect(q).toContain('usuario_id=$5');expect(q).toContain('storage_key=$9');
  expect(v.slice(0,6)).toEqual([input.solicitudId,1,'BBTI',2,10,'100']);
  expect(v[8]).toBe(proof.storageKey);expect(JSON.parse(v[11])).toMatchObject({evento:event,usuarioId:10,workspaceId:1,clienteId:2,datos:{storageKey:proof.storageKey}});
  expect(q).not.toContain('documentos_archivos');expect(q).not.toContain('INSERT INTO documentos.expedientes');
 });
 it('una fila no coincidente no puede declarar la fase completada',async()=>{
  const query=jest.fn().mockResolvedValue([]);await expect(repo.registrarEventoArchivado(input,'DELETE_AUSENCIA',proof,{query})).rejects.toThrow('IMPORTACION_NAS_CAS_CONFLICT');
 });
 it.each([{origen:'DOCUMENTO'},{sha256:'b'.repeat(64)},{cuenta:'other'},{tamanoBytes:101}])('rechaza identidad incorrecta antes de SQL %p',async delta=>{
  const query=jest.fn();await expect(repo.registrarEventoArchivado(input,'NAS_VERIFICADO',{...proof,...delta},{query})).rejects.toThrow();expect(query).not.toHaveBeenCalled();
 });
 it('no acredita NAS por metadata esperada sin el hash/tamano observado',async()=>{
  const query=jest.fn();await expect(repo.registrarEventoArchivado(input,'NAS_VERIFICADO',{...proof,nasSha256:null},{query})).rejects.toThrow('IMPORTACION_NAS_INTEGRIDAD_INVALIDA');expect(query).not.toHaveBeenCalled();
 });
 it('ausencia exige respuesta exitosa e intento propio mediante CAS',async()=>{
  const query=jest.fn().mockResolvedValue([{id:'100'}]);await repo.registrarEventoArchivado(input,'DELETE_AUSENCIA',proof,{query});
  expect(query.mock.calls[0][0]).toContain('r2_delete_intento_id=$13::uuid');expect(query.mock.calls[0][0]).toContain('r2_delete_respuesta_http>=200');
 });
});
