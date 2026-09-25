import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { OrdenPagoService } from '../../documental-v2/finanzas/orden-pago.service';
import { AuditoriaOperativaV2Repository } from '../../documental-v2/auditoria-operativa-v2.repository';
import { validarActorOp, validarOrdenPago, OrdenPagoActor } from '../../documental-v2/finanzas/orden-pago.dto';
import { buildCargaSeguraStorageKey } from '../carga-segura/carga-segura.storage';
import type { CargaSeguraHttpResolvedIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { TmpRepository } from '../tmp/tmp.repository';
import { TmpService } from '../tmp/tmp.service';
import { DocumentosRepository } from '../documentos.repository';
import {
  OP_INITIAL_FILE,
  OP_INITIAL_FILE_REPLACEMENT,
  OrdenPagoArchivoRepository,
} from './orden-pago-archivo.repository';

@Injectable()
export class OrdenPagoArchivoService {
  constructor(
    private readonly op: OrdenPagoService,
    private readonly repository: OrdenPagoArchivoRepository,
    private readonly temps: TmpRepository,
    private readonly tmp: TmpService,
    private readonly documentos: DocumentosRepository,
    private readonly auditoria: AuditoriaOperativaV2Repository,
  ) {}

  async reemplazarArchivoInicial(
    ordenPagoId: number,
    body: unknown,
    key: string,
    actor: OrdenPagoActor,
  ) {
    validarActorOp(actor);

    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new ConflictException('Orden de Pago inválida');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ConflictException('Reemplazo de archivo inválido');
    }

    const raw = body as Record<string, unknown>;
    if (
      Object.keys(raw).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(raw, 'tempId') ||
      !Number.isSafeInteger(raw.tempId) ||
      Number(raw.tempId) <= 0
    ) {
      throw new ConflictException('Reemplazo requiere únicamente tempId');
    }

    if (typeof key !== 'string' || !key.trim()) {
      throw new ConflictException('Idempotency-Key requerido');
    }
    if (actor.clienteDestinoId == null) {
      throw new ForbiddenException('Cliente autenticado requerido para TEMP');
    }

    const tempId = Number(raw.tempId);
    const identity = key.trim().toLowerCase();
    const requestId = actor.requestId || randomUUID();

    const detalle: any = await this.op.obtenerDetalle(ordenPagoId, actor);
    const ids = {
      ordenPagoId: Number(detalle.ordenPagoId),
      documentoId: Number(detalle.documentoId),
      grupoFacturaId: Number(detalle.grupoFacturaId),
      contenedorOperativoId: Number(detalle.contenedorOperativoId),
      idempotente: false,
    };
    const oldArchivoId =
      detalle.archivoInicial?.archivoId == null
        ? null
        : Number(detalle.archivoInicial.archivoId);

    const tmpActor: CargaSeguraHttpResolvedIdentity = {
      actorId: actor.id,
      workspaceId: actor.workspaceId,
      empresaCodigo: actor.empresaCodigo,
      clienteDestinoId: actor.clienteDestinoId,
      idempotencyKey: identity,
      requestId,
      correlationId: actor.correlationId || requestId,
    };

    const reserved = await this.temps.locked(
      String(tempId),
      c => this.temps.transaction(c, async tx => {
        const row = await this.temps.own(tx, tempId, tmpActor);

        if (row.metadata?.integration) {
          this.repository.assertReplacementClaim(row, identity, ids);
        } else if (
          row.estado !== 'almacenada' ||
          row.promovida_en ||
          row.documento_id ||
          row.archivo_id ||
          row.metadata?.destinoReservado
        ) {
          throw new ConflictException('OP_REPLACEMENT_TEMP_NOT_AVAILABLE');
        }

        const destination =
          row.metadata?.destinoReservado ||
          buildCargaSeguraStorageKey({
            operacionId: tempId,
            empresaCodigo: row.empresa_codigo,
            nombreArchivo: row.nombre_archivo_original,
            fecha: new Date(row.iniciada_en),
          });

        await this.repository.reserveReplacement(
          tx,
          row,
          ids,
          identity,
          destination,
        );

        return { destination };
      }),
    );

    const promoted = await this.tmp.promote(
      tempId,
      tmpActor,
      reserved.destination,
      {
        consumer: OP_INITIAL_FILE_REPLACEMENT,
        identity,
        persist: async (tx, row, destination) => {
          await this.repository.completeReplacementCandidate(
            tx,
            row,
            ids,
            identity,
            destination,
            actor,
          );
        },
      },
    );

    const row = await this.temps.locked(
      String(tempId),
      c => this.temps.own(c, tempId, tmpActor),
    );

    if (
      !row.archivo_id ||
      row.metadata?.integration?.completed !== true
    ) {
      throw new ConflictException('OP_REPLACEMENT_FILE_INCOMPLETE');
    }

    const archivoId = Number(row.archivo_id);

    const versionState =
      await this.documentos.obtenerEstadoArchivoVersion(archivoId);

    if (
      !versionState ||
      Number((versionState as any).documento_id) !== ids.documentoId ||
      (versionState as any).origen_archivo !== 'OP_INICIAL'
    ) {
      throw new ConflictException('OP_REPLACEMENT_FILE_CONFLICT');
    }

    const replay = (versionState as any).es_version_actual === true;
    let version = (versionState as any).version ?? null;
    let esVersionActual = replay;

    if (!replay) {
      const versionado: any =
        await this.documentos.agregarArchivoComoVersion({
          documentoId: ids.documentoId,
          archivoId,
          tipoVersion: 'reemplazo',
          observacion: 'Reemplazo de archivo inicial de Orden de Pago',
          marcarComoActual: true,
          usuarioId: actor.id,
          areaOrigen: 'FINANZAS',
          origenArchivo: 'OP_INICIAL',
          metadataMerge: {
            rol: 'ARCHIVO_INICIAL_OP',
            tipoPrincipal: 'ORDEN_PAGO',
            reemplazoArchivoInicial: true,
            tempId,
          },
        });

      version = versionado?.version ?? null;
      esVersionActual = versionado?.esVersionActual === true;

      if (
        Number(versionado?.documentoId) !== ids.documentoId ||
        Number(versionado?.archivoId) !== archivoId ||
        !esVersionActual
      ) {
        throw new ConflictException('OP_REPLACEMENT_VERSION_INCOMPLETE');
      }

      await this.auditoria.registrarEdicion({
        accion: 'EDITAR_OP',
        entidad: 'documento_archivo',
        entidadId: archivoId,
        descripcion: 'Archivo inicial de Orden de Pago reemplazado mediante versionado.',
        empresaCodigo: actor.empresaCodigo,
        usuario: { ...actor, origen: 'finanzas-op' },
        antes: {
          ordenPagoId: ids.ordenPagoId,
          documentoId: ids.documentoId,
          grupoFacturaId: ids.grupoFacturaId,
          archivoId: oldArchivoId,
        },
        despues: {
          ordenPagoId: ids.ordenPagoId,
          documentoId: ids.documentoId,
          grupoFacturaId: ids.grupoFacturaId,
          contenedorOperativoId: ids.contenedorOperativoId,
          oldArchivoId,
          newArchivoId: archivoId,
          tempId,
          version,
          esVersionActual,
          origenArchivo: 'OP_INICIAL',
        },
      });
    }

    return {
      ...ids,
      idempotente: replay,
      archivoInicial: {
        tempId,
        archivoId,
        oldArchivoId,
        version,
        esVersionActual,
        estado: promoted.estado,
        destinoStorageKey: promoted.destinoStorageKey,
      },
    };
  }

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
