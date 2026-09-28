import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { resolveCargaSeguraHttpIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { ReciboHonorarioTempMaterializationService } from './recibo-honorario-temp-materialization.service';

@Controller('documentos/tmp')
export class ReciboHonorarioTempMaterializationController {
  constructor(
    private readonly service: ReciboHonorarioTempMaterializationService,
  ) {}

  @Post(':tempId/materializar-recibo-honorario-op')
  materializarReciboHonorarioOp(
    @Headers() headers: Record<string, string>,
    @Param('tempId') tempId: string,
    @Body() body: { metadata?: Record<string, any> },
  ) {
    const actor = resolveCargaSeguraHttpIdentity({
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
      actor.idempotencyKey,
      {
        id: actor.actorId,
        workspaceId: actor.workspaceId,
        empresaCodigo: actor.empresaCodigo,
        clienteDestinoId: actor.clienteDestinoId,
        requestId: actor.requestId,
        correlationId: actor.correlationId,
      },
      body?.metadata as Record<string, any>,
    );
  }
}
