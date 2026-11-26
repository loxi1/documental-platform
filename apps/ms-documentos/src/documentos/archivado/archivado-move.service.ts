import { pruebaEliminacionCoherente } from './archivado-seguridad';
import { randomUUID } from 'node:crypto';
import { ArchivadoRepository, type ArchivadoRow, type LeaseArchivado } from './archivado.repository';

export type PruebaContenido = { sha256: string; bytes: number };
/** Physical content identity, independent of a documento/archivo association. */
export type ContenidoArchivado = Pick<ArchivadoRow,
  'r2_cuenta'|'r2_bucket'|'r2_key'|'sha256'|'tamano_bytes'|'nas_destino'|'ruta_relativa'> & {
  reserva_id?: string; staging_relativa?: string | null;
  origen?: 'EXPEDIENTES_IMPORTACION'; importacion_id?: string;
  solicitud_id?: string; empresa_codigo?: string;
};
export interface ArchivadoR2 {
  /** All operations validate configured account against the immutable reservation. */
  identidad(): { cuenta: string; bucket: string };
  comprobarOrigen?(row:ArchivadoRow):Promise<'PRESENTE'|'AUSENTE'>;
  verificarOrigen?(row:ArchivadoRow):Promise<void>;
  eliminarOrigen?(row:ArchivadoRow):Promise<{http:number;requestId:string|null}>;
  materializar?(row: ArchivadoRow): Promise<void>;
  leer(row: ContenidoArchivado): Promise<AsyncIterable<Uint8Array>>;
  comprobar(row: ContenidoArchivado): Promise<'PRESENTE' | 'AUSENTE'>;
  verificarParaEliminar?(row:ContenidoArchivado):Promise<{etag:string;sha256:string;bytes:number}>;
  eliminarExacto(row: ContenidoArchivado): Promise<{ http: number; requestId: string | null }>;
}
export interface ArchivadoNas {
  /** Spool and verify input BEFORE no-replace publication; reread destination. */
  publicarSinReemplazo(row: ContenidoArchivado, source: AsyncIterable<Uint8Array>,
    renovarLease: () => Promise<void>, registrarStaging: (ruta: string) => Promise<void>): Promise<PruebaContenido>;
  verificar(row: ContenidoArchivado): Promise<PruebaContenido>;
}
/** Shared institutional staging/no-replace transfer and content verification. No DELETE. */
export async function transferirContenidoNas(row:ContenidoArchivado,r2:Pick<ArchivadoR2,'leer'>,
  nas:ArchivadoNas,renovar:()=>Promise<void>,registrarStaging:(ruta:string)=>Promise<void>,verificado=false):Promise<PruebaContenido>{
  const p=verificado?await nas.verificar(row)
    :await nas.publicarSinReemplazo(row,await r2.leer(row),renovar,registrarStaging);
  if(p.sha256!==row.sha256||!Number.isSafeInteger(p.bytes)||p.bytes!==Number(row.tamano_bytes))
    throw new Error('ARCHIVADO_INTEGRIDAD_NO_COINCIDE');
  return p;
}
export interface DisponibilidadArchivado {
  conExclusion?<T>(row: ArchivadoRow, work: () => Promise<T>): Promise<T>;
  /** Proves the same authorized viewer path used by the application, not SMB reachability alone. */
  verificarLectura(row: ArchivadoRow): Promise<boolean>;
  /** Includes domain references and exclusion shared with every participating writer. */
  verificarReferenciasYExclusion(row: ArchivadoRow): Promise<boolean>;
  verificarOrigenMaterializacion?(row:ArchivadoRow):Promise<boolean>;
  autorizarEliminacion?(row:ArchivadoRow):Promise<Record<string,unknown>|null>;
}
export type ResultadoMove = 'SIN_TRABAJO' | 'NAS_VERIFICADO_DELETE_DESHABILITADO'
  | 'NAS_VERIFICADO_VISOR_PENDIENTE' | 'COMPLETADO' | 'ELIMINACION_INCIERTA';

/** Same entry for ordinary confirmation, manual regularization and daily invocation.
 * No scheduler, startup work or implicit enablement. Domain hooks are separate. */
export class ArchivadoMoveService {
  constructor(private readonly repo: ArchivadoRepository, private readonly r2: ArchivadoR2,
    private readonly nas: ArchivadoNas, private readonly disponibilidad: DisponibilidadArchivado,
    private readonly politica: { eliminacionRealHabilitada: boolean; autorizacionDurableRequerida?:boolean } = { eliminacionRealHabilitada: false }) {}

