import { resolverNombreArchivado,resolverNombrePropuesto,extensionArchivadoDesdeMime,mimeArchivadoDesdeContenido } from './archivado-nomenclatura';
describe('Aprobación literal final PO, sin seguros ni pólizas',()=>{
 const base={empresa:'BBTEC',periodo:{anio:'2026',mes:'10'},tipo:'ORDEN_PAGO',numero:'000180',version:1,extension:'pdf'};
 it.each(['pdf','png','jpg'])('OP inicial %s mantiene formato real',extension=>{
  expect(resolverNombreArchivado({...base,extension})).toMatchObject({nombre:'OP_000180.'+extension,regla:'R2_NAS_NOMENCLATURA_R1'});
 });
 it.each(['OC','OS','OP'] as const)('sustentos %s requieren banco y operación explícitos',tipo=>{
  for(const kind of ['TRANSFERENCIA','DETRACCION']){
   const s={...base,tipo:kind,principal:{tipo,numero:'123'},banco:'BBVA',numeroOperacion:'00114460'};
   expect(resolverNombreArchivado(s)).toMatchObject({nombre:`${tipo}_123__${kind}_BBVA_00114460.pdf`});
   expect(resolverNombreArchivado({...s,version:2})).toMatchObject({nombre:`${tipo}_123__${kind}_BBVA_00114460__V2.pdf`});
   for(const bad of [{banco:undefined},{numeroOperacion:undefined},{numeroOperacion:'../x'},{banco:'x;quit'},{banco:123 as any},{numeroOperacion:123 as any}])expect(resolverNombreArchivado({...s,...bad})).toMatchObject({estado:'BLOQUEADO'});
  }
 });
 it('V2/V3 usan base original, no acumulan sufijos y conservan periodo y extensión admitida',()=>{
  const original='documentos/2026/10/BBTEC/OC_123__FACTURA_F001-123_20100041953.pdf';
  const s={...base,tipo:'FACTURA',baseOriginal:original,version:2};
  expect(resolverNombreArchivado(s)).toMatchObject({nombre:'OC_123__FACTURA_F001-123_20100041953__V2.pdf'});
  expect(resolverNombreArchivado({...s,baseOriginal:original.replace('.pdf','__V2.pdf'),version:3,extension:'png'})).toMatchObject({nombre:'OC_123__FACTURA_F001-123_20100041953__V3.png'});
  expect(resolverNombreArchivado({...s,baseOriginal:original.replace('/10/','/09/')})).toMatchObject({estado:'BLOQUEADO'});
  expect(resolverNombreArchivado({...s,baseOriginal:original.replace('BBTEC','AJENO')})).toMatchObject({estado:'BLOQUEADO'});
  expect(resolverNombreArchivado({...s,baseOriginal:original.replace('.pdf','__V2__V3.pdf')})).toMatchObject({estado:'BLOQUEADO'});
 });
 it('MIME y firmas admitidas no dependen del nombre original',()=>{
  for(const [mime,ext,data] of [['application/pdf','pdf',Buffer.from('%PDF-1.7')],['image/png','png',Buffer.from([137,80,78,71,13,10,26,10])],['image/jpeg','jpg',Buffer.from([255,216,255])]] as const){
   expect(extensionArchivadoDesdeMime(mime)).toBe(ext);expect(mimeArchivadoDesdeContenido(data)).toBe(mime);
  }
  expect(extensionArchivadoDesdeMime('image/gif')).toBe('SIN_REGLA');expect(extensionArchivadoDesdeMime('constructor')).toBe('SIN_REGLA');expect(mimeArchivadoDesdeContenido(Buffer.from('arbitrary'))).toBeUndefined();
 });
 it('seguro/póliza no habilitados; factura de seguro sigue siendo FACTURA',()=>{
  const s={...base,tipo:'SEGURO',principal:{tipo:'OP' as const,numero:'180'}};
  expect(resolverNombrePropuesto({...s,numeroPoliza:'123'})).toMatchObject({estado:'BLOQUEADO'});
  expect(resolverNombreArchivado({...s,tipo:'FACTURA',serie:'F001',numero:'123',ruc:'20100041953'})).toMatchObject({nombre:'OP_180__FACTURA_F001-123_20100041953.pdf'});
 });
});
