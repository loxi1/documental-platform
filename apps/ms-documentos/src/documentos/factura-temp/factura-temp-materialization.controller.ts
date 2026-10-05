import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { resolveCargaSeguraHttpIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { FacturaTempMaterializationService } from './factura-temp-materialization.service';

@Controller('documentos/tmp')
export class FacturaTempMaterializationController {
  constructor(
    private readonly service: FacturaTempMaterializationService,
  ) {}

  @Post(':tempId/materializar-factura-op')
  materializarFacturaOp(
    @Headers() headers: Record<string, string>,
    @Param('tempId') tempId: string,
    @Body() body: { metadata?: Record<string, any> },
  ) {
    const resolvedIdentity = resolveCargaSeguraHttpIdentity({
      workspaceId: headers['x-workspace-id'],
      empresaCodigo: headers['x-empresa-codigo'],
      clienteDestinoId: headers['x-cliente-destino-id'],
      actorId: headers['x-actor-id'],
      userId: headers['x-user-id'],
      requestId: headers['x-request-id'],
      correlationId: headers['x-correlation-id'],
      idempotencyKey: headers['idempotency-key'],
    });

    return this.service.materializar(
      Number(tempId),
      resolvedIdentity.idempotencyKey,
      {
        id: resolvedIdentity.actorId,
        workspaceId: resolvedIdentity.workspaceId,
        empresaCodigo: resolvedIdentity.empresaCodigo,
        clienteDestinoId: resolvedIdentity.clienteDestinoId,
        requestId: resolvedIdentity.requestId,
        correlationId: resolvedIdentity.correlationId,
      },
      body?.metadata as Record<string, any>,
    );
  }
}