  async procesarUno(empresa: string, clienteId: number, expedienteId?: number | null): Promise<ResultadoMove> {
    const row = await this.repo.reclamar(empresa, clienteId, expedienteId);
    if (!row) return 'SIN_TRABAJO';
    return this.disponibilidad.conExclusion
      ? this.disponibilidad.conExclusion(row,()=>this.procesarReclamado(row)) : this.procesarReclamado(row);
  }
  /**
   * Procesa exclusivamente una reserva documental identificada.
   * Reutiliza el movimiento institucional, sin seleccionar otros trabajos.
   */
  async procesarReservaExacta(
    reservaId: number,
    archivoId: number,
    documentoId: number,
    empresa: string,
    clienteId: number,
    expedienteId: number | null,
    version?: number,
  ): Promise<ResultadoMove> {
    const row = await this.repo.reclamarReservaExacta(
      reservaId, archivoId, documentoId, empresa, clienteId, expedienteId, ...(version===undefined?[]:[version]),
    );
    if (!row) return 'SIN_TRABAJO';

    return this.disponibilidad.conExclusion
      ? this.disponibilidad.conExclusion(row, () => this.procesarReclamado(row))
      : this.procesarReclamado(row);
  }

  private async limpiarOrigenMaterializacion(row:ArchivadoRow,lease:LeaseArchivado):Promise<void>{
    const o=row.contexto?.origenMaterializacion;if(!o)return;
    if(!this.r2.comprobarOrigen||!this.r2.verificarOrigen||!this.r2.eliminarOrigen
      ||!await this.disponibilidad.verificarOrigenMaterializacion?.(row))throw new Error('ARCHIVADO_ORIGEN_REFERENCIAS_PENDIENTES');
    const eventos=(row.evidencia??[]).filter(e=>e?.datos?.key===o.key);
    const intentos=eventos.filter(e=>e.evento==='ORIGEN_INTENTO');
    const previo=intentos.at(-1);
    const respuesta=eventos.find(e=>e.evento==='ORIGEN_RESPUESTA'&&e.datos.intento===previo?.datos.intento);
    if(await this.r2.comprobarOrigen(row)==='AUSENTE'){
      if(!previo||!respuesta||respuesta.datos.http<200||respuesta.datos.http>=300
        ||!(Date.parse(respuesta.fecha)>=Date.parse(previo.fecha)))throw new Error('ARCHIVADO_ORIGEN_ELIMINACION_INCIERTA');
      await this.repo.evidenciaOrigen(lease,'ORIGEN_AUSENCIA',{key:o.key,intento:previo.datos.intento});return;
    }
    if(previo)throw new Error('ARCHIVADO_ORIGEN_ELIMINACION_INCIERTA');
    await this.r2.verificarOrigen(row);
    await this.repo.renovar(lease);
    const intento=randomUUID();
    await this.repo.evidenciaOrigen(lease,'ORIGEN_INTENTO',{key:o.key,bucket:o.bucket,intento,sha256:row.sha256,bytes:Number(row.tamano_bytes)});
    const response=await this.r2.eliminarOrigen(row);
    if(response.http<200||response.http>=300)throw new Error('ARCHIVADO_ORIGEN_DELETE_NO_EXITOSO');
    await this.repo.evidenciaOrigen(lease,'ORIGEN_RESPUESTA',{key:o.key,intento,http:response.http,requestId:response.requestId});
    if(await this.r2.comprobarOrigen(row)!=='AUSENTE')throw new Error('ARCHIVADO_ORIGEN_AUSENCIA_NO_CONFIRMADA');
    await this.repo.evidenciaOrigen(lease,'ORIGEN_AUSENCIA',{key:o.key,intento});
  }

