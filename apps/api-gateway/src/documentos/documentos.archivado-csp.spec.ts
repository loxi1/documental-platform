jest.mock('axios',()=>({__esModule:true,default:{get:jest.fn()}}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'},REQUEST_ID_HEADER:'x-request-id'}));
import axios from 'axios';
import helmet from 'helmet';
import { DocumentosGatewayController } from './documentos.controller';

describe('CSP del visor NAS con Helmet real, excepción exclusiva del endpoint exitoso',()=>{
 const previous=process.env.NODE_ENV;
 afterEach(()=>{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;jest.clearAllMocks()});
 function fixture(){
  const headers=new Map<string,any>();
  const response:any={setHeader:(k:string,v:any)=>headers.set(k.toLowerCase(),v),getHeader:(k:string)=>headers.get(k.toLowerCase()),
   removeHeader:jest.fn((k:string)=>headers.delete(k.toLowerCase())),set:jest.fn((h:any)=>{for(const [k,v] of Object.entries(h))headers.set(k.toLowerCase(),v);return response}),send:jest.fn()};
  let applied=false;helmet()({headers:{},secure:true} as any,response,()=>{applied=true});expect(applied).toBe(true);response.removeHeader.mockClear();
  const before=new Map(headers),controller:any=Object.create(DocumentosGatewayController.prototype);
  controller.getBaseUrl=()=> 'http://ms-documentos.invalid';
  (axios.get as jest.Mock).mockResolvedValue({data:Buffer.from('%PDF-1.7 synthetic'),headers:{'content-type':'application/pdf'}});
  return {headers,response,before,controller};
 }
 function rest(policy:string){return policy.split(';').map(s=>s.trim()).filter(s=>!s.toLowerCase().startsWith('frame-ancestors '))}
 it('producción permite solo Web autorizado y conserva todas las otras directivas/cabeceras',async()=>{
  process.env.NODE_ENV='production';const h=fixture();
  expect(h.before.get('x-frame-options')).toBe('SAMEORIGIN');
  await h.controller.previewArchivado('498','synthetic-purpose-bound-ticket',h.response);
  const csp=h.headers.get('content-security-policy');
  expect(csp.split(';').filter((s:string)=>s.trim().startsWith('frame-ancestors'))).toEqual(['frame-ancestors https://bbtecnologia.com']);
  const allowed=csp.split(';').find((s:string)=>s.trim().startsWith('frame-ancestors')).trim().split(/\s+/).slice(1);
  expect(allowed).toEqual(['https://bbtecnologia.com']);
  for(const rejected of ['https://evil.example','https://bbtecnologia.com.evil.example','http://bbtecnologia.com','https://api.bbtecnologia.com',"'self'",'*'])expect(allowed).not.toContain(rejected);
  expect(rest(csp)).toEqual(rest(h.before.get('content-security-policy')));expect(h.headers.has('x-frame-options')).toBe(false);
  for(const [name,value] of h.before)if(!['content-security-policy','x-frame-options','referrer-policy'].includes(name))expect(h.headers.get(name)).toEqual(value);
  expect(axios.get).toHaveBeenCalledWith('http://ms-documentos.invalid/documentos/archivado/preview/498',expect.objectContaining({params:{ticket:'synthetic-purpose-bound-ticket'},maxRedirects:0}));
 });
 it('DEV conserva self y localhost3005 previamente aceptados',async()=>{
  process.env.NODE_ENV='development';const h=fixture();await h.controller.previewArchivado('498','synthetic',h.response);
  expect(h.headers.get('content-security-policy')).toContain("frame-ancestors 'self' http://localhost:3005");expect(h.headers.has('x-frame-options')).toBe(false);
 });
 it('otras rutas mantienen Helmet self y SAMEORIGIN aun después de servir un preview',async()=>{
  process.env.NODE_ENV='production';const preview=fixture(),other=fixture();await preview.controller.previewArchivado('498','synthetic',preview.response);
  expect(other.headers.get('content-security-policy')).toEqual(other.before.get('content-security-policy'));
  expect(other.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");expect(other.headers.get('x-frame-options')).toBe('SAMEORIGIN');expect(other.response.removeHeader).not.toHaveBeenCalled();
 });
 it('ticket inválido/rechazado y MIME ajeno conservan política restrictiva',async()=>{
  process.env.NODE_ENV='production';const h=fixture();
  await expect(h.controller.previewArchivado('498',undefined,h.response)).rejects.toThrow('ARCHIVADO_PREVIEW_INVALID');expect(axios.get).not.toHaveBeenCalled();
  (axios.get as jest.Mock).mockRejectedValue(new Error('UPSTREAM_TICKET_REJECTED'));
  await expect(h.controller.previewArchivado('498','synthetic',h.response)).rejects.toThrow('ARCHIVADO_PREVIEW_NO_DISPONIBLE');
  (axios.get as jest.Mock).mockResolvedValue({data:'not permitted',headers:{'content-type':'text/html'}});
  await expect(h.controller.previewArchivado('498','synthetic',h.response)).rejects.toThrow('ARCHIVADO_PREVIEW_NO_DISPONIBLE');
  expect(h.headers.get('content-security-policy')).toBe(h.before.get('content-security-policy'));expect(h.headers.get('x-frame-options')).toBe('SAMEORIGIN');
 });
 it('sin CSP verificable falla cerrado y no quita X-Frame-Options',async()=>{
  process.env.NODE_ENV='production';const h=fixture();h.headers.delete('content-security-policy');await h.controller.previewArchivado('498','synthetic',h.response);expect(h.headers.get('x-frame-options')).toBe('SAMEORIGIN');
 });
 it('ninguna allowlist de URL API puede ampliar la incrustación',async()=>{
  const old=process.env.R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS;
  try{process.env.NODE_ENV='production';process.env.R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS='https://evil.example';const h=fixture();await h.controller.previewArchivado('498','synthetic',h.response);expect(h.headers.get('content-security-policy')).toContain('frame-ancestors https://bbtecnologia.com');expect(h.headers.get('content-security-policy')).not.toContain('evil.example');}
  finally{if(old===undefined)delete process.env.R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS;else process.env.R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS=old}
 });
});
