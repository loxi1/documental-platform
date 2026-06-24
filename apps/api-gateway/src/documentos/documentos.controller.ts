import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import axios, { Method } from 'axios';
import FormData from 'form-data';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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

    try {
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
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status ?? 500;
        const payload = error.response.data;
        const upstreamError = payload?.error ?? payload;
        const upstreamDetails = upstreamError?.details ?? payload?.details ?? null;

        throw new HttpException(
          {
            message:
              upstreamError?.message ??
              payload?.message ??
              error.message ??
              'Error del microservicio documentos',
            code: upstreamError?.code ?? payload?.code ?? 'UPSTREAM_ERROR',
            details: upstreamDetails,
            upstream: payload ?? null,
          },
          status,
        );
      }

      throw error;
    }
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


  @ApiOperation({ summary: 'Carga guiada de archivo vía API Gateway' })
  @ApiConsumes('multipart/form-data')
  @Post('carga-guiada')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'file', maxCount: 1 },
    { name: 'archivo', maxCount: 1 },
  ]))
  async cargaGuiada(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @UploadedFiles() files: Record<string, any[]>,
    @Body() body: Record<string, any>,
  ) {
    await this.validateAuthorization(authorization);

    const file = files?.file?.[0] ?? files?.archivo?.[0];

    if (!file?.buffer) {
      throw new Error('Archivo requerido en el campo file o archivo');
    }

    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });
    form.append('archivo', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    for (const [key, value] of Object.entries(body ?? {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => form.append(key, String(item)));
      } else {
        form.append(key, String(value));
      }
    }

    const response = await axios.request({
      method: 'POST',
      url: `${this.getBaseUrl()}/documentos/carga-guiada`,
      data: form,
      headers: {
        ...this.buildForwardHeaders(authorization, requestId),
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return this.unwrap(response);
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

  @ApiOperation({ summary: 'Confirmar OCR con expediente de forma transaccional vía API Gateway' })
  @Post('ocr-resultados/:id/confirmar-con-expediente')
  confirmarOcrResultadoConExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/confirmar-con-expediente`,
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

  @ApiOperation({ summary: 'Resumen general de documentos vía API Gateway' })
  @Get('resumen')
  getResumen(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos/resumen',
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Listar tipos documentales vía API Gateway' })
  @Get('tipos')
  getTipos(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos/tipos',
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Listar clientes destino vía API Gateway' })
  @Get('clientes-destino')
  getClientesDestino(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos/clientes-destino',
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Buscar proveedores vía API Gateway' })
  @Get('proveedores')
  getProveedores(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos/proveedores',
      authorization,
      requestId,
      query,
    });
  }

  @ApiOperation({ summary: 'Listar resultados OCR vía API Gateway' })
  @Get('ocr-resultados')
  findOcrResultados(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy({
      method: 'GET',
      path: '/documentos/ocr-resultados',
      authorization,
      requestId,
      query,
    });
  }

  @ApiOperation({ summary: 'Obtener resultado OCR por ID vía API Gateway' })
  @Get('ocr-resultados/:id')
  findOcrResultadoById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/ocr-resultados/${id}`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Crear expediente desde OCR vía API Gateway' })
  @Post('ocr-resultados/:id/crear-expediente')
  crearExpedienteDesdeOcr(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/crear-expediente`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Sugerir expediente para OCR vía API Gateway' })
  @Post('ocr-resultados/:id/sugerir-expediente')
  sugerirExpedienteParaOcr(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/sugerir-expediente`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Vincular OCR a expediente vía API Gateway' })
  @Post('ocr-resultados/:id/vincular-expediente')
  vincularOcrAExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/vincular-expediente`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Crear relación documental vía API Gateway' })


  @ApiOperation({ summary: 'Listar versiones/archivos físicos de un documento lógico vía API Gateway' })
  @Get(':id/archivos')
  findArchivosByDocumentoId(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/archivos`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Agregar archivo existente como versión de un documento lógico vía API Gateway' })
  @Post(':documentoId/archivos/:archivoId/agregar-version')
  agregarArchivoComoVersion(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('documentoId') documentoId: string,
    @Param('archivoId') archivoId: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/${documentoId}/archivos/${archivoId}/agregar-version`,
      authorization,
      requestId,
      body,
    });
  }

  @Post('relaciones')
  createDocumentoRelacion(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: '/documentos/relaciones',
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Listar relaciones de documento vía API Gateway' })
  @Get(':id/relaciones')
  findDocumentoRelaciones(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/relaciones`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Crear alerta de documento vía API Gateway' })
  @Post(':id/alertas')
  createDocumentoAlerta(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'POST',
      path: `/documentos/${id}/alertas`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Listar alertas de documento vía API Gateway' })
  @Get(':id/alertas')
  findDocumentoAlertas(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/alertas`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Resolver alerta de documento vía API Gateway' })
  @Patch(':documentoId/alertas/:alertaId/resolver')
  resolverDocumentoAlerta(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('documentoId') documentoId: string,
    @Param('alertaId') alertaId: string,
    @Body() body: unknown,
  ) {
    return this.proxy({
      method: 'PATCH',
      path: `/documentos/${documentoId}/alertas/${alertaId}/resolver`,
      authorization,
      requestId,
      body,
    });
  }

  @Get('archivos/:archivoId/preview-url')
  async obtenerPreviewUrl(
    @Param('archivoId') archivoId: string,
    @Headers('authorization') authorization?: string,
    @Headers(REQUEST_ID_HEADER) requestId?: string,
  ) {
    return this.proxy({
      method: 'GET',
      path: `/documentos/archivos/${archivoId}/preview-url`,
      authorization,
      requestId,
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
