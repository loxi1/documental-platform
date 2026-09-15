import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UploadedFiles, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CARGA_SEGURA_MULTER_FIELDS, CARGA_SEGURA_MULTER_OPTIONS } from '../carga-segura/http/carga-segura-multer';
import { CargaSeguraHttpExceptionFilter } from '../carga-segura/http/carga-segura-http.filter';
import { resolveCargaSeguraHttpIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { TmpService } from './tmp.service';

@Controller('documentos/tmp')
@UseFilters(new CargaSeguraHttpExceptionFilter())
export class TmpController {
  constructor(private readonly service: TmpService) {}
  // Mismo contrato interno de identidad de carga-segura: headers de Gateway, nunca del body.
  private actor(h: Record<string, string>, read = false) {
    return resolveCargaSeguraHttpIdentity({ workspaceId: h['x-workspace-id'], empresaCodigo: h['x-empresa-codigo'],
      clienteDestinoId: h['x-cliente-destino-id'], actorId: h['x-actor-id'], userId: h['x-user-id'],
      requestId: h['x-request-id'], correlationId: h['x-correlation-id'], idempotencyKey: read ? 'consulta' : h['idempotency-key'] });
  }
  @Post()
  @UseInterceptors(FileFieldsInterceptor([...CARGA_SEGURA_MULTER_FIELDS], CARGA_SEGURA_MULTER_OPTIONS))
  reserve(@Headers() headers: Record<string, string>, @Body() body: Record<string, unknown>,
    @UploadedFiles() files: { archivo?: { originalname: string; mimetype: string; buffer: Buffer }[] }) {
    if (Object.keys(body ?? {}).length || files?.archivo?.length !== 1) throw new BadRequestException('TEMP requiere únicamente un archivo');
    return this.service.reserve(this.actor(headers), files.archivo[0]);
  }
  @Get(':tempId')
  consult(@Headers() headers: Record<string, string>, @Param('tempId') id: string) {
    return this.service.consult(Number(id), this.actor(headers, true));
  }
  @Post(':tempId/promover')
  promote(@Headers() headers: Record<string, string>, @Param('tempId') id: string, @Body() body: Record<string, unknown>) {
    if (!body || Object.keys(body).some(k => k !== 'destinoStorageKey')) throw new BadRequestException('Campo TEMP no permitido');
    return this.service.promote(Number(id), this.actor(headers), body.destinoStorageKey);
  }
}
