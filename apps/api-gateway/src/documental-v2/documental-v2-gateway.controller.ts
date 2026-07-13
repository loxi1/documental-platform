import {
  Controller,
  ForbiddenException,
  Body,
  Post,
  Get,
  Query,
  Headers,
  HttpException,
  Inject,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { NatsSubjects, REQUEST_ID_HEADER } from '@documental/shared';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

import { NATS_CLIENT } from '../nats/nats-client.provider';

@ApiTags('documental-v2')
@ApiBearerAuth()
@Controller('documental-v2')
export class DocumentalV2GatewayController {
  constructor(
    private readonly config: ConfigService,
    @Inject(NATS_CLIENT)
    private readonly nats: ClientProxy,
  ) {}

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
      ...(requestId ? { 'x-correlation-id': requestId } : {}),
    };
  }

  private buildDocumentosForwardHeaders(
    authorization: string | undefined,
    requestId: string | undefined,
    payload: any,
  ) {
    const empresaCodigo = this.getEmpresaFromContext(payload);
    const clienteDestinoId = this.getClienteDestinoIdFromContext(payload);

    return {
      ...this.buildForwardHeaders(authorization, requestId),
      ...(payload?.sub ? { 'x-user-id': String(payload.sub) } : {}),
      ...(payload?.id ? { 'x-user-id': String(payload.id) } : {}),
      ...(payload?.email ? { 'x-user-email': String(payload.email) } : {}),
      ...(payload?.workspaceId
        ? { 'x-workspace-id': String(payload.workspaceId) }
        : {}),
      ...(empresaCodigo ? { 'x-empresa-codigo': empresaCodigo } : {}),
      ...(clienteDestinoId
        ? { 'x-cliente-destino-id': String(clienteDestinoId) }
        : {}),
    };
  }

  private assertEmpresaQueryPermitida(payload: any, empresaCodigo?: string) {
    const empresaContexto = this.getEmpresaFromContext(payload);
    const empresaSolicitada = String(empresaCodigo ?? '')
      .trim()
      .toUpperCase();

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!empresaSolicitada) {
      throw new ForbiddenException('Debe indicar empresaCodigo');
    }

    if (empresaSolicitada !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para operar documentos de la empresa ${empresaSolicitada}`,
      );
    }
  }

  @ApiOperation({
    summary: 'Listar documentos candidatos para Documento Operativo Principal V2',
  })
  @Get('documentos-candidatos-principal')
  async listarCandidatosPrincipal(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertEmpresaQueryPermitida(contexto, query?.empresaCodigo);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/documentos-candidatos-principal`,
        {
          params: query,
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  @ApiOperation({
    summary: 'Asociar Documento Operativo Principal V2',
  })
  @Post('documentos-operativos-principales/asociar')
  async asociarDocumentoPrincipal(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/documentos-operativos-principales/asociar`,
        body,
        {
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }


  @ApiOperation({
    summary: 'Listar facturas candidatas para crear Grupo de Factura V2',
  })
  @Get('facturas-candidatas')
  async listarFacturasCandidatas(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/facturas-candidatas`,
        {
          params: query,
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  @ApiOperation({
    summary: 'Crear o asociar Grupo de Factura V2 desde Factura fundadora',
  })
  @Post('grupos-factura/asociar')
  async asociarGrupoFactura(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/grupos-factura/asociar`,
        body,
        {
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  private unwrap(response: any) {
    return response?.data?.data ?? response?.data;
  }

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

  private getWorkspaceContenedor(workspace: any) {
    return (
      workspace?.contenedorOperativo?.vista ??
      workspace?.compatibilidad?.contenedorOperativo ??
      null
    );
  }

  private assertWorkspacePermitido(payload: any, workspace: any) {
    const empresaContexto = this.getEmpresaFromContext(payload);
    const clienteDestinoIdContexto = this.getClienteDestinoIdFromContext(payload);
    const contenedor = this.getWorkspaceContenedor(workspace);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    const empresaWorkspace = String(contenedor?.empresaCodigo ?? '')
      .trim()
      .toUpperCase();
    const clienteDestinoIdWorkspace = Number(contenedor?.clienteDestinoId ?? NaN);

    if (!empresaWorkspace) {
      throw new ForbiddenException(
        'No se pudo determinar la empresa del Workspace Documental V2',
      );
    }

    if (empresaWorkspace !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para acceder a Workspace Documental V2 de la empresa ${empresaWorkspace}`,
      );
    }

    if (
      !Number.isFinite(clienteDestinoIdWorkspace) ||
      clienteDestinoIdWorkspace <= 0
    ) {
      throw new ForbiddenException(
        'No se pudo determinar el cliente destino del Workspace Documental V2',
      );
    }

    if (clienteDestinoIdWorkspace !== clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a Workspace Documental V2 de otro cliente destino',
      );
    }
  }

  private throwUpstreamHttpException(error: any): never {
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

  @ApiOperation({
    summary:
      'Obtener Workspace Documental V2 interno desde Expediente V1 vía API Gateway',
  })
  @ApiParam({ name: 'expedienteId', example: 41 })
  @Get('workspace/expedientes-v1/:expedienteId')
  async construirWorkspaceDesdeExpedienteV1(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('expedienteId') expedienteId: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/workspace/expedientes-v1/${expedienteId}`,
        {
          headers: this.buildForwardHeaders(authorization, requestId),
        },
      );

      const workspace = this.unwrap(response);
      this.assertWorkspacePermitido(contexto, workspace);

      return workspace;
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }
}
