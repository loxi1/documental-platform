import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

/** Collects domain intents; never performs I/O until the outer commit resolves. */
@Injectable()
export class ArchivadoPostcommit {
  private readonly scope = new AsyncLocalStorage<{documentos:Set<number>;archivos:Set<number>}>();
  private processor?: (documentos: number[],archivos:number[]) => Promise<void>;
  registrar(documentoId: number,archivoId:number) {
    const scope=this.scope.getStore();scope?.documentos.add(documentoId);scope?.archivos.add(archivoId);
  }
  conectar(processor: (documentos: number[],archivos:number[]) => Promise<void>) { this.processor = processor; }
  async ejecutar<T>(commit: () => Promise<T>): Promise<T> {
    if (this.scope.getStore()) return commit();
    const documentos = {documentos:new Set<number>(),archivos:new Set<number>()};
    const result = await this.scope.run(documentos, commit);
    // A failed commit never reaches here. Durable intents survive any I/O failure.
    if (documentos.archivos.size && this.processor) {
      try { await this.processor([...documentos.documentos],[...documentos.archivos]); } catch { /* persistent retry, no domain rollback */ }
    }
    return result;
  }
}

/** Optional bridge keeps legacy/test construction valid without creating a second runtime. */
export function ejecutarConfirmacion<T>(
  bridge: { conConfirmacion?: <R>(work: () => Promise<R>) => Promise<R> } | undefined,
  work: () => Promise<T>,
): Promise<T> { return bridge?.conConfirmacion ? bridge.conConfirmacion(work) : work(); }
