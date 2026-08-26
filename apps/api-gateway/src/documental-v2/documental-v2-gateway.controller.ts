import {
  Controller,
  ForbiddenException,
  Body,
  Post,
  Get,
  Patch,
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
      ...(payload?.sessionContextId
        ? { 'x-session-context-id': String(payload.sessionContextId) }
        : {}),
      ...(payload?.sistema
        ? { 'x-sistema-codigo': String(payload.sistema) }
        : {}),
      ...(payload?.perfil
        ? { 'x-perfil-codigo': String(payload.perfil) }
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

  private getWorkspaceActions(payload: any): string[] {
    const candidates = [
      payload?.permisos?.actions,
      payload?.permissions?.actions,
      payload?.actions,
      Array.isArray(payload?.permisos) ? payload.permisos : null,
      Array.isArray(payload?.permissions) ? payload.permissions : null,
    ];

    return candidates
      .filter(Array.isArray)
      .flat()
      .map((action) => String(action ?? '').trim())
      .filter((action) => action.length > 0);
  }

  private assertPuedeMaterializarContexto(payload: any) {
    const actions = this.getWorkspaceActions(payload);

    if (!actions.includes('documentos.vincular_expediente')) {
      throw new ForbiddenException(
        'No tienes permiso para materializar Contexto Operativo',
      );
    }
  }

  private assertPuedeAnularContenedorOperativo(payload: any) {
    const actions = this.getWorkspaceActions(payload);

    if (!actions.includes('documental_v2.contenedores.anular')) {
      throw new ForbiddenException(
        'No tienes permiso para anular Contenedores Operativos V2',
      );
    }
  }

  private assertPuedeVerContenedores(payload: any) {
    const actions = this.getWorkspaceActions(payload);

    if (!actions.includes('documental_v2.contenedores.ver')) {
      throw new ForbiddenException(
        'No tienes permiso para consultar Contenedores Operativos V2',
      );
    }
  }

  private assertPuedeCrearContenedores(payload: any) {
    const actions = this.getWorkspaceActions(payload);

    if (!actions.includes('documental_v2.contenedores.crear')) {
      throw new ForbiddenException(
        'No tienes permiso para crear Contenedores Operativos V2',
      );
    }
  }

  private assertPuedeEditarContenedores(payload: any) {
    const actions = this.getWorkspaceActions(payload);

    if (!actions.includes('documental_v2.contenedores.editar')) {
      throw new ForbiddenException(
        'No tienes permiso para editar Contenedores Operativos V2',
      );
    }
  }

  private assertContenedorPerteneceAlContexto(
    payload: any,
    contenedor: any,
  ) {
    const empresaContexto = this.getEmpresaFromContext(payload);
    const clienteDestinoIdContexto =
      this.getClienteDestinoIdFromContext(payload);

    const empresaContenedor = String(
      contenedor?.empresaCodigo ?? '',
    )
      .trim()
      .toUpperCase();

    const clienteDestinoIdContenedor = Number(
      contenedor?.clienteDestinoId ?? NaN,
    );

    if (!empresaContexto) {
      throw new ForbiddenException(
        'El token no tiene empresa de workspace válida',
      );
    }

    if (!clienteDestinoIdContexto) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    if (empresaContenedor !== empresaContexto) {
      throw new ForbiddenException(
        'No tienes permiso para operar este Contenedor Operativo',
      );
    }

    if (
      !Number.isFinite(clienteDestinoIdContenedor) ||
      clienteDestinoIdContenedor !== clienteDestinoIdContexto
    ) {
      throw new ForbiddenException(
        'No tienes permiso para operar un Contenedor Operativo de otro cliente destino',
      );
    }
  }

  private async obtenerContenedorOperativoInterno(
    authorization: string | undefined,
    requestId: string | undefined,
    contexto: any,
    id: string,
  ) {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/contenedores/${id}`,
        {
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      const contenedor = this.unwrap(response);
      this.assertContenedorPerteneceAlContexto(contexto, contenedor);

      return contenedor;
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
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

  @ApiOperation({
    summary: 'Listar documentos candidatos para asociar a Grupo de Factura V2',
  })
  @Get('documentos-candidatos-grupo')
  async listarDocumentosCandidatosGrupo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/documentos-candidatos-grupo`,
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
    summary: 'Listar documentos de un Grupo de Factura V2',
  })
  @ApiParam({ name: 'grupoFacturaId', example: 1 })
  @Get('grupos-factura/:grupoFacturaId/documentos')
  async listarDocumentosPorGrupoFactura(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('grupoFacturaId') grupoFacturaId: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/grupos-factura/${grupoFacturaId}/documentos`,
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
    summary: 'Asociar documento existente a Grupo de Factura V2',
  })
  @Post('grupos-factura/documentos/asociar')
  async asociarDocumentoGrupoFactura(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const puedeAutorizarExcepcion = this.getWorkspaceActions(contexto).includes(
      'documental_v2.finanzas.correspondencia.autorizar_excepcion',
    );

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/grupos-factura/documentos/asociar`,
        body,
        {
          headers: {
            ...this.buildDocumentosForwardHeaders(
              authorization,
              requestId,
              contexto,
            ),
            'x-finanzas-correspondencia-autorizar-excepcion': String(
              puedeAutorizarExcepcion,
            ),
          },
        },
      );

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }


  @ApiOperation({
    summary: 'Consultar trazabilidad canónica V2 por Contenedor Operativo',
  })
  @ApiParam({ name: 'contenedorOperativoId', example: 2 })
  @Get('trazabilidad/contenedores/:contenedorOperativoId')
  async consultarTrazabilidadPorContenedor(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('contenedorOperativoId') contenedorOperativoId: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/trazabilidad/contenedores/${contenedorOperativoId}`,
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
    summary: 'Materializar Contexto Operativo V2 desde Expediente V1',
  })
  @ApiParam({ name: 'expedienteId', example: 16 })
  @Post('workspace/expedientes-v1/:expedienteId/materializar-contenedor')
  async materializarContextoOperativoDesdeExpedienteV1(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('expedienteId') expedienteId: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeMaterializarContexto(contexto);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/workspace/expedientes-v1/${expedienteId}/materializar-contenedor`,
        {},
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
    summary: 'Listar Contenedores Operativos V2',
  })
  @Get('contenedores-operativos')
  async listarContenedoresOperativos(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeVerContenedores(contexto);

    const empresaCodigo = this.getEmpresaFromContext(contexto);
    const clienteDestinoId =
      this.getClienteDestinoIdFromContext(contexto);

    if (!empresaCodigo || !clienteDestinoId) {
      throw new ForbiddenException(
        'El token no contiene un contexto de workspace válido',
      );
    }

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/contenedores`,
        {
          params: {
            ...query,
            empresaCodigo,
            clienteDestinoId,
          },
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
    summary: 'Buscar Contenedor Operativo V2 por clave funcional',
  })
  @Get('contenedores-operativos/buscar')
  async buscarContenedorOperativoPorClave(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeVerContenedores(contexto);

    const empresaCodigo = this.getEmpresaFromContext(contexto);

    if (!empresaCodigo) {
      throw new ForbiddenException(
        'El token no tiene empresa de workspace válida',
      );
    }

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/contenedores/buscar`,
        {
          params: {
            ...query,
            empresaCodigo,
          },
          headers: this.buildDocumentosForwardHeaders(
            authorization,
            requestId,
            contexto,
          ),
        },
      );

      const contenedor = this.unwrap(response);

      if (contenedor) {
        this.assertContenedorPerteneceAlContexto(
          contexto,
          contenedor,
        );
      }

      return contenedor;
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  @ApiOperation({
    summary: 'Obtener Contenedor Operativo V2 por ID',
  })
  @ApiParam({ name: 'id', example: 1 })
  @Get('contenedores-operativos/:id')
  async obtenerContenedorOperativo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeVerContenedores(contexto);

    return this.obtenerContenedorOperativoInterno(
      authorization,
      requestId,
      contexto,
      id,
    );
  }

  @ApiOperation({
    summary: 'Crear Contenedor Operativo V2',
  })
  @Post('contenedores-operativos')
  async crearContenedorOperativo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeCrearContenedores(contexto);

    const empresaCodigo = this.getEmpresaFromContext(contexto);
    const clienteDestinoId =
      this.getClienteDestinoIdFromContext(contexto);

    if (!empresaCodigo || !clienteDestinoId) {
      throw new ForbiddenException(
        'El token no contiene un contexto de workspace válido',
      );
    }

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/contenedores`,
        {
          ...body,
          empresaCodigo,
          clienteDestinoId,
        },
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
    summary: 'Actualizar Contenedor Operativo V2',
  })
  @ApiParam({ name: 'id', example: 1 })
  @Patch('contenedores-operativos/:id')
  async actualizarContenedorOperativo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeEditarContenedores(contexto);

    const contenedor =
      await this.obtenerContenedorOperativoInterno(
        authorization,
        requestId,
        contexto,
        id,
      );

    if (String(contenedor?.estado ?? '').toLowerCase() === 'anulado') {
      throw new HttpException(
        {
          message:
            'No se puede editar un Contenedor Operativo anulado.',
          code: 'CONTENEDOR_OPERATIVO_ANULADO_NO_EDITABLE',
          details: {
            contenedorOperativoId: Number(id),
            estadoActual: contenedor?.estado ?? null,
          },
        },
        409,
      );
    }

    try {
      const response = await axios.patch(
        `${this.getBaseUrl()}/documental-v2/contenedores/${id}`,
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
    summary: 'Anular lógicamente un Contenedor Operativo V2',
  })
  @ApiParam({ name: 'id', example: 4 })
  @Post('contenedores-operativos/:id/anular')
  async anularContenedorOperativo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertPuedeAnularContenedorOperativo(contexto);

    const motivo = String(body?.motivo ?? '').trim();

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/contenedores/${id}/anular`,
        { motivo },
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
    summary: 'Evaluar correspondencia entre Factura y sustento de pago',
  })
  @Get('finanzas/correspondencia/evaluar')
  async evaluarCorrespondenciaPagoFactura(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query('facturaDocumentoId') facturaDocumentoId: string,
    @Query('pagoDocumentoId') pagoDocumentoId?: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/documental-v2/finanzas/correspondencia/evaluar`,
        {
          params: {
            facturaDocumentoId,
            ...(pagoDocumentoId ? { pagoDocumentoId } : {}),
          },
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
    summary: 'Anular Documento Operativo Principal V2',
  })
  @ApiParam({ name: 'id', example: 1 })
  @Post('documentos-operativos-principales/:id/anular')
  async anularDocumentoOperativoPrincipal(
    @Param('id') id: string,
    @Body() body: any = {},
    @Headers('authorization') authorization?: string,
    @Headers(REQUEST_ID_HEADER) requestId?: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/documentos-operativos-principales/${Number(id)}/anular`,
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
    summary: 'Anular Grupo de Factura V2',
  })
  @ApiParam({ name: 'id', example: 1 })
  @Post('grupos-factura/:id/anular')
  async anularGrupoFactura(
    @Param('id') id: string,
    @Body() body: any = {},
    @Headers('authorization') authorization?: string,
    @Headers(REQUEST_ID_HEADER) requestId?: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/grupos-factura/${Number(id)}/anular`,
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
    summary: 'Anular vínculo de documento con Grupo de Factura V2',
  })
  @ApiParam({ name: 'id', example: 1 })
  @Post('grupo-factura-documentos/:id/anular')
  async anularGrupoFacturaDocumento(
    @Param('id') id: string,
    @Body() body: any = {},
    @Headers('authorization') authorization?: string,
    @Headers(REQUEST_ID_HEADER) requestId?: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);

    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/documental-v2/grupo-factura-documentos/${Number(id)}/anular`,
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
