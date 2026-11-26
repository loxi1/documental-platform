jest.mock('@documental/database',()=>({sql:Object.assign(jest.fn(),{reserve:jest.fn()})}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import {sql} from '@documental/database';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {GetObjectCommand} from '@aws-sdk/client-s3';
import {ArchivadoRuntimeService} from './archivado-runtime.service';
import {ArchivadoSmbAdapter} from './archivado-smb.adapter';

const content=Buffer.from('codigo_expediente,descripcion\n000001,PRUEBA\n');
const sha256=createHash('sha256').update(content).digest('hex');
const key='documentos/2026/11/BBTI/CENTROS_COSTO/CENTROS_COSTO_20261126_162242381.csv';
const input={origen:'EXPEDIENTES_IMPORTACION' as const,importacionId:'100',
  solicitudId:'a1000000-0000-4000-8000-000000000001',empresaCodigo:'BBTI',
  cuenta:'test-account',bucket:'test-bucket',storageKey:key,sha256,tamanoBytes:content.length};
function fixture(production=false){
  const values:Record<string,string>={NODE_ENV:production?'production':'development',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
    R2_ACCOUNT_ID:'test-account',R2_BUCKET:'test-bucket',R2_NAS_DESTINATION:production?'SYNOLOGY_PROD':'SYNOLOGY_DEV',
    R2_NAS_SMB_HOST:production?'10.77.26.2':'192.168.0.198',R2_NAS_SMB_SHARE:'GESTION-DOCUMENTARIA',
    R2_NAS_SMB_ROOT:production?'PLATAFORMA_DOCUMENTAL':'_DEV_DOCUMENTAL_PLATFORM',R2_NAS_SMB_USER:'documental_platform_dev',
    R2_NAS_PRODUCTION_DELETE_ENABLED:'true',R2_NAS_DEV_DELETE_ENABLED:'true'};
  const send=jest.fn(async(_command:unknown)=>({Body:Readable.from([content]),ContentLength:content.length}));
  const client:any={send};if(production)client.config={endpoint:async()=>({protocol:'https:',hostname:'test-account.r2.cloudflarestorage.com'})};
  const nas={publicarSinReemplazo:jest.fn(async(_row:any,source:AsyncIterable<Uint8Array>,renew:()=>Promise<void>,stage:(p:string)=>Promise<void>)=>{
    const h=createHash('sha256');let bytes=0;for await(const chunk of source){bytes+=chunk.length;h.update(chunk);}
    await renew();await stage('deterministic-existing-staging');return{sha256:h.digest('hex'),bytes};
  }),verificar:jest.fn(async()=>({sha256,bytes:content.length}))};
  const connection=Object.assign(jest.fn(async()=>[{id:'100'}]),{unsafe:jest.fn(async()=>[{locked:true}]),release:jest.fn()});
  (sql as any).mockResolvedValue([{id:'100'}]);(sql.reserve as jest.Mock).mockResolvedValue(connection);
  const service=new ArchivadoRuntimeService({get:(k:string)=>values[k]} as any,{getArchivadoClient:()=>client} as any,{} as any);
  jest.spyOn(service as any,'nas').mockReturnValue(nas);
  return {service,values,send,nas,connection,client};
}
describe('Institutional CSV origin uses the shared transfer, never documental DELETE',()=>{
  beforeEach(()=>jest.clearAllMocks());
  it.each([false,true])('transfiere y relee en configuracion production=%s',async production=>{
    const f=fixture(production);const result=await f.service.archivarImportacionCsv(input);
    expect(result).toEqual({...input,nasDestino:production?'SYNOLOGY_PROD':'SYNOLOGY_DEV'});
    expect(f.nas.publicarSinReemplazo).toHaveBeenCalledTimes(1);expect(f.nas.verificar).toHaveBeenCalledTimes(1);
    const physical=f.nas.publicarSinReemplazo.mock.calls[0][0];
    expect(physical).toMatchObject({origen:'EXPEDIENTES_IMPORTACION',importacion_id:'100',r2_key:key,ruta_relativa:key,solicitud_id:input.solicitudId});
    for(const field of ['archivo_id','documento_id','version','reserva_id'])expect(physical).not.toHaveProperty(field);
    expect(f.send).toHaveBeenCalledTimes(1);expect(f.send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect((f.send.mock.calls[0][0] as unknown as GetObjectCommand).input).toEqual({Bucket:input.bucket,Key:key});
    expect(f.connection.unsafe).toHaveBeenCalledTimes(2);expect(f.connection.release).toHaveBeenCalledTimes(1);
    const q=(f.connection.mock.calls[0] as unknown as [TemplateStringsArray])[0].join('?');
    expect(q).toContain('documentos.expedientes_importaciones');expect(q).toContain("estado_importacion='confirmada'");
    expect(q).not.toContain('UPDATE');expect(q).not.toContain('DELETE');
  });
  it('no transfiere una identidad no confirmada en PostgreSQL',async()=>{
    const f=fixture();f.connection.mockResolvedValue([]);
    await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_IMPORTACION_NO_CONFIRMADA');
    expect(f.send).not.toHaveBeenCalled();expect(f.connection.release).toHaveBeenCalled();
  });
  it('propaga fallo NAS, libera exclusion y nunca envia DELETE',async()=>{
    const f=fixture();f.nas.publicarSinReemplazo.mockRejectedValue(new Error('ARCHIVADO_SMB_IO_FAILED'));
    await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_SMB_IO_FAILED');
    expect(f.nas.verificar).not.toHaveBeenCalled();expect(f.send.mock.calls.every(c=>c[0] instanceof GetObjectCommand)).toBe(true);
    expect(f.connection.release).toHaveBeenCalled();
  });
  it('rechaza integridad de transferencia y relectura independiente incorrectas',async()=>{
    const f=fixture();f.nas.publicarSinReemplazo.mockResolvedValue({sha256:'0'.repeat(64),bytes:content.length});
    await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_INTEGRIDAD_NO_COINCIDE');
    expect(f.nas.verificar).not.toHaveBeenCalled();
    const second=fixture();second.nas.verificar.mockResolvedValue({sha256,bytes:content.length+1});
    await expect(second.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_INTEGRIDAD_NO_COINCIDE');
  });
  it('rechaza identidad externa y respeta el flag institucional',async()=>{
    const f=fixture();await expect(f.service.archivarImportacionCsv({...input,cuenta:'other'})).rejects.toThrow('ARCHIVADO_IMPORTACION_IDENTIDAD_INVALIDA');
    f.values.R2_NAS_ARCHIVE_ENABLED='false';await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow();expect(f.send).not.toHaveBeenCalled();
  });
  it('rechaza endpoint PROD de otra cuenta antes de leer',async()=>{
    const f=fixture(true);f.client.config.endpoint=async()=>({protocol:'https:',hostname:'other.r2.cloudflarestorage.com'});
    await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_R2_ENDPOINT_NO_ACREDITADO');expect(f.send).not.toHaveBeenCalled();
  });
  it('con automatismo deshabilitado no inicia transferencia ni consulta de importacion',async()=>{
    const f=fixture();f.values.R2_NAS_AUTO_ENABLED='false';
    await expect(f.service.archivarImportacionCsv(input)).rejects.toThrow('ARCHIVADO_AUTOMATICO_NO_HABILITADO');
    expect(f.send).not.toHaveBeenCalled();expect(sql).not.toHaveBeenCalled();
  });
});

describe('SMB CSV path is restricted to the explicit import origin',()=>{
  const nas=new ArchivadoSmbAdapter({host:'192.168.0.198',share:'GESTION-DOCUMENTARIA',raiz:'_DEV_DOCUMENTAL_PLATFORM',usuario:'documental_platform_dev',authFile:'/never-read',destino:'SYNOLOGY_DEV'});
  const row={origen:'EXPEDIENTES_IMPORTACION',importacion_id:'100',solicitud_id:input.solicitudId,empresa_codigo:'BBTI',nas_destino:'SYNOLOGY_DEV',ruta_relativa:key};
  it('preserva exactamente la ruta almacenada y la raiz configurada',()=>{
    expect((nas as any).ruta(row)).toBe('_DEV_DOCUMENTAL_PLATFORM/'+key);
  });
  it.each([key.replace('CENTROS_COSTO/','OTROS/'),key.replace('20261126','20261026'),key.replace('20261126','20261131'),key.replace('162242381','INVALID'),key.replace('.csv','.pdf'),key.replace('/BBTI/','/BBTEC/'),key.replace('/CENTROS_COSTO/','/../'),key+';quit'])('rechaza CSV fuera de contrato %s',ruta=>{
    expect(()=>(nas as any).ruta({...row,ruta_relativa:ruta})).toThrow('ARCHIVADO_SMB_RUTA_INVALIDA');
  });
  it('CSV sin identidad de importacion no amplía las rutas documentales',()=>{
    expect(()=>(nas as any).ruta({...row,origen:undefined})).toThrow('ARCHIVADO_SMB_RUTA_INVALIDA');
    expect(()=>(nas as any).ruta({...row,importacion_id:undefined})).toThrow('ARCHIVADO_SMB_RUTA_INVALIDA');
    expect(()=>(nas as any).ruta({...row,solicitud_id:'fake'})).toThrow('ARCHIVADO_SMB_RUTA_INVALIDA');
  });
  it.each(['pdf','png','jpg'])('preserva el contrato documental %s',ext=>{
    expect((nas as any).ruta({nas_destino:'SYNOLOGY_DEV',ruta_relativa:'documentos/2026/11/BBTI/OC_1.'+ext})).toContain('OC_1.'+ext);
  });
});
