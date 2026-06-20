import {
  Controller,
  Body,
  Post,
  Get,
  Headers,
  Param,
  Query,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { NatsSubjects, REQUEST_ID_HEADER } from '@documental/shared';

import { NATS_CLIENT } from '../nats/nats-client.provider';

@ApiTags('expedientes')
@ApiBearerAuth()
@Controller('expedientes')
export class ExpedientesGatewayController {
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

  private unwrap(response: any) {
    return response?.data?.data ?? response?.data;
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

  @ApiOperation({ summary: 'Listar expedientes vía API Gateway' })
  @Get()
  async findAll(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    await this.validateAuthorization(authorization);

    const result = await axios.get(`${this.getBaseUrl()}/expedientes`, {
      params: query,
      headers: this.buildForwardHeaders(authorization, requestId),
    });

    return this.unwrap(result);
  }


  @ApiOperation({ summary: 'Buscar expediente por código vía API Gateway' })
  @Get('buscar-por-codigo')
  findByCodigoExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/expedientes/buscar-por-codigo',
      authorization,
      requestId,
      query,
    });
  }

  @ApiOperation({ summary: 'Resumen de expediente vía API Gateway' })
  @Get(':id/resumen')
  getResumen(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/resumen`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Timeline de expediente vía API Gateway' })
  @Get(':id/timeline')
  getTimeline(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/timeline`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Estado documental de expediente vía API Gateway' })
  @Get(':id/estado-documental')
  getEstadoDocumental(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/estado-documental`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Agregar documento a expediente vía API Gateway' })
  @Post(':id/documentos')
  addDocumento(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/expedientes/${id}/documentos`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Revisión contable vía API Gateway' })
  @Get('revision-contable')
  getRevisionContable(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/expedientes/revision-contable',
      authorization,
      requestId,
      query,
    });
  }

  @ApiOperation({ summary: 'Dashboard contable vía API Gateway' })
  @Get('dashboard-contable')
  getDashboardContable(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/expedientes/dashboard-contable',
      authorization,
      requestId,
      query,
    });
  }

    private get msDocumentosUrl() {
    return this.config.get<string>(
      'MS_DOCUMENTOS_URL',
      'http://localhost:3002/api/v1',
    );
  }

  private buildHeaders(
    authorization?: string,
    requestId?: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (authorization) {
      headers.authorization = authorization;
    }

    if (requestId) {
      headers[REQUEST_ID_HEADER] = requestId;
    }

    return headers;
  }

  private async proxy(params: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    authorization?: string;
    requestId?: string;
    query?: Record<string, unknown>;
    body?: unknown;
  }) {
    try {
      const response = await axios.request({
        method: params.method,
        url: `${this.msDocumentosUrl}${params.path}`,
        headers: this.buildHeaders(params.authorization, params.requestId),
        params: params.query,
        data: params.body,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(
          error.response.data ?? {
            message: 'Error desde ms-documentos',
          },
          error.response.status,
        );
      }

      throw new HttpException(
        {
          message: 'No se pudo contactar con ms-documentos',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @ApiOperation({ summary: 'Obtener expediente por ID vía API Gateway' })
  @Get(':id')
  async findById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    await this.validateAuthorization(authorization);

    const result = await axios.get(
      `${this.getBaseUrl()}/expedientes/${id}`,
      {
        headers: this.buildForwardHeaders(authorization, requestId),
      },
    );

    return this.unwrap(result);
  }
}
