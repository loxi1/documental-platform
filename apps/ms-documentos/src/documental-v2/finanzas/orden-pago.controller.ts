import { BuscarContextosOpService } from './buscar-contextos-op.service';
import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdenPagoService } from './orden-pago.service';
import { validarActorOp } from './orden-pago.dto';
import type { OrdenPagoActor } from './orden-pago.dto';
import { ExpedientesRepository } from '../../expedientes/expedientes.repository';

@Controller('documental-v2/finanzas')
export class OrdenPagoController {
  constructor(private readonly op: OrdenPagoService, private readonly expedientes: ExpedientesRepository, private readonly contextos: BuscarContextosOpService) {}

  // Identidad reenviada por Gateway tras validar el token; nunca se acepta desde el body.
  private actor(h: Record<string, string>): OrdenPagoActor {
    const actor = { id: Number(h['x-user-id']), workspaceId: Number(h['x-workspace-id']),
      empresaCodigo: String(h['x-empresa-codigo'] ?? '').trim().toUpperCase(),
      clienteDestinoId: h['x-cliente-destino-id'] ? Number(h['x-cliente-destino-id']) : null,
      email: h['x-user-email'], requestId: h['x-request-id'], correlationId: h['x-correlation-id'],
      sessionContextId: h['x-session-context-id'], sistemaCodigo: h['x-sistema-codigo'], perfilCodigo: h['x-perfil-codigo'] };
    validarActorOp(actor);
    return actor;
  }

  @Get('ordenes-pago/contextos')
  buscarContextos(@Headers() headers: Record<string, string>, @Query() query: { q?: string; limit?: string }) {
    return this.contextos.buscar(this.actor(headers), query);
  }

  @Get('ordenes-pago/opciones')
  opciones(@Headers() headers: Record<string, string>) { return this.op.opciones(this.actor(headers)); }

  @Get('ordenes-pago/beneficiarios')
  beneficiarios(
    @Headers() headers: Record<string, string>,
    @Query() query: { contenedorOperativoId?: string; conceptoCodigo?: string },
  ) {
    return this.op.beneficiariosElegibles(this.actor(headers), query);
  }

  @Get('ordenes-pago/:ordenPagoId/upload-pendiente')
  obtenerUploadPendiente(
    @Headers() headers: Record<string, string>,
    @Param('ordenPagoId') id: string,
  ) {
    return this.op.obtenerUploadPendiente(Number(id), this.actor(headers));
  }

  @Get('ordenes-pago/:ordenPagoId')
  obtenerDetalle(@Headers() headers: Record<string, string>, @Param('ordenPagoId') id: string) {
    return this.op.obtenerDetalle(Number(id), this.actor(headers));
  }

  @Patch('ordenes-pago/:ordenPagoId')
  editar(
    @Headers() headers: Record<string, string>,
    @Param('ordenPagoId') id: string,
    @Body() body: unknown,
  ) {
    return this.op.editar(Number(id), body, this.actor(headers));
  }

  @Post('ordenes-pago/:ordenPagoId/confirmar-pago')
  confirmarPago(
    @Headers() headers: Record<string, string>,
    @Param('ordenPagoId') id: string,
    @Body() body: unknown,
  ) {
    return this.op.confirmarPago(Number(id), body, this.actor(headers));
  }

  @Get('bandeja')
  async bandeja(@Headers() headers: Record<string, string>, @Query() query: Record<string, string>) {
    const actor = this.actor(headers);
    const items = await this.expedientes.getRevisionContable({ empresa: actor.empresaCodigo,
      q: query.q, limit: Number(query.limit), offset: Number(query.offset),
      soloPendientesFinanzas: query.soloPendientesFinanzas === 'true' }, actor);
    return { items };
  }
}
