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
 return {...module.exports,calls,row,values,api};
}
for(const tipoDocumental of ['OC','OS','FACTURA'])test(`${tipoDocumental}: TEMP, preview y borrador sin IDs definitivos`,async()=>{
 const h=harness(),ctx={tipoDocumental,expedienteId:118,...(tipoDocumental==='FACTURA'?{documentoBaseId:10}:{})};const r=await h.cargarTemporalCompras(new File(['pdf'],'a.pdf'),ctx);
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
for (const candidate of [null,{status:'PROCESSING'},{status:'FAILED',resultado:{ok:false}},{status:'DONE',resultado:{ok:true,metadata:{numero:'F1',rucEmisor:'201'}}},{status:'DONE',resultado:{metadata:{numero:'F1'}}}]) test('recuperación individual sin sessionStorage ni reproceso OCR: '+(candidate?.status??'ABSENT'),async()=>{
 const h=harness();h.row.ocrCandidate=candidate;h.row.comprasFactura={expedienteId:118,documentoBaseId:10};
 const r=await h.recuperarTemporalCompras({tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10},50);
 assert.equal(r.tempId,50);assert.equal(r.archivoId,null);assert.equal(h.values.size,0);assert.equal(h.calls.filter(c=>c[0]==='post').length,0);
 assert.equal(r.metadata.numero,candidate?.resultado?.metadata?.numero);assert.equal(r.metadata.rucProveedor,undefined);
 assert.ok(h.calls.every(c=>c[1].includes('/compras-facturas/118/10/50')));
});
test('borrador prevalece sobre extracción y confirmación compartida no suplanta clave de cargador',async()=>{
 const h=harness();h.row.comprasFactura={expedienteId:118,documentoBaseId:10};h.row.ocrCandidate={resultado:{metadata:{metadata:{numero:'OCR',serie:'F'}}}};h.row.borradorDocumental={metadata:{numero:'MANUAL',fechaEmision:'2026-01-31'}};
 const r=await h.recuperarTemporalCompras({tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10},50);
 assert.equal(r.metadata.numero,'MANUAL');assert.equal(r.metadata.serie,'F');
 await h.validarTemporalCompras(r,{expedienteId:118,documentoBaseId:10,metadata:r.metadata});
 const post=h.calls.find(c=>c[0]==='post');assert.equal(post[1],'/documentos/tmp/compras-facturas/118/10/50/promover');assert.deepEqual(Object.keys(post[3].headers),[]);
});
test('rechaza recuperación con respuesta de otro principal',async()=>{
 const h=harness();h.row.comprasFactura={expedienteId:118,documentoBaseId:99};
 await assert.rejects(h.recuperarTemporalCompras({tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10},50),/fuera del contexto/);
 assert.equal(h.calls.length,1);
});
test('dos facturas diferentes pueden cargarse para la misma OC sin reemplazar la primera en backend',async()=>{
 const h=harness(),ctx={tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10};
 await h.cargarTemporalCompras(new File(['pdf1'],'a.pdf'),ctx);await h.cargarTemporalCompras(new File(['pdf2'],'b.pdf'),ctx);
 const posts=h.calls.filter(c=>c[1]==='/documentos/tmp'&&c[0]==='post');assert.equal(posts.length,2);
 assert.notEqual(posts[0][3].headers['Idempotency-Key'],posts[1][3].headers['Idempotency-Key']);
 assert.deepEqual(JSON.parse(posts[0][2].get('comprasFactura')),{expedienteId:118,documentoBaseId:10});
});
test('descubrimiento devuelve múltiples TEMP sin referencias locales y rechaza contexto diferente',async()=>{
 const h=harness(),ctx={tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10};
 h.api.get=async()=>({data:{contexto:{expedienteId:118,documentoBaseId:10},data:[{tempId:50},{tempId:51}]}});
 const list=await h.listarFacturasTempCompras(ctx);assert.deepEqual(Array.from(list,x=>x.tempId),[50,51]);assert.equal(h.values.size,0);
 h.api.get=async()=>({data:{contexto:{expedienteId:118,documentoBaseId:99},data:[]}});
 await assert.rejects(h.listarFacturasTempCompras(ctx),/fuera de contexto/);
});
function modalForm(result) {
 const p=__dirname+'/../components/ocr/OcrValidationModal.tsx';const src=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['texto','normalizeTipoParaUi','parseMaybeJson','getRecord','getRaw','getMetadata','normalizarMonedaOcr','buildInitialForm'];const found=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))found.push(n.getText(src));ts.forEachChild(n,visit);}visit(src);
 const c={result,context:{codigo:'EXP',rucComprador:'COMPRADOR'}};vm.runInNewContext(ts.transpileModule(found.join('\n')+'\nform = buildInitialForm(result,context)',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,c);return c.form;
}
test('modal existente recibe campos vacíos cuando no hay OCR, sin proveedor inventado desde la OC',async()=>{
 const h=harness();h.row.comprasFactura={expedienteId:118,documentoBaseId:10};
 const result=await h.recuperarTemporalCompras({tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10},50);const form=modalForm(result);
 for(const key of ['rucEmisor','rucProveedor','razonSocial','proveedor','numero','serie','fechaEmision','montoTotal','moneda'])assert.equal(form[key],'',key);
 assert.equal(form.codigoExpediente,'EXP');assert.equal(form.rucComprador,'COMPRADOR');
});
test('modal real conserva borrador por encima de campos raíz OCR y extracción anidada',async()=>{
 const h=harness();h.row.comprasFactura={expedienteId:118,documentoBaseId:10};
 h.row.ocrCandidate={resultado:{numero:'ROOT',fecha_emision:'2025-01-01',metadata:{metadata:{numero:'OCR',serie:'F001',montoTotal:'100'}}}};
 h.row.borradorDocumental={metadata:{numero:'EDITADO',fechaEmision:'2026-11-18',montoTotal:'200',serie:''}};
 const result=await h.recuperarTemporalCompras({tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10},50);const form=modalForm(result);
 assert.equal(form.numero,'EDITADO');assert.equal(form.serie,'');assert.equal(form.fechaEmision,'2026-11-18');assert.equal(form.montoTotal,'200');
});
test('listado conserva contexto a través de envelopes HTTP anidados',async()=>{
 const h=harness(),ctx={tipoDocumental:'FACTURA',expedienteId:118,documentoBaseId:10};
 const result={contexto:{expedienteId:118,documentoBaseId:10},data:[{tempId:50}]};
 for(const payload of [{success:true,data:result},{success:true,data:{success:true,data:result}}]){
  h.api.get=async()=>({data:payload});assert.equal((await h.listarFacturasTempCompras(ctx))[0].tempId,50);
 }
});
