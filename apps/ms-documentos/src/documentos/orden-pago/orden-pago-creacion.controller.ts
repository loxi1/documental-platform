import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { OrdenPagoArchivoService } from './orden-pago-archivo.service';

@Controller('documental-v2/finanzas')
export class OrdenPagoCreacionController {
  constructor(private readonly op: OrdenPagoArchivoService) {}

  // Gateway valida token y permisos. Identidad exclusivamente de headers internos.
  @Post('ordenes-pago/:ordenPagoId/reemplazar-archivo-inicial')
  reemplazarArchivoInicial(
    @Headers() h: Record<string, string>,
    @Param('ordenPagoId') ordenPagoId: string,
    @Body() body: unknown,
  ) {
    return this.op.reemplazarArchivoInicial(
      Number(ordenPagoId),
      body,
      h['idempotency-key'],
      {
        id: Number(h['x-user-id']),
        workspaceId: Number(h['x-workspace-id']),
        empresaCodigo: String(h['x-empresa-codigo'] ?? '').trim().toUpperCase(),
        clienteDestinoId: h['x-cliente-destino-id']
          ? Number(h['x-cliente-destino-id'])
          : null,
        email: h['x-user-email'],
        requestId: h['x-request-id'],
        correlationId: h['x-correlation-id'],
        sessionContextId: h['x-session-context-id'],
        sistemaCodigo: h['x-sistema-codigo'],
        perfilCodigo: h['x-perfil-codigo'],
      },
    );
  }

  @Post('ordenes-pago')
  crear(@Headers() h: Record<string, string>, @Body() body: unknown) {
    return this.op.crear(body, h['idempotency-key'], { id: Number(h['x-user-id']), workspaceId: Number(h['x-workspace-id']),
      empresaCodigo: String(h['x-empresa-codigo'] ?? '').trim().toUpperCase(),
      clienteDestinoId: h['x-cliente-destino-id'] ? Number(h['x-cliente-destino-id']) : null,
      email: h['x-user-email'], requestId: h['x-request-id'], correlationId: h['x-correlation-id'],
      sessionContextId: h['x-session-context-id'], sistemaCodigo: h['x-sistema-codigo'], perfilCodigo: h['x-perfil-codigo'] });
  }
}
