import {
  Controller,
  Body,
  Post,
  Patch,
  Get,
  Headers,
  Param,
  Query,
  UnauthorizedException,
  ForbiddenException,
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



  private getPerfilFromContext(payload: any): string | null {
    const perfil = payload?.perfil ?? payload?.perfilCodigo ?? null;

    if (typeof perfil !== 'string') {
      return null;
    }

    const normalized = perfil.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private assertMantenimientoExpedientesAccess(payload: any) {
    const perfil = this.getPerfilFromContext(payload);

    if (perfil !== 'admin' && perfil !== 'contabilidad') {
      throw new ForbiddenException(
        'Solo administración o contabilidad puede acceder al mantenimiento de expedientes',
      );
    }

    return perfil;
  }

  private getEmpresaFromContext(payload: any): string | null {
    const empresa = payload?.empresa ?? payload?.empresaCodigo ?? null;

    if (typeof empresa !== 'string') {
      return null;
    }

    const normalized = empresa.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private getClienteDestinoIdFromContext(payload: any): number | null {
    const clienteDestinoId = Number(payload?.clienteDestinoId ?? NaN);

    if (!Number.isFinite(clienteDestinoId) || clienteDestinoId <= 0) {
      return null;
    }

    return clienteDestinoId;
  }

  private buildWorkspaceScopedQuery(
    query: Record<string, string>,
    payload: any,
  ): Record<string, string> {
    const empresaContexto = this.getEmpresaFromContext(payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    const empresaSolicitada = query?.empresa?.trim().toUpperCase();

    if (empresaSolicitada && empresaSolicitada !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para consultar la empresa ${empresaSolicitada}`,
      );
    }

    return {
      ...query,
      empresa: empresaContexto,
    };
  }

  private buildWorkspaceScopedExpedienteBody(body: any, payload: any) {
    const empresaContexto = this.getEmpresaFromContext(payload);
    const clienteDestinoIdContexto = Number(payload?.clienteDestinoId ?? NaN);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!Number.isFinite(clienteDestinoIdContexto) || clienteDestinoIdContexto <= 0) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    const empresaSolicitada = String(body?.empresaCodigo ?? body?.empresa ?? '')
      .trim()
      .toUpperCase();

    if (empresaSolicitada && empresaSolicitada !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para crear expedientes en la empresa ${empresaSolicitada}`,
      );
    }

    const clienteDestinoIdSolicitado = Number(body?.clienteDestinoId ?? NaN);

    if (
      Number.isFinite(clienteDestinoIdSolicitado) &&
      clienteDestinoIdSolicitado > 0 &&
      clienteDestinoIdSolicitado !== clienteDestinoIdContexto
    ) {
      throw new ForbiddenException(
        'No tienes permiso para crear expedientes en otro cliente destino',
      );
    }

    return {
      ...(body ?? {}),
      empresaCodigo: empresaContexto,
      clienteDestinoId: clienteDestinoIdContexto,
    };
  }



  private buildMantenimientoExpedientesQuery(
    query: Record<string, string>,
    payload: any,
  ): Record<string, string> {
    this.assertMantenimientoExpedientesAccess(payload);

    const empresaContexto = this.getEmpresaFromContext(payload);
    const clienteDestinoIdContexto = this.getClienteDestinoIdFromContext(payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    const empresaSolicitada = query?.empresa?.trim().toUpperCase();
    const clienteDestinoSolicitado = Number(query?.clienteDestinoId ?? NaN);

    if (empresaSolicitada && empresaSolicitada !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para consultar la empresa ${empresaSolicitada}`,
      );
    }

    if (
      Number.isFinite(clienteDestinoSolicitado) &&
      clienteDestinoSolicitado > 0 &&
      clienteDestinoSolicitado !== clienteDestinoIdContexto
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar otro cliente destino',
      );
    }

    return {
      ...query,
      empresa: empresaContexto,
      clienteDestinoId: String(clienteDestinoIdContexto),
    };
  }

  private buildMantenimientoExpedienteBody(body: any, payload: any) {
    this.assertMantenimientoExpedientesAccess(payload);

    return this.buildWorkspaceScopedExpedienteBody(body, payload);
  }

  private async assertMantenimientoExpedienteAccess(params: {
    id: string;
    payload: any;
    authorization?: string;
    requestId?: string;
  }) {
    this.assertMantenimientoExpedientesAccess(params.payload);

    await this.assertExpedienteWorkspaceAccess({
      id: params.id,
      payload: params.payload,
      authorization: params.authorization,
      requestId: params.requestId,
    });
  }

  private getEmpresaFromExpediente(expediente: any): string | null {
    const empresa =
      expediente?.empresaCodigo ??
      expediente?.empresa_codigo ??
      expediente?.expediente?.empresaCodigo ??
      expediente?.expediente?.empresa_codigo ??
      null;

    if (typeof empresa !== 'string') {
      return null;
    }

    const normalized = empresa.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private getClienteDestinoIdFromExpediente(expediente: any): number | null {
    const clienteDestinoId = Number(
      expediente?.clienteDestinoId ??
        expediente?.cliente_destino_id ??
        expediente?.expediente?.clienteDestinoId ??
        expediente?.expediente?.cliente_destino_id ??
        NaN,
    );

    if (!Number.isFinite(clienteDestinoId) || clienteDestinoId <= 0) {
      return null;
    }

    return clienteDestinoId;
  }

  private async getExpedienteForScopeCheck(
    id: string,
    authorization?: string,
    requestId?: string,
  ) {
    const result = await axios.get(`${this.getBaseUrl()}/expedientes/${id}`, {
      headers: this.buildForwardHeaders(authorization, requestId),
    });

    return this.unwrap(result);
  }

  private async assertExpedienteWorkspaceAccess(params: {
    id: string;
    payload: any;
    authorization?: string;
    requestId?: string;
  }) {
    const empresaContexto = this.getEmpresaFromContext(params.payload);
    const clienteDestinoIdContexto = this.getClienteDestinoIdFromContext(params.payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    const expediente = await this.getExpedienteForScopeCheck(
      params.id,
      params.authorization,
      params.requestId,
    );
    const empresaExpediente = this.getEmpresaFromExpediente(expediente);
    const clienteDestinoIdExpediente = this.getClienteDestinoIdFromExpediente(expediente);

    if (!empresaExpediente) {
      throw new ForbiddenException(
        'No se pudo validar la empresa del expediente solicitado',
      );
    }

    if (!clienteDestinoIdExpediente) {
      throw new ForbiddenException(
        'No se pudo validar el cliente destino del expediente solicitado',
      );
    }

    if (empresaExpediente !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para consultar expedientes de la empresa ${empresaExpediente}`,
      );
    }

    if (clienteDestinoIdExpediente !== clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'No tienes permiso para consultar expedientes de otro cliente destino',
      );
    }

    return expediente;
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
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    const result = await axios.get(`${this.getBaseUrl()}/expedientes`, {
      params: scopedQuery,
      headers: this.buildForwardHeaders(authorization, requestId),
    });

    return this.unwrap(result);
  }


  @ApiOperation({ summary: 'Crear expediente vía API Gateway' })
  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedBody = this.buildWorkspaceScopedExpedienteBody(body, contexto);

    return this.proxy({
      method: 'POST',
      path: '/expedientes',
      authorization,
      requestId,
      body: scopedBody,
    });
  }


  @ApiOperation({ summary: 'Buscar expedientes vía API Gateway' })
  @Get('buscar')
  async buscarExpedientes(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/buscar',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }

  @ApiOperation({ summary: 'Buscar expediente por código vía API Gateway' })
  @Get('buscar-por-codigo')
  async findByCodigoExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/buscar-por-codigo',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }


  @ApiOperation({ summary: 'Mantenimiento contable de expedientes - listar' })
  @Get('mantenimiento')
  async findMantenimiento(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildMantenimientoExpedientesQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/mantenimiento',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }

  @ApiOperation({ summary: 'Mantenimiento contable de expedientes - detalle' })
  @Get('mantenimiento/:id')
  async findMantenimientoById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertMantenimientoExpedienteAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'GET',
      path: `/expedientes/mantenimiento/${id}`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Mantenimiento contable de expedientes - crear' })
  @Post('mantenimiento')
  async createMantenimiento(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedBody = this.buildMantenimientoExpedienteBody(body, contexto);

    return this.proxy({
      method: 'POST',
      path: '/expedientes/mantenimiento',
      authorization,
      requestId,
      body: scopedBody,
    });
  }

  @ApiOperation({ summary: 'Mantenimiento contable de expedientes - actualizar' })
  @Patch('mantenimiento/:id')
  async updateMantenimiento(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertMantenimientoExpedienteAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'PATCH',
      path: `/expedientes/mantenimiento/${id}`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Mantenimiento contable de expedientes - cambiar estado' })
  @Patch('mantenimiento/:id/estado')
  async updateMantenimientoEstado(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertMantenimientoExpedienteAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'PATCH',
      path: `/expedientes/mantenimiento/${id}/estado`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Resumen de expediente vía API Gateway' })
  @Get(':id/resumen')
  async getResumen(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/resumen`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Timeline de expediente vía API Gateway' })
  @Get(':id/timeline')
  async getTimeline(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/timeline`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Estado documental de expediente vía API Gateway' })
  @Get(':id/estado-documental')
  async getEstadoDocumental(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/estado-documental`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Listar documentos de expediente vía API Gateway' })
  @Get(':id/documentos')
  async findDocumentos(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'GET',
      path: `/expedientes/${id}/documentos`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Agregar documento a expediente vía API Gateway' })
  @Post(':id/documentos')
  async addDocumento(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });

    return this.proxy({
      method: 'POST',
      path: `/expedientes/${id}/documentos`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Bandeja contable vía API Gateway' })
  @Get('bandeja-contable')
  async getBandejaContable(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/bandeja-contable',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }

  @ApiOperation({ summary: 'Revisión contable vía API Gateway' })
  @Get('revision-contable')
  async getRevisionContable(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/revision-contable',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }

  @ApiOperation({ summary: 'Dashboard contable vía API Gateway' })
  @Get('dashboard-contable')
  async getDashboardContable(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/expedientes/dashboard-contable',
      authorization,
      requestId,
      query: scopedQuery,
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
    const contexto = await this.validateAuthorization(authorization);

    return this.assertExpedienteWorkspaceAccess({
      id,
      payload: contexto,
      authorization,
      requestId,
    });
  }
}
