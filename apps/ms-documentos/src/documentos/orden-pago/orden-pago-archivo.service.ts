import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { OrdenPagoService } from '../../documental-v2/finanzas/orden-pago.service';
import { validarActorOp, validarOrdenPago, OrdenPagoActor } from '../../documental-v2/finanzas/orden-pago.dto';
import { buildCargaSeguraStorageKey } from '../carga-segura/carga-segura.storage';
import type { CargaSeguraHttpResolvedIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { TmpRepository } from '../tmp/tmp.repository';
import { TmpService } from '../tmp/tmp.service';
import { OP_INITIAL_FILE, OrdenPagoArchivoRepository } from './orden-pago-archivo.repository';

@Injectable()
export class OrdenPagoArchivoService {
  constructor(private readonly op: OrdenPagoService, private readonly repository: OrdenPagoArchivoRepository,
    private readonly temps: TmpRepository, private readonly tmp: TmpService) {}

  async crear(body: unknown, key: string, actor: OrdenPagoActor) {
    validarActorOp(actor);
    const input = validarOrdenPago(body, key);
    if (input.tempId == null) return this.op.crear(body, key, actor);
    if (actor.clienteDestinoId == null) throw new ForbiddenException('Cliente autenticado requerido para TEMP');
    const tempId = input.tempId;
    const identity = key.toLowerCase();
    const requestId = actor.requestId || randomUUID();
    const tmpActor: CargaSeguraHttpResolvedIdentity = { actorId: actor.id, workspaceId: actor.workspaceId,
      empresaCodigo: actor.empresaCodigo, clienteDestinoId: actor.clienteDestinoId,
      idempotencyKey: identity, requestId, correlationId: actor.correlationId || requestId };
    const reserved = await this.temps.locked(String(tempId), c => this.temps.transaction(c, async tx => {
      const row = await this.temps.own(tx, tempId, tmpActor);
      if (row.metadata?.integration) this.repository.assertClaim(row, identity);
      else if (row.estado !== 'almacenada' || row.promovida_en || row.documento_id || row.archivo_id ||
        row.metadata?.destinoReservado) throw new ConflictException('OP_TEMP_NOT_AVAILABLE');
      const ids = await this.op.crear(body, identity, actor, tx);
      const destination = row.metadata?.destinoReservado || buildCargaSeguraStorageKey({ operacionId: tempId,
        empresaCodigo: row.empresa_codigo, nombreArchivo: row.nombre_archivo_original, fecha: new Date(row.iniciada_en) });
      await this.repository.reserve(tx, row, ids, identity, destination);
      return { ids, destination };
    }));
    // T1 ya hizo COMMIT. COPY/VERIFY no sostienen una transacción PostgreSQL.
    const promoted = await this.tmp.promote(tempId, tmpActor, reserved.destination, {
      consumer: OP_INITIAL_FILE, identity,
      persist: (tx, row, destination) => this.repository.complete(tx, row, reserved.ids, identity, destination, actor),
    });
    const row = await this.temps.locked(String(tempId), c => this.temps.own(c, tempId, tmpActor));
    if (!row.archivo_id || row.metadata?.integration?.completed !== true) throw new ConflictException('OP_FILE_INCOMPLETE');
    return { ...reserved.ids, archivoInicial: { tempId, archivoId: Number(row.archivo_id),
      estado: promoted.estado, destinoStorageKey: promoted.destinoStorageKey } };
  }
}
