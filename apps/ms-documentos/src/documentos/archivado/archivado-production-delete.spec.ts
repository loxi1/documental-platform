jest.mock('@documental/database',()=>({sql:jest.fn()}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import { sql } from '@documental/database';
import { politicaDeleteProduccion, identidadDeletePermitida, instanteDelete, type PoliticaDeleteProduccion } from './archivado-delete-policy';
import { ArchivadoRuntimeService } from './archivado-runtime.service';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { conExclusionFisica } from './archivado-exclusion';
import { DocumentosUploadService } from '../documentos-upload.service';

const now=Date.parse('2026-11-25T12:00:00Z');
const identity={reservaId:30,archivoId:700,documentoId:690,version:1,empresa:'BBTEC',clienteId:1,expedienteId:6};
function fixture(){
  const policy:PoliticaDeleteProduccion={version:1,decisionId:'PO_TEST_ONLY',
    proteccion:{tipo:'BACKUP_RECUPERABLE',referencia:'EVIDENCIA_TEST_ONLY'},modo:'EXACTO',
    desde:'2026-11-25T11:00:00Z',hasta:'2026-11-26T12:00:00Z',
    contextos:[{empresa:'BBTEC',clienteId:1}],archivos:[{...identity}]};
  const values:Record<string,string>={NODE_ENV:'production',R2_NAS_DESTINATION:'SYNOLOGY_PROD',
    R2_NAS_SMB_HOST:'10.77.26.2',R2_NAS_SMB_SHARE:'GESTION-DOCUMENTARIA',R2_NAS_SMB_ROOT:'PLATAFORMA_DOCUMENTAL',
    R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',R2_NAS_NEW_DOCUMENTS_ENABLED:'true',
    R2_NAS_VIEWER_ENABLED:'true',R2_NAS_VIEWER_ACCEPTED:'true',R2_NAS_DEV_DELETE_ENABLED:'false',
    R2_NAS_PRODUCTION_DELETE_ENABLED:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T22:48:35.970Z'};
  const config={get:<T=string>(k:string)=>(k==='R2_NAS_PRODUCTION_DELETE_POLICY'?JSON.stringify(policy):values[k]) as T};
  return {policy,values,config};
}
describe('Production DELETE decision fails closed',()=>{
  it('permits only the exact approved identity in the paired tenant',()=>{
    const f=fixture(),p=politicaDeleteProduccion(f.config,now)!;expect(p).not.toBeNull();
    expect(identidadDeletePermitida(p,identity,null)).toBe(true);
    for(const delta of [{archivoId:701},{documentoId:691},{reservaId:31},{version:2},{empresa:'BBTI'},{clienteId:2},{expedienteId:7}])
      expect(identidadDeletePermitida(p,{...identity,...delta},null)).toBe(false);
  });
  it.each(['NODE_ENV','R2_NAS_DESTINATION','R2_NAS_SMB_HOST','R2_NAS_SMB_SHARE','R2_NAS_SMB_ROOT',
    'R2_NAS_ARCHIVE_ENABLED','R2_NAS_AUTO_ENABLED','R2_NAS_NEW_DOCUMENTS_ENABLED','R2_NAS_VIEWER_ENABLED',
    'R2_NAS_VIEWER_ACCEPTED','R2_NAS_PRODUCTION_DELETE_ENABLED','R2_NAS_ACTIVATION_FROM'])('missing %s cannot enable DELETE',key=>{
    const f=fixture();delete f.values[key];expect(politicaDeleteProduccion(f.config,now)).toBeNull();
  });
  it.each([['NODE_ENV','development'],['R2_NAS_DESTINATION','SYNOLOGY_DEV'],['R2_NAS_SMB_ROOT','_DEV_DOCUMENTAL_PLATFORM'],
    ['R2_NAS_DEV_DELETE_ENABLED','true'],['R2_NAS_PRODUCTION_DELETE_ENABLED','false'],['R2_NAS_ACTIVATION_FROM','2026-02-30T00:00:00Z']])('rejects %s=%s', (key,value)=>{
    const f=fixture();f.values[key]=value;expect(politicaDeleteProduccion(f.config,now)).toBeNull();
  });
  it('rejects absent protection, invalid or expired decision and duplicated identities',()=>{
    const f=fixture();(f.policy.proteccion as any).referencia='';expect(politicaDeleteProduccion(f.config,now)).toBeNull();
    f.policy.proteccion.referencia='VALID';f.policy.hasta='2026-11-25T11:59:59Z';expect(politicaDeleteProduccion(f.config,now)).toBeNull();
    f.policy.hasta='2026-11-26T12:00:00Z';f.policy.archivos!.push({...identity});expect(politicaDeleteProduccion(f.config,now)).toBeNull();
  });
  it('new-mode date excludes pending B while preserving the original archive cutoff',()=>{
    const f=fixture();f.policy.modo='NUEVOS';delete f.policy.archivos;
    const p=politicaDeleteProduccion(f.config,now)!;expect(p).not.toBeNull();
    expect(identidadDeletePermitida(p,identity,'2026-11-25T10:59:59Z')).toBe(false);
    expect(identidadDeletePermitida(p,identity,'2026-11-25T11:00:00Z')).toBe(true);
    expect(identidadDeletePermitida(p,{...identity,clienteId:2},'2026-11-25T11:00:00Z')).toBe(false);
    expect(f.values.R2_NAS_ACTIVATION_FROM).toBe('2026-11-24T22:48:35.970Z');
  });
  it('decision cannot predate the archive cutoff or accept calendar normalization',()=>{
    const f=fixture();f.policy.desde='2026-11-24T22:48:35Z';expect(politicaDeleteProduccion(f.config,now)).toBeNull();
    expect(Number.isNaN(instanteDelete('2026-02-30T12:00:00Z'))).toBe(true);
    expect(Number.isNaN(instanteDelete('2026-11-25T24:00:00Z'))).toBe(true);
  });
});

describe('Production exact runtime remains tenant/context bounded',()=>{
  const db=sql as unknown as jest.Mock;
  beforeEach(()=>{db.mockReset();jest.useFakeTimers().setSystemTime(now);});
  afterEach(()=>jest.useRealTimers());
  it('validates persisted identity and relationships before returning a durable decision',async()=>{
    const f=fixture(),s=new ArchivadoRuntimeService(f.config as any,{} as any,{} as any);
    const row={id:30,archivo_id:700,documento_id:690,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6,
      archivo_creado_en:'2026-11-25T10:00:00Z',contexto:{modo:'NUEVO'}};
    db.mockResolvedValueOnce([row]).mockResolvedValueOnce([{id:700}]);
    const decision=await (s as any).eliminacionProduccionAutorizada({empresa:'BBTEC',clienteId:1,expedienteId:6},
      {id:30,archivoId:700,documentoId:690,version:1,autorizado:true});
    expect(decision).toMatchObject({decisionId:'PO_TEST_ONLY',identidad:identity});
    const query=db.mock.calls[0][0].join('');
    for(const predicate of ["f.metadata->>'archivadoNuevo'='true'","f.creado_en>=","a.confirmado_en IS NOT NULL",
      "f.storage_key=a.r2_key","a.r2_key=a.ruta_relativa","a.nas_destino='SYNOLOGY_PROD'"])
      expect(query).toContain(predicate);
  });
  it('foreign context and unapproved pending file are rejected before SQL',async()=>{
    const f=fixture(),s=new ArchivadoRuntimeService(f.config as any,{} as any,{} as any);
    for(const scope of [{empresa:'BBTI',clienteId:1,expedienteId:6},{empresa:'BBTEC',clienteId:2,expedienteId:6}])
      expect(await (s as any).eliminacionProduccionAutorizada(scope,{id:30,archivoId:700,documentoId:690,version:1,autorizado:true})).toBeNull();
    expect(await (s as any).eliminacionProduccionAutorizada({empresa:'BBTEC',clienteId:1,expedienteId:6},
      {id:31,archivoId:701,documentoId:691,version:1,autorizado:true})).toBeNull();expect(db).not.toHaveBeenCalled();
  });
  it('production numbers do not inherit DEV 546/552/553 exclusions',async()=>{
    const f=fixture(),s=new ArchivadoRuntimeService(f.config as any,{} as any,{} as any);
    for(const archivo_id of [546,552,553]){
      db.mockResolvedValueOnce([{id:archivo_id}]);
      expect(await (s as any).permitido({archivo_id,documento_id:10,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1})).toBe(true);
    }
    // No real objects or rows are read or changed by this mocked identity test.
  });
  it('no production decision leaves exact recovery closed before any query',async()=>{
    const f=fixture();f.values.R2_NAS_PRODUCTION_DELETE_ENABLED='false';
    const s=new ArchivadoRuntimeService(f.config as any,{} as any,{} as any);
    await expect(s.recuperarPendientesExactosProduccion([{reservaId:30,archivoId:700,documentoId:690,empresa:'BBTEC',clienteId:1,expedienteId:6}])).rejects.toThrow();
    expect(db).not.toHaveBeenCalled();
  });
});

describe('Permanent reservation fences all generic R2 mutations',()=>{
  const unsafe=jest.fn();
  beforeEach(()=>{(sql as any).unsafe=unsafe;unsafe.mockReset();});
  const lock={unsafe:async()=>[{locked:true}]};
  it.each(['putObject','copyObject','deleteObject'] as const)('%s cannot mutate a confirmed reserved key',async method=>{
    const config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'test-account'} as any)[k]};
    const storage=new R2CargaSeguraStorage(config as any);
    unsafe.mockResolvedValue([{confirmado_en:new Date(),r2_estado:'PRESENTE'}]);
    const key='documentos/2026/11/BBTEC/OC_1.pdf';
    const input:any={provider:'r2',bucket:'test-bucket',key,sourceKey:'documentos/source.pdf',destinationKey:key};
    await expect(conExclusionFisica(lock,'test-account','test-bucket',key,()=>
      conExclusionFisica(lock,'test-account','test-bucket',input.sourceKey,()=>storage[method](input))))
      .rejects.toThrow('ARCHIVADO_RESERVA_CONFIRMADA_INMUTABLE');
    expect(unsafe).toHaveBeenCalledTimes(1);
  });
  it('uncertain identity cannot be recreated even before the document binding is complete',async()=>{
    const config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'test-account'} as any)[k]};
    const storage=new R2CargaSeguraStorage(config as any),key='documentos/2026/11/BBTEC/OC_1.pdf';
    unsafe.mockResolvedValue([{confirmado_en:null,r2_estado:'ELIMINACION_INCIERTA'}]);
    await expect(conExclusionFisica(lock,'test-account','test-bucket',key,()=>storage.putObject({provider:'r2',bucket:'test-bucket',key} as any))).rejects.toThrow('ARCHIVADO_RESERVA_CONFIRMADA_INMUTABLE');
  });
  it('the direct guided/version upload uses the same durable fence',async()=>{
    const send=jest.fn(),release=jest.fn();
    const connection={unsafe:jest.fn(async(q:string)=>q.includes('SELECT confirmado_en')
      ?[{confirmado_en:new Date(),r2_estado:'ELIMINADO_ACREDITADO'}]:[{locked:true}]),release};
    (sql as any).reserve=jest.fn().mockResolvedValue(connection);
    const service=Object.create(DocumentosUploadService.prototype) as any;
    service.config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'test-account'} as any)[k]};
    service.resolveS3Client=()=>({send});
    await expect(service.subirAR2({bucket:'test-bucket',storageKey:'documentos/2026/11/BBTEC/OC_1.pdf',
      body:Buffer.from('pdf'),contentType:'application/pdf'})).rejects.toThrow('ARCHIVADO_RESERVA_CONFIRMADA_INMUTABLE');
    expect(send).not.toHaveBeenCalled();expect(release).toHaveBeenCalledTimes(1);
  });
});
