export type ControlArchivado = {
  confirmado: boolean;
  archivoId: number | null;
  documentoId: number | null;
  version: number | null;
  token: string | null;
  generacion: number;
  leaseHasta: number;
  nasVerificado: boolean;
  nasLecturaVerificada: boolean;
  referenciasResueltas: boolean;
  eliminacionRealHabilitada: boolean;
};

export function puedeReclamarArchivado(c: Pick<ControlArchivado,
  'confirmado' | 'archivoId' | 'documentoId' | 'version'>): boolean {
  return c.confirmado && [c.archivoId, c.documentoId, c.version]
    .every(v => Number.isSafeInteger(v) && Number(v) > 0);
}

/** CAS protege persistencia; no cancela operaciones externas ya enviadas. */
export function poseeLease(c: ControlArchivado, token: string, generacion: number, ahora: number): boolean {
  return Boolean(token) && c.token === token && c.generacion === generacion
    && Number.isFinite(c.leaseHasta) && Number.isFinite(ahora) && c.leaseHasta > ahora;
}

export function puedeEliminarR2(c: ControlArchivado, token: string, generacion: number, ahora: number): boolean {
  return puedeReclamarArchivado(c) && poseeLease(c, token, generacion, ahora)
    && c.nasVerificado && c.nasLecturaVerificada && c.referenciasResueltas
    && c.eliminacionRealHabilitada;
}

export function acreditarEliminacion(e: {
  intentoPersistido: boolean;
  respuestaDeleteHttp: number | null;
  respuestaPersistida: boolean;
  headHttp: number | null;
}): 'ELIMINADO_ACREDITADO' | 'ELIMINACION_INCIERTA' | 'NO_ACREDITADA' {
  if (!e.intentoPersistido) return 'NO_ACREDITADA';
  if (e.respuestaPersistida && e.respuestaDeleteHttp !== null
      && e.respuestaDeleteHttp >= 200 && e.respuestaDeleteHttp < 300 && e.headHttp === 404) {
    return 'ELIMINADO_ACREDITADO';
  }
  return 'ELIMINACION_INCIERTA';
}

/** Used for recovery: only evidence belonging to this exact attempt can establish deletion. */
export function pruebaEliminacionCoherente(p: {
  intentoId: string | null; respuestaIntentoId: string | null; ausenciaIntentoId: string | null;
  intencionEn: number; respuestaEn: number; ausenciaEn: number; acreditacionEn: number;
  http: number | null;
}): boolean {
  return Boolean(p.intentoId) && p.intentoId===p.respuestaIntentoId && p.intentoId===p.ausenciaIntentoId
    && p.http!==null && p.http>=200 && p.http<300
    && [p.intencionEn,p.respuestaEn,p.ausenciaEn,p.acreditacionEn].every(Number.isFinite)
    && p.intencionEn<=p.respuestaEn && p.respuestaEn<=p.ausenciaEn && p.ausenciaEn<=p.acreditacionEn;
}

/** Optional DEV identity watermark; no list, no clock, no production provisioning policy. */
export function idArchivadoDevAdmitido(id:unknown,minimo:string|undefined,permitirSinOrigen=false):boolean{
  if(minimo===undefined)return true;
  if(!/^[1-9]\d*$/.test(minimo)||!Number.isSafeInteger(Number(minimo)))return false;
  if(id==null)return permitirSinOrigen;
  return Number.isSafeInteger(Number(id))&&Number(id)>=Number(minimo);
}
