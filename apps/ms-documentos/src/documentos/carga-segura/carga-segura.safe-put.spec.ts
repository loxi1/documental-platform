import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { R2CargaSeguraStorage } from './carga-segura.storage';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
describe('safe definitive transfer (no provider access)',()=>{
 const bytes=Buffer.from('synthetic PDF');
 const input={provider:'r2',bucket:'synthetic',sourceKey:'tmp/1',destinationKey:'documentos/1',operationIdentity:'tmp:1:retry',hashSha256:sha(bytes),tamanoBytes:bytes.length,contentType:'application/pdf'};
 let objects:Map<string,any>,adapter:R2CargaSeguraStorage,send:jest.Mock;
 beforeEach(()=>{
  objects=new Map([['tmp/1',{bytes,metadata:{sha256:sha(bytes)}}]]);
  send=jest.fn(async(cmd:any)=>{
   const i=cmd.input;
   if(cmd instanceof GetObjectCommand){const o=objects.get(i.Key);if(!o)throw {$metadata:{httpStatusCode:404}};return {Body:Readable.from([o.bytes]),ContentLength:o.bytes.length,Metadata:o.metadata}}
   if(cmd instanceof PutObjectCommand){
    expect(i.IfNoneMatch).toBe('*');expect(i.ContentLength).toBe(bytes.length);
    const chunks:Buffer[]=[];for await(const chunk of i.Body) chunks.push(Buffer.from(chunk));
    if(objects.has(i.Key))throw {$metadata:{httpStatusCode:412}};
    objects.set(i.Key,{bytes:Buffer.concat(chunks),metadata:i.Metadata});return {};
   }
   throw Error('Unexpected command: COPY/DELETE forbidden');
  });
  adapter=new R2CargaSeguraStorage({} as any);(adapter as any).client={send};
 });
 it('streams via disk, conditionally creates and verifies actual destination bytes',async()=>{
  await adapter.copyObject(input);expect(objects.get(input.destinationKey).bytes).toEqual(bytes);
  expect(send.mock.calls.some(([c])=>c instanceof PutObjectCommand)).toBe(true);
 });
 it('reuses same identity after a simulated persistence failure',async()=>{
  await adapter.copyObject(input);await adapter.copyObject(input);
  expect(objects.get(input.destinationKey).metadata['operation-id']).toBe(input.operationIdentity);
 });
 it.each(['foreign identity','forged hash','different bytes'])('412 does not accept %s',async(kind)=>{
  objects.set(input.destinationKey,{bytes:kind==='different bytes'?Buffer.alloc(bytes.length):bytes,metadata:{sha256:kind==='forged hash'?'0'.repeat(64):sha(bytes),'operation-id':kind==='foreign identity'?'other':input.operationIdentity}});
  await expect(adapter.copyObject(input)).rejects.toThrow();
 });
 it('recovers uncertain PUT success on retry without overwriting stored bytes',async()=>{
  const original=send.getMockImplementation()!;let uncertain=true;
  send.mockImplementation(async(c:any)=>{const result=await original(c);if(c instanceof PutObjectCommand&&uncertain){uncertain=false;throw Error('connection lost after commit')}return result});
  await expect(adapter.copyObject(input)).rejects.toThrow();
  const stored=objects.get(input.destinationKey);await adapter.copyObject(input);
  expect(objects.get(input.destinationKey)).toBe(stored);
 });
 it('concurrent retries of the same operation recognize one physical object',async()=>{
  await Promise.all([adapter.copyObject(input),adapter.copyObject(input)]);
  expect(objects.size).toBe(2);expect(objects.get(input.destinationKey).bytes).toEqual(bytes);
 });
 it('rejects corrupt TEMP bytes before PUT',async()=>{
  objects.set('tmp/1',{bytes:Buffer.alloc(bytes.length),metadata:{}});
  await expect(adapter.copyObject(input)).rejects.toThrow();
  expect(send.mock.calls.some(([c])=>c instanceof PutObjectCommand)).toBe(false);
 });
 it('different concurrent operations cannot adopt or overwrite the winner',async()=>{
  const r=await Promise.allSettled([adapter.copyObject(input),adapter.copyObject({...input,operationIdentity:'tmp:2:other'})]);
  expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);
  expect(objects.get(input.destinationKey).bytes).toEqual(bytes);
 });
 it('interrupted source stream performs no destination PUT',async()=>{
  send.mockImplementationOnce(async()=>({ContentLength:bytes.length,Body:Readable.from((async function*(){yield bytes.subarray(0,2);throw Error('interrupted')})())}));
  await expect(adapter.copyObject(input)).rejects.toThrow();expect(objects.has(input.destinationKey)).toBe(false);
 });
 it('rejects files exceeding the explicit single PUT bound without reading them',async()=>{
  await expect(adapter.copyObject({...input,tamanoBytes:5_000_000_001})).rejects.toThrow('SINGLE_PUT_LIMIT');expect(send).not.toHaveBeenCalled();
 });
});
