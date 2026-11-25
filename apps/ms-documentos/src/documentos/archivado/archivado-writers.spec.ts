const mockReserve = jest.fn();
const mockUnsafe = jest.fn();
jest.mock('@documental/database', () => ({
  sql: { reserve: mockReserve, unsafe: mockUnsafe },
}));

import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { GetObjectCommand,PutObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { DocumentosUploadService } from '../documentos-upload.service';
import { poseeExclusionFisica } from './archivado-exclusion';
describe('Todos los escritores R2 institucionales usan exclusión con feature habilitada',()=>{
 const body=Buffer.from('synthetic-writer-test'),hash=createHash('sha256').update(body).digest('hex');
 let config:any,connection:any,send:jest.Mock,storage:R2CargaSeguraStorage;
 beforeEach(()=>{
  config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'dev'} as any)[k]};
  connection={unsafe:jest.fn(async()=>[{locked:true}]),release:jest.fn()};
  mockReserve.mockReset().mockResolvedValue(connection);
  mockUnsafe.mockReset().mockResolvedValue([]);
  send=jest.fn(async()=>({}));storage=new R2CargaSeguraStorage(config);(storage as any).client={send};
 });
 it('PUT condicional sostiene lock durante S3 y lo libera',async()=>{
  send.mockImplementation(async(c:any)=>{expect(c).toBeInstanceOf(PutObjectCommand);expect(c.input.IfNoneMatch).toBe('*');expect(poseeExclusionFisica('dev','bucket','key')).toBe(true);return{}});
  await storage.putObject({provider:'r2',bucket:'bucket',key:'key',body,contentType:'application/pdf',hashSha256:hash});
  expect(connection.release).toHaveBeenCalledTimes(1);expect(poseeExclusionFisica('dev','bucket','key')).toBe(false);
 });
 it('COPY seguro excluye origen y destino durante GET/PUT/verificación',async()=>{
  send.mockImplementation(async(c:any)=>{expect(poseeExclusionFisica('dev','bucket','source')).toBe(true);expect(poseeExclusionFisica('dev','bucket','target')).toBe(true);
   if(c instanceof GetObjectCommand)return{Body:Readable.from([body]),ContentLength:body.length,Metadata:{sha256:hash,'operation-id':'reservation'}};
   expect(c).toBeInstanceOf(PutObjectCommand);expect(c.input.IfNoneMatch).toBe('*');return{};
  });
  await storage.copyObject({provider:'r2',bucket:'bucket',sourceKey:'source',destinationKey:'target',contentType:'application/pdf',hashSha256:hash,tamanoBytes:body.length,operationIdentity:'reservation'});
  expect(connection.unsafe).toHaveBeenCalledTimes(4);
 });
 it('DELETE interno sostiene el mismo lock de identidad física',async()=>{
  send.mockImplementation(async(c:any)=>{expect(c).toBeInstanceOf(DeleteObjectCommand);expect(poseeExclusionFisica('dev','bucket','key')).toBe(true);return{}});
  await storage.deleteObject({provider:'r2',bucket:'bucket',key:'key'});
 });
 it('key ocupada impide PUT externo',async()=>{
  connection.unsafe.mockResolvedValue([{locked:false}]);await expect(storage.putObject({provider:'r2',bucket:'bucket',key:'key',body,contentType:'application/pdf',hashSha256:hash})).rejects.toThrow('ARCHIVADO_OBJETO_OCUPADO');expect(send).not.toHaveBeenCalled();
 });
 it('upload guiado/versionado directo participa en lock y PUT condicional',async()=>{
  const service=Object.create(DocumentosUploadService.prototype) as any;service.config=config;service.resolveS3Client=()=>({send});
  send.mockImplementation(async(c:any)=>{expect(poseeExclusionFisica('dev','bucket','direct')).toBe(true);expect(c.input.IfNoneMatch).toBe('*');return{}});
  await service.subirAR2({bucket:'bucket',storageKey:'direct',body,contentType:'application/pdf'});
 });
});
