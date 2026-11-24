const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {resolverNombreArchivado:resolver}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-nomenclatura.js'));
const security=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-seguridad.js'));
const base={empresa:'BBTI',periodo:{anio:'2026',mes:'11'},tipo:'OC',numero:'008410',version:1,extension:'pdf'};
const resolve=(over={})=>resolver({...base,...over});
for(const [tipo,nombre] of [['OC','OC_008410.pdf'],['OS','OS_008410.pdf'],['ORDEN_PAGO','OP_008410.pdf']])test('nombre aprobado '+tipo,()=>assert.equal(resolve({tipo}).nombre,nombre));
for(const p of ['OC','OS','OP'])test('Factura vinculada '+p,()=>assert.equal(resolve({tipo:'FACTURA',serie:'F010',numero:'00011384',ruc:'20123456789',principal:{tipo:p,numero:'008410'}}).nombre,`${p}_008410__FACTURA_F010-00011384_20123456789.pdf`));
test('Guia vinculada OC',()=>assert.equal(resolve({tipo:'GUIA_REMISION',serie:'T001',numero:'9261',ruc:'20123456789',principal:{tipo:'OC',numero:'008410'}}).nombre,'OC_008410__GUIA_T001-9261_20123456789.pdf'));
test('NI vinculada OC',()=>assert.equal(resolve({tipo:'NOTA_INGRESO',numero:'0000021920',principal:{tipo:'OC',numero:'008410'}}).nombre,'OC_008410__NOTA_INGRESO_0000021920.pdf'));
test('RH vinculado OP',()=>assert.equal(resolve({tipo:'RECIBO_HONORARIO',serie:'E001',numero:'94',ruc:'20123456789',principal:{tipo:'OP',numero:'0000000163'}}).nombre,'OP_0000000163__RH_E001-94_20123456789.pdf'));
test('Ruta comun exacta sin cliente ni id tecnico',()=>assert.equal(resolve().rutaRelativa,'documentos/2026/11/BBTI/OC_008410.pdf'));
for(const [label,change] of Object.entries({traversal:{empresa:'../BBTI'},smbInjection:{empresa:'BBTI;quit'},month:{periodo:{anio:'2026',mes:'13'}},version:{version:0},unknown:{tipo:'SEGURO'},missingPrincipal:{tipo:'FACTURA'},missingRuc:{tipo:'FACTURA',serie:'F001',principal:{tipo:'OC',numero:'1'}},unknownExtension:{extension:'exe'}}))test('bloquea '+label,()=>assert.equal(resolve(change).estado,'BLOQUEADO'));
const c={confirmado:true,archivoId:1,documentoId:2,version:1,token:'lease-a',generacion:3,leaseHasta:2000,nasVerificado:true,nasLecturaVerificada:true,referenciasResueltas:true,eliminacionRealHabilitada:false};
test('reserva incompleta excluida',()=>assert.equal(security.puedeReclamarArchivado({...c,archivoId:null}),false));
test('documento no confirmado excluido',()=>assert.equal(security.puedeReclamarArchivado({...c,confirmado:false}),false));
test('lease vencido rechazado',()=>assert.equal(security.poseeLease(c,'lease-a',3,2000),false));
test('generacion antigua rechazada',()=>assert.equal(security.poseeLease(c,'lease-a',2,1000),false));
test('token ajeno rechazado',()=>assert.equal(security.poseeLease(c,'lease-b',3,1000),false));
test('eliminacion real deshabilitada',()=>assert.equal(security.puedeEliminarR2(c,'lease-a',3,1000),false));
for(const flag of ['nasVerificado','nasLecturaVerificada','referenciasResueltas'])test('delete exige '+flag,()=>assert.equal(security.puedeEliminarR2({...c,eliminacionRealHabilitada:true,[flag]:false},'lease-a',3,1000),false));
test('delete requiere todos los controles',()=>assert.equal(security.puedeEliminarR2({...c,eliminacionRealHabilitada:true},'lease-a',3,1000),true));
test('respuesta perdida mas 404 no acredita autoria',()=>assert.equal(security.acreditarEliminacion({intentoPersistido:true,respuestaDeleteHttp:null,respuestaPersistida:false,headHttp:404}),'ELIMINACION_INCIERTA'));
test('respuesta no persistida no acredita',()=>assert.equal(security.acreditarEliminacion({intentoPersistido:true,respuestaDeleteHttp:204,respuestaPersistida:false,headHttp:404}),'ELIMINACION_INCIERTA'));
test('403 no es ausencia',()=>assert.notEqual(security.acreditarEliminacion({intentoPersistido:true,respuestaDeleteHttp:204,respuestaPersistida:true,headHttp:403}),'ELIMINADO_ACREDITADO'));
test('requiere respuesta durable y ausencia',()=>assert.equal(security.acreditarEliminacion({intentoPersistido:true,respuestaDeleteHttp:204,respuestaPersistida:true,headHttp:404}),'ELIMINADO_ACREDITADO'));

const evidence={intentoId:'attempt-a',respuestaIntentoId:'attempt-a',ausenciaIntentoId:'attempt-a',intencionEn:10,respuestaEn:20,ausenciaEn:30,acreditacionEn:40,http:204};
test('proof requires one attempt and ordered timestamps',()=>assert.equal(security.pruebaEliminacionCoherente(evidence),true));
for(const change of [{respuestaIntentoId:'previous'},{ausenciaIntentoId:'previous'},{intencionEn:25},{respuestaEn:35},{acreditacionEn:29},{http:403},{respuestaEn:NaN}])test('rejects invalid deletion proof '+JSON.stringify(change),()=>assert.equal(security.pruebaEliminacionCoherente({...evidence,...change}),false));

test('OS Guia and NI preserve approved OC/OS naming structure',()=>{
 assert.equal(resolve({tipo:'GUIA_REMISION',serie:'T001',numero:'9261',ruc:'20123456789',principal:{tipo:'OS',numero:'008410'}}).nombre,'OS_008410__GUIA_T001-9261_20123456789.pdf');
 assert.equal(resolve({tipo:'NOTA_INGRESO',numero:'21920',principal:{tipo:'OS',numero:'008410'}}).nombre,'OS_008410__NOTA_INGRESO_21920.pdf');
});
const{resolverNombrePropuesto}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-nomenclatura.js'));
test('approved version is enabled in the real resolver',()=>{
 assert.equal(resolve({version:2}).estado,'RESUELTO');
 assert.equal(resolverNombrePropuesto({...base,version:2}).nombre,'OC_008410__V2.pdf');
});
test('approved bank support uses the real resolver',()=>{
 const s={...base,tipo:'TRANSFERENCIA',principal:{tipo:'OP',numero:'163'},banco:'BCP',numeroOperacion:'123456'};
 assert.equal(resolver(s).estado,'RESUELTO');
 assert.equal(resolverNombrePropuesto(s).nombre,'OP_163__TRANSFERENCIA_BCP_123456.pdf');
 assert.equal(resolverNombrePropuesto({...s,banco:'../BCP'}).estado,'BLOQUEADO');
});

test('versiones aprobadas V2 y V3 sin sufijos acumulados',()=>{assert.equal(resolve({version:2}).nombre,'OC_008410__V2.pdf');assert.equal(resolve({version:3}).nombre,'OC_008410__V3.pdf')});
