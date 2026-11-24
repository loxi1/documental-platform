export type ConfigArchivado = { get<T = string>(key:string): T | undefined };
export function configuracionNas(config:ConfigArchivado){
  const production=config.get<string>('NODE_ENV')==='production';
  const value=(key:string,fallback:string)=>{
    const v=config.get<string>(key);
    if(production && v===undefined)throw new Error('ARCHIVADO_NAS_CONFIG_PRODUCCION_REQUERIDA');
    return v??fallback;
  };
  const result={host:value('R2_NAS_SMB_HOST','192.168.0.198'),share:value('R2_NAS_SMB_SHARE','GESTION-DOCUMENTARIA'),
    raiz:value('R2_NAS_SMB_ROOT','_DEV_DOCUMENTAL_PLATFORM'),usuario:value('R2_NAS_SMB_USER','documental_platform_dev'),
    destino:value('R2_NAS_DESTINATION','SYNOLOGY_DEV'),production};
  if(production && (result.destino==='SYNOLOGY_DEV'||result.raiz.split('/').includes('_DEV_DOCUMENTAL_PLATFORM')))
    throw new Error('ARCHIVADO_NAS_ENTORNOS_MEZCLADOS');
  return result;
}
export function origenPublicoArchivado(config:ConfigArchivado,base:string):string{
  const url=new URL(base),production=config.get<string>('NODE_ENV')==='production';
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('ARCHIVADO_VISOR_ORIGEN_INVALIDO');
  if(production){
    const allow=String(config.get<string>('R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS')??'').split(',').map(v=>v.trim());
    if(url.protocol!=='https:'||!allow.includes(url.origin)||['localhost','127.0.0.1','[::1]'].includes(url.hostname))
      throw new Error('ARCHIVADO_VISOR_ORIGEN_INVALIDO');
  }else if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1'].includes(url.hostname))
    throw new Error('ARCHIVADO_VISOR_ORIGEN_INVALIDO');
  return url.origin;
}
