import type { PeriodoDocumentalR2 } from '../periodo-documental-r2.fecha';

export type SolicitudNombreArchivado = {
  empresa: string;
  /** Resultado del resolutor documental existente; nunca fecha de carga. */
  periodo: Pick<PeriodoDocumentalR2, 'anio' | 'mes'>;
  tipo: string;
  numero?: string;
  serie?: string;
  ruc?: string;
  principal?: { tipo: 'OC' | 'OS' | 'OP'; numero: string };
  version: number;
  extension: string;
  banco?: string;
  numeroOperacion?: string;
  /** Authorized original file/reservation path, supplied only by the accepted-version writer. */
  baseOriginal?: string;
};
export type ResultadoNombreArchivado =
  | { estado: 'RESUELTO'; rutaRelativa: string; nombre: string; regla: string }
  | { estado: 'BLOQUEADO'; motivo: string };

/** Sin I/O, sin reloj y sin modificaciones a claves históricas. */
export function resolverNombreArchivado(s: SolicitudNombreArchivado): ResultadoNombreArchivado {
  const bloqueado = (motivo: string): ResultadoNombreArchivado => ({ estado: 'BLOQUEADO', motivo });
  const segmento = (v: unknown): v is string => typeof v === 'string'
    && /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(v) && v.length <= 80;
  const numero = (v: unknown): v is string => typeof v === 'string' && /^\d{1,30}$/.test(v);
  if (!segmento(s.empresa) || !/^\d{4}$/.test(s.periodo.anio)
      || Number(s.periodo.anio) < 1900 || !/^(0[1-9]|1[0-2])$/.test(s.periodo.mes)) {
    return bloqueado('CONTEXTO_O_PERIODO_INVALIDO');
  }
  if (!Number.isSafeInteger(s.version)||s.version<1) return bloqueado('VERSION_INVALIDA');
  if (!['pdf','png','jpg'].includes(s.extension) || (s.extension!=='pdf' && s.tipo!=='ORDEN_PAGO' && s.version===1))
    return bloqueado('EXTENSION_SIN_REGLA_APROBADA');
  if(!['OC','OS','ORDEN_PAGO','FACTURA','RECIBO_HONORARIO','GUIA_REMISION','NOTA_INGRESO','TRANSFERENCIA','PAGO_TRANSFERENCIA','DETRACCION','PAGO_DETRACCION'].includes(s.tipo))
    return bloqueado('VARIANTE_SIN_REGLA_APROBADA');
  if(s.version>1 && s.baseOriginal){
    const m=/^documentos\/(\d{4})\/(0[1-9]|1[0-2])\/([A-Z0-9_-]+)\/([A-Z0-9_,-]+)\.(pdf|png|jpg)$/.exec(s.baseOriginal);
    if(!m||m[1]!==s.periodo.anio||m[2]!==s.periodo.mes||m[3]!==s.empresa||! /^(OC|OS|OP)_\d+(?:__|$)/.test(m[4]))return bloqueado('BASE_VERSION_NO_ACREDITADA');
    const stem=m[4].replace(/__V[1-9]\d*$/,'');
    const tag=s.tipo==='ORDEN_PAGO'?'OP':s.tipo==='GUIA_REMISION'?'GUIA':s.tipo==='RECIBO_HONORARIO'?'RH':s.tipo.replace(/^PAGO_/,'');
    if(['OC','OS','OP'].includes(tag)?!stem.startsWith(tag+'_'):!stem.includes('__'+tag+'_'))return bloqueado('BASE_VERSION_NO_ACREDITADA');
    if(/__V[1-9]\d*$/.test(stem))return bloqueado('BASE_VERSION_NO_ACREDITADA');
    const nombre=stem+'__V'+s.version+'.'+s.extension;
    return {estado:'RESUELTO',nombre,rutaRelativa:`documentos/${s.periodo.anio}/${s.periodo.mes}/${s.empresa}/${nombre}`,regla:'R2_NAS_NOMENCLATURA_R1'};
  }
  let nombre: string;
  if (['OC', 'OS', 'ORDEN_PAGO'].includes(s.tipo)) {
    if (!numero(s.numero)) return bloqueado('NUMERO_DOCUMENTAL_INCOMPLETO');
    const tipo = s.tipo === 'ORDEN_PAGO' ? 'OP' : s.tipo;
    nombre = `${tipo}_${s.numero}.pdf`;
  } else {
    const p = s.principal;
    if (!p || !['OC', 'OS', 'OP'].includes(p.tipo) || !numero(p.numero)) {
      return bloqueado('PRINCIPAL_DOCUMENTAL_INCOMPLETO');
    }
    const principal = `${p.tipo}_${p.numero}`;
    if(['TRANSFERENCIA','PAGO_TRANSFERENCIA','DETRACCION','PAGO_DETRACCION'].includes(s.tipo)){
      const banco=typeof s.banco==='string'?s.banco.trim().toUpperCase().replace(/\s+/g,'_'):undefined;
      const operacion=typeof s.numeroOperacion==='string'?s.numeroOperacion.trim():undefined;
      if(!segmento(banco)||typeof operacion!=='string'||!/^[A-Z0-9]+(?:[-_,][A-Z0-9]+)*$/.test(operacion)||operacion.length>80)return bloqueado('IDENTIDAD_BANCARIA_INCOMPLETA');
      const etiqueta=['TRANSFERENCIA','PAGO_TRANSFERENCIA'].includes(s.tipo)?'TRANSFERENCIA':'DETRACCION';
      nombre=`${principal}__${etiqueta}_${banco}_${operacion}.pdf`;
    } else if (s.tipo === 'NOTA_INGRESO' && ['OC','OS'].includes(p.tipo)) {
      if (!numero(s.numero)) return bloqueado('NUMERO_DOCUMENTAL_INCOMPLETO');
      nombre = `${principal}__NOTA_INGRESO_${s.numero}.pdf`;
    } else {
      const etiqueta = s.tipo === 'FACTURA' ? 'FACTURA'
        : s.tipo === 'GUIA_REMISION' && ['OC','OS'].includes(p.tipo) ? 'GUIA'
        : s.tipo === 'RECIBO_HONORARIO' && p.tipo === 'OP' ? 'RH' : null;
      if (!etiqueta) return bloqueado('VARIANTE_SIN_REGLA_APROBADA');
      if (!segmento(s.serie) || !numero(s.numero) || !/^\d{11}$/.test(s.ruc ?? '')) {
        return bloqueado('IDENTIDAD_DOCUMENTAL_INCOMPLETA');
      }
      nombre = `${principal}__${etiqueta}_${s.serie}-${s.numero}_${s.ruc}.pdf`;
    }
  }
  nombre=nombre.replace(/\.pdf$/,`${s.version>1?'__V'+s.version:''}.${s.extension}`);
  return { estado: 'RESUELTO', nombre,
    rutaRelativa: `documentos/${s.periodo.anio}/${s.periodo.mes}/${s.empresa}/${nombre}`,
    regla: 'R2_NAS_NOMENCLATURA_R1' };
}

/** Compatibility name for historical callers; only PO-approved operational variants are accepted. */
export function resolverNombrePropuesto(s:SolicitudNombreArchivado & {numeroPoliza?:string}):ResultadoNombreArchivado{
  return resolverNombreArchivado(s);
}

/** MIME is persisted/validated by existing upload boundaries; never infer from original filename. */
export function extensionArchivadoDesdeMime(mime:unknown):string{
  return mime==='application/pdf'?'pdf':mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'SIN_REGLA';
}

/** Only formats already admitted by the institutional upload signature validator. */
export function mimeArchivadoDesdeContenido(bytes:Uint8Array):string|undefined{
  const signatures:[string,number[]][]=[['application/pdf',[37,80,68,70,45]],['image/png',[137,80,78,71,13,10,26,10]],['image/jpeg',[255,216,255]]];
  return signatures.find(([,prefix])=>bytes.length>=prefix.length&&prefix.every((b,i)=>bytes[i]===b))?.[0];
}
