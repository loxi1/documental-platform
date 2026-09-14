import { ForbiddenException, Injectable } from '@nestjs/common';
import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import { validarActorOp } from './orden-pago.dto';
import type { OrdenPagoActor } from './orden-pago.dto';

@Injectable()
export class BuscarContextosOpService {
  constructor(private readonly contenedores: ContenedorOperativoRepository) {}

  async buscar(actor: OrdenPagoActor, query: { q?: string; limit?: string }) {
    validarActorOp(actor);
    // listar usa NULL como ausencia de filtro: nunca permitirlo en esta selección autenticada.
    if (!actor.clienteDestinoId) throw new ForbiddenException('Workspace sin cliente destino');
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q.length < 2) return { items: [] };
    const requested = Number(query.limit ?? 10);
    const limit = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10) : 10;
    const result = await this.contenedores.listar({ empresaCodigo: actor.empresaCodigo,
      clienteDestinoId: actor.clienteDestinoId, estado: 'activo', q, limit, offset: 0 });
    return { items: result.items.map(c => ({ contenedorOperativoId: Number(c.id),
      expedienteId: c.expedienteV1Id == null ? null : Number(c.expedienteV1Id),
      codigo: c.codigo, descripcion: c.descripcion || c.nombre || '' })) };
  }
}
