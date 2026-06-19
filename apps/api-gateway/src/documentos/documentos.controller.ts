import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import axios, { Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { NatsSubjects, REQUEST_ID_HEADER } from '@documental/shared';

import { NATS_CLIENT } from '../nats/nats-client.provider';

@ApiTags('documentos')
@ApiBearerAuth()
@Controller('documentos')
export class DocumentosGatewayController {
  constructor(
    private readonly config: ConfigService,
    @Inject(NATS_CLIENT)
    private readonly nats: ClientProxy,
  ) {}

  private async validateAuthorization(authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const response = await firstValueFrom(
        this.nats.send(NatsSubjects.AuthValidateToken, { token }),
      );

      if (!response?.valid) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

      return response.payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private getBaseUrl() {
    return (
      this.config.get<string>('MS_DOCUMENTOS_URL') ??
      process.env.MS_DOCUMENTOS_URL ??
      'http://localhost:3002/api/v1'
    );
  }

  private buildForwardHeaders(
    authorization: string | undefined,
    requestId: string | undefined,
  ) {
    return {
      ...(authorization ? { authorization } : {}),
      ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
    };
  }

  private unwrap(response: any) {
    return response?.data?.data ?? response?.data;
  }

  private async proxy(params: {
    method: Method;
    path: string;
    authorization?: string;
    requestId?: string;
    query?: Record<string, any>;
    body?: unknown;
  }) {
    await this.validateAuthorization(params.authorization);

    const response = await axios.request({
      method: params.method,
      url: `${this.getBaseUrl()}${params.path}`,
      params: params.query,
      data: params.body,
      headers: this.buildForwardHeaders(
        params.authorization,
        params.requestId,
      ),
    });

    return this.unwrap(response);
  }

  @ApiOperation({ summary: 'Listar documentos vía API Gateway' })
  @Get()
  findAll(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos',
      authorization,
      requestId,
      query,
    });
  }

  @ApiOperation({ summary: 'Procesar OCR de archivo vía API Gateway' })
  @Post('archivos/:archivoId/procesar-ocr')
  procesarOcrArchivo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('archivoId') archivoId: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/archivos/${archivoId}/procesar-ocr`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Editar resultado OCR vía API Gateway' })
  @Put('ocr-resultados/:id/editar')
  editarOcrResultadoPut(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'PUT',
      path: `/documentos/ocr-resultados/${id}/editar`,
      authorization,
      requestId,
      body,
    });
  }

  @Patch('ocr-resultados/:id/editar')
  editarOcrResultadoPatch(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'PATCH',
      path: `/documentos/ocr-resultados/${id}/editar`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Confirmar resultado OCR vía API Gateway' })
  @Post('ocr-resultados/:id/confirmar')
  confirmarOcrResultado(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/confirmar`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Rechazar resultado OCR vía API Gateway' })
  @Post('ocr-resultados/:id/rechazar')
  rechazarOcrResultado(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/rechazar`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Obtener documento por ID vía API Gateway' })
  @Get(':id')
  findById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}`,
      authorization,
      requestId,
    });
  }
}