  private async procesarReclamado(row: ArchivadoRow): Promise<ResultadoMove> {
    const lease: LeaseArchivado = { id: row.id, token: row.lease_token, generacion: row.generacion };
    let intentoId = row.eliminacion_intento_id;
    let intentoIniciado = ['ELIMINACION_INICIADA','ELIMINACION_INCIERTA'].includes(row.r2_estado);
    const comprobarPrueba = (p: PruebaContenido) => {
      if (p.sha256 !== row.sha256 || !Number.isSafeInteger(p.bytes) || p.bytes !== Number(row.tamano_bytes)) {
        throw new Error('ARCHIVADO_INTEGRIDAD_NO_COINCIDE');
      }
    };
    try {
      const identidad = this.r2.identidad();
      if (identidad.cuenta !== row.r2_cuenta || identidad.bucket !== row.r2_bucket) throw new Error('ARCHIVADO_ENTORNO_NO_COINCIDE');
      if (!row.confirmado_en || !row.archivo_id || !row.documento_id || !row.version) throw new Error('ARCHIVADO_NO_CONFIRMADO');
      if (row.r2_key.startsWith('documentos/tmp/')) throw new Error('ARCHIVADO_TEMP_EXCLUIDO');
      if(row.contexto?.modo==='NUEVO_TARDIO' && !intentoIniciado){
        if(!this.r2.materializar)throw new Error('ARCHIVADO_MATERIALIZADOR_REQUERIDO');
        await this.r2.materializar(row);await this.repo.materializado(lease);
      }
      if(await this.r2.comprobar(row)==='AUSENTE')await this.repo.observarAusencia(lease,intentoIniciado);
      const renovacion = () => this.repo.renovar(lease);
      await renovacion();
      await transferirContenidoNas(row,this.r2,this.nas,renovacion,
        ruta=>this.repo.registrarStaging(lease,ruta),row.nas_estado==='VERIFICADO'||intentoIniciado);
      // Persist NAS availability before exercising the actual viewer query.
      await this.repo.nasVerificado(lease,row.sha256,Number(row.tamano_bytes),false);
      const lectura = await this.disponibilidad.verificarLectura(row);
      if (lectura) await this.repo.nasVerificado(lease,row.sha256,Number(row.tamano_bytes),true);
      if (!lectura) {
        await this.repo.liberar(lease,'ARCHIVADO_VISOR_PENDIENTE',intentoIniciado);
        return 'NAS_VERIFICADO_VISOR_PENDIENTE';
      }
      const origen = await this.r2.comprobar(row);
      if (origen === 'AUSENTE') {
        // Lost DELETE response plus 404 is not proof of authorship.
        if (intentoIniciado && pruebaEliminacionCoherente({intentoId,respuestaIntentoId:row.delete_respuesta_intento_id,
            ausenciaIntentoId:intentoId,intencionEn:row.eliminacion_iniciada_en?new Date(row.eliminacion_iniciada_en).getTime():NaN,
            respuestaEn:row.delete_respuesta_en?new Date(row.delete_respuesta_en).getTime():NaN,
            ausenciaEn:Date.now(),acreditacionEn:Date.now(),http:row.delete_respuesta_http})) {
          await this.repo.completar(lease,intentoId!); return 'COMPLETADO';
        }
        if (intentoIniciado) {
          await this.repo.liberar(lease,'ARCHIVADO_DELETE_AUTORIA_INCIERTA',true);
          return 'ELIMINACION_INCIERTA';
        }
        throw new Error('ARCHIVADO_ORIGEN_AUSENTE_SIN_DELETE');
      }
      if (!this.politica.eliminacionRealHabilitada) {
        await this.repo.liberar(lease,'ARCHIVADO_DELETE_DESHABILITADO',intentoIniciado);
        return 'NAS_VERIFICADO_DELETE_DESHABILITADO';
      }
      // An unknown previous request may still be in flight. Never issue another DELETE,
      // even when a later HEAD currently observes the object present.
      if(intentoIniciado){
        await this.repo.liberar(lease,'ARCHIVADO_DELETE_AUTORIA_INCIERTA',true);
        return 'ELIMINACION_INCIERTA';
      }
      if(row.contexto?.origenFisico && row.contexto.origenFisico.key!==row.r2_key)
        throw new Error('ARCHIVADO_ORIGEN_PREVIO_REQUIERE_REGULARIZACION');
      if (!await this.disponibilidad.verificarReferenciasYExclusion(row)) throw new Error('ARCHIVADO_REFERENCIAS_O_EXCLUSION_PENDIENTES');
      // Recheck NAS and application availability immediately before destructive work.
      comprobarPrueba(await this.nas.verificar(row));
      if (!await this.disponibilidad.verificarLectura(row)) throw new Error('ARCHIVADO_VISOR_NO_DISPONIBLE');
      if(this.politica.autorizacionDurableRequerida){
        const decision=await this.disponibilidad.autorizarEliminacion?.(row);
        if(!decision)throw new Error('ARCHIVADO_DELETE_PRODUCCION_NO_AUTORIZADO');
        if(!this.r2.verificarParaEliminar)throw new Error('ARCHIVADO_DELETE_IDENTIDAD_NO_ACREDITADA');
        const proof=await this.r2.verificarParaEliminar(row);
        if(!proof?.etag)throw new Error('ARCHIVADO_DELETE_IDENTIDAD_NO_ACREDITADA');
        comprobarPrueba(proof);
        await this.repo.autorizarEliminacion(lease,{...decision,r2:{cuenta:row.r2_cuenta,bucket:row.r2_bucket,
          key:row.r2_key,etag:proof.etag,sha256:proof.sha256,bytes:proof.bytes}});
      }
      await this.limpiarOrigenMaterializacion(row,lease);
      await renovacion();
      intentoId = randomUUID();
      await this.repo.iniciarEliminacion(lease,intentoId); intentoIniciado = true;
      const response = await this.r2.eliminarExacto(row);
      await this.repo.respuestaDelete(lease,intentoId,response.http,response.requestId);
      if (await this.r2.comprobar(row) !== 'AUSENTE') throw new Error('ARCHIVADO_AUSENCIA_NO_CONFIRMADA');
      await this.repo.completar(lease,intentoId!);return 'COMPLETADO';
    } catch (error) {
      const code = error instanceof Error && /^ARCHIVADO_[A-Z0-9_]+$/.test(error.message)
        ? error.message : 'ARCHIVADO_IO_ERROR';
      // A stale worker must never alter a new owner's record.
      if (code !== 'ARCHIVADO_LEASE_PERDIDO') await this.repo.liberar(lease,code,intentoIniciado);
      throw new Error(code);
    }
  }
}
