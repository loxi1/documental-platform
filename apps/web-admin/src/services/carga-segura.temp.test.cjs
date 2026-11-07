const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {webcrypto}=require('node:crypto');const {File}=require('node:buffer');
function harness({timeout=false,ocrFail=false}={}) {
 const values=new Map(),calls=[],row={tempId:50,nombreOriginal:'a.pdf',ocrCandidate:null,borradorDocumental:null};let first=true;
 const api={get:async url=>{calls.push(['get',url]);return {data:url.endsWith('preview-url')?{signedUrl:'http://minio.test/signed'}:structuredClone(row)};},post:async(url,body,config)=>{
  calls.push(['post',url,body,config]);if(url==='/documentos/tmp'){if(timeout&&first){first=false;throw Error('timeout');}return {data:{tempId:50,estado:'STAGED'}};}
  if(url.endsWith('procesar-ocr')){row.ocrCandidate={status:'DONE',resultado:{ok:!ocrFail,metadata:{numero:'1'}}};if(ocrFail)throw Error('OCR failed');return {data:row.ocrCandidate.resultado};}
  if(body.borradorDocumental){row.borradorDocumental=body.borradorDocumental;return {data:row};}
  return {data:{documentoId:90,archivoId:91,documentalV2:{}}};}};
 const module={exports:{}};const context={module,exports:module.exports,require:n=>{if(n==='./api')return{api};throw Error(n);},crypto:webcrypto,FormData,sessionStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},Date,File,console};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/carga-segura.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
 return {...module.exports,calls,row,values};
}
for(const tipoDocumental of ['OC','OS','FACTURA'])test(`${tipoDocumental}: TEMP, preview y borrador sin IDs definitivos`,async()=>{
 const h=harness(),ctx={tipoDocumental,expedienteId:118};const r=await h.cargarTemporalCompras(new File(['pdf'],'a.pdf'),ctx);
 assert.equal(r.tempId,50);assert.equal(r.archivoId,null);assert.equal(r.documentoId,null);assert.equal(r.signedUrl,'http://minio.test/signed');
 await h.validarTemporalCompras(r,{...ctx,metadata:{fechaEmision:'2026-01-31',numero:'2'}},true);
 const recovered=await h.recuperarTemporalCompras(ctx);assert.equal(recovered.metadata.numero,'2');
 assert.equal(h.calls.filter(c=>c[0]==='post'&&c[1]==='/documentos/tmp').length,1);
 assert.equal(h.calls.filter(c=>c[1].endsWith('procesar-ocr')).length,1);
});
test('OCR fallido recupera mismo TEMP y permite validación manual',async()=>{const h=harness({ocrFail:true});const ctx={tipoDocumental:'OC',expedienteId:118};const r=await h.cargarTemporalCompras(new File(['pdf'],'a.pdf'),ctx);assert.equal(r.ok,false);await h.validarTemporalCompras(r,{...ctx,metadata:{fechaEmision:'2026-01-31'}});assert.equal(h.values.size,0);});
test('respuesta upload perdida conserva la misma clave idempotente',async()=>{const h=harness({timeout:true}),file=new File(['pdf'],'a.pdf'),ctx={tipoDocumental:'OS',expedienteId:118};await assert.rejects(h.cargarTemporalCompras(file,ctx));await h.cargarTemporalCompras(file,ctx);const calls=h.calls.filter(c=>c[1]==='/documentos/tmp');assert.equal(calls[0][3].headers['Idempotency-Key'],calls[1][3].headers['Idempotency-Key']);});
test('reintento con identidad conocida no vuelve a subir ni procesa OCR otra vez',async()=>{const h=harness(),file=new File(['pdf'],'a.pdf'),ctx={tipoDocumental:'OS',expedienteId:118};await h.cargarTemporalCompras(file,ctx);await h.cargarTemporalCompras(file,ctx);assert.equal(h.calls.filter(c=>c[1]==='/documentos/tmp').length,1);assert.equal(h.calls.filter(c=>c[1].endsWith('procesar-ocr')).length,1);});

for(const canalIngreso of ['COMPRAS_NUEVO_UPLOAD_PRINCIPAL','COMPRAS_EDITAR_UPLOAD'])test('forwards explicit OC/OS channel '+canalIngreso,async()=>{const h=harness();await h.cargarTemporalCompras(new File(['pdf'],'a.pdf'),{tipoDocumental:'OC',expedienteId:118,canalIngreso});const call=h.calls.find(c=>c[1].endsWith('procesar-ocr'));assert.equal(call[2].canalIngreso,canalIngreso);});
test('legacy context without channel remains backward compatible',async()=>{const h=harness();await h.cargarTemporalCompras(new File(['pdf'],'a.pdf'),{tipoDocumental:'OC',expedienteId:118});const call=h.calls.find(c=>c[1].endsWith('procesar-ocr'));assert.equal(call[2].canalIngreso,undefined);});
