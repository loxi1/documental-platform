import { configuracionNas, origenPublicoArchivado } from './archivado-configuracion';
const config=(values:Record<string,string>)=>({get:<T=string>(key:string)=>values[key] as T|undefined});
describe('Archivado configuracion separada',()=>{
 it('preserva valores DEV',()=>expect(configuracionNas(config({}))).toMatchObject({raiz:'_DEV_DOCUMENTAL_PLATFORM',destino:'SYNOLOGY_DEV'}));
 it('produccion exige configuracion explicita',()=>expect(()=>configuracionNas(config({NODE_ENV:'production'}))).toThrow('CONFIG_PRODUCCION_REQUERIDA'));
 it('produccion no adopta raiz DEV',()=>expect(()=>configuracionNas(config({NODE_ENV:'production',R2_NAS_SMB_HOST:'nas.internal',R2_NAS_SMB_SHARE:'DOCS',R2_NAS_SMB_ROOT:'_DEV_DOCUMENTAL_PLATFORM',R2_NAS_SMB_USER:'app',R2_NAS_DESTINATION:'PROD'}))).toThrow('ENTORNOS_MEZCLADOS'));
 it('admite raiz productiva del share explicitamente vacia',()=>expect(configuracionNas(config({NODE_ENV:'production',R2_NAS_SMB_HOST:'nas.internal',R2_NAS_SMB_SHARE:'DOCS',R2_NAS_SMB_ROOT:'',R2_NAS_SMB_USER:'app',R2_NAS_DESTINATION:'PROD'})).raiz).toBe(''));
 it('HTTPS productivo requiere origen exacto permitido',()=>{
  const c=config({NODE_ENV:'production',R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS:'https://api.example.test'});
  expect(origenPublicoArchivado(c,'https://api.example.test')).toBe('https://api.example.test');
  for(const url of ['https://evil.test','http://api.example.test','https://api.example.test/other','https://user:pass@api.example.test','https://api.example.test/?redirect=x'])expect(()=>origenPublicoArchivado(c,url)).toThrow();
 });
 it('DEV rechaza destinos externos',()=>{expect(origenPublicoArchivado(config({}),'http://localhost:3000')).toBe('http://localhost:3000');expect(()=>origenPublicoArchivado(config({}),'https://evil.test')).toThrow()});
});
