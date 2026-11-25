import type { ConfigArchivado } from './archivado-configuracion';

export type IdentidadDeleteProduccion = {
  reservaId: number; archivoId: number; documentoId: number; version: number;
  empresa: string; clienteId: number; expedienteId: number | null;
};
export type PoliticaDeleteProduccion = {
  version: 1; decisionId: string;
  proteccion: { tipo: 'BACKUP_RECUPERABLE' | 'RIESGO_COPIA_UNICA_ACEPTADO_PO'; referencia: string };
  modo: 'EXACTO' | 'NUEVOS'; desde: string; hasta?: string; permanente?: true;
  contextos: Array<{ empresa: string; clienteId: number }>;
  archivos?: IdentidadDeleteProduccion[];
};
const id=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
const label=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z0-9][A-Z0-9_.:/-]{0,159}$/i.test(v);
export function instanteDelete(value:unknown):number {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return NaN;
  const n=Date.parse(value);
  return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===value.slice(0,19)?n:NaN;
}
/** Configuration is a recorded PO decision, never evidence of a backup by itself.
 * Invalid, absent, expired or cross-environment configuration fails closed.
 */
export function politicaDeleteProduccion(config:ConfigArchivado,now=Date.now()):PoliticaDeleteProduccion|null {
  if(config.get('NODE_ENV')!=='production'||config.get('R2_NAS_DESTINATION')!=='SYNOLOGY_PROD'
    ||config.get('R2_NAS_SMB_HOST')!=='10.77.26.2'||config.get('R2_NAS_SMB_SHARE')!=='GESTION-DOCUMENTARIA'
    ||config.get('R2_NAS_SMB_ROOT')!=='PLATAFORMA_DOCUMENTAL'
    ||config.get('R2_NAS_ARCHIVE_ENABLED')!=='true'||config.get('R2_NAS_AUTO_ENABLED')!=='true'
    ||config.get('R2_NAS_NEW_DOCUMENTS_ENABLED')!=='true'||config.get('R2_NAS_VIEWER_ENABLED')!=='true'
    ||config.get('R2_NAS_VIEWER_ACCEPTED')!=='true'||config.get('R2_NAS_DEV_DELETE_ENABLED')==='true'
    ||config.get('R2_NAS_PRODUCTION_DELETE_ENABLED')!=='true')return null;
  try {
    const p:PoliticaDeleteProduccion|null=JSON.parse(config.get<string>('R2_NAS_PRODUCTION_DELETE_POLICY')??'null');
    if(!p||p.version!==1||!label(p.decisionId)||!p.proteccion
      ||!['BACKUP_RECUPERABLE','RIESGO_COPIA_UNICA_ACEPTADO_PO'].includes(p.proteccion.tipo)
      ||!label(p.proteccion.referencia)||!['EXACTO','NUEVOS'].includes(p.modo))return null;
    const from=instanteDelete(p.desde),cutoff=instanteDelete(config.get('R2_NAS_ACTIVATION_FROM'));
    if(![now,from,cutoff].every(Number.isFinite)||from<cutoff||now<from)return null;
    // Permanence is an explicit NEW-document decision, never a missing expiry.
    if(p.permanente===true){
      if(p.modo!=='NUEVOS'||Object.prototype.hasOwnProperty.call(p,'hasta'))return null;
    }else{
      if(Object.prototype.hasOwnProperty.call(p,'permanente'))return null;
      const until=instanteDelete(p.hasta);
      if(!Number.isFinite(until)||until<=from||now>=until)return null;
    }
    if(!Array.isArray(p.contextos)||!p.contextos.length||p.contextos.length>20
      ||p.contextos.some(c=>!c||!label(c.empresa)||!/^[A-Z0-9_-]+$/.test(c.empresa)||!id(c.clienteId))
      ||new Set(p.contextos.map(c=>`${c.empresa}:${c.clienteId}`)).size!==p.contextos.length)return null;
    if(p.modo==='EXACTO'){
      if(!Array.isArray(p.archivos)||!p.archivos.length||p.archivos.length>20
        ||p.archivos.some(a=>!a||![a.reservaId,a.archivoId,a.documentoId,a.version,a.clienteId].every(id)
          ||(a.expedienteId!==null&&!id(a.expedienteId))
          ||!p.contextos.some(c=>c.empresa===a.empresa&&c.clienteId===a.clienteId))
        ||new Set(p.archivos.map(a=>a.reservaId)).size!==p.archivos.length
        ||new Set(p.archivos.map(a=>a.archivoId)).size!==p.archivos.length)return null;
    }else if(p.archivos!==undefined)return null;
    return p;
  }catch{return null;}
}
export function identidadDeletePermitida(p:PoliticaDeleteProduccion,i:IdentidadDeleteProduccion,confirmadoEn:unknown):boolean {
  if(!p.contextos.some(c=>c.empresa===i.empresa&&c.clienteId===i.clienteId))return false;
  if(p.modo==='NUEVOS'){
    const confirmed=confirmadoEn instanceof Date?confirmadoEn.getTime():Date.parse(String(confirmadoEn));
    return Number.isFinite(confirmed)&&confirmed>=instanteDelete(p.desde);
  }
  return p.archivos!.some(a=>a.reservaId===i.reservaId&&a.archivoId===i.archivoId&&a.documentoId===i.documentoId
    &&a.version===i.version&&a.empresa===i.empresa&&a.clienteId===i.clienteId&&a.expedienteId===i.expedienteId);
}
