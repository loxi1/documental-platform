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
  Res,
  UnauthorizedException,
  ForbiddenException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import axios, { Method } from 'axios';
import FormData from 'form-data';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { NatsSubjects, REQUEST_ID_HEADER } from '@documental/shared';
import type { Response } from 'express';

import { SECURE_UPLOAD } from './carga-segura.contract';
import {
  SecureUploadFile,
  validateIdempotencyKey,
  validateSecureUploadBody,
  validateSecureUploadFile,
} from './carga-segura.validation';
import {
  mapSecureUploadSuccess,
  throwSecureUploadError,
} from './carga-segura.mapper';

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


  private getEmpresaFromContext(payload: any): string | null {
    const empresa = payload?.empresa ?? payload?.empresaCodigo ?? null;

    if (typeof empresa !== 'string') {
      return null;
    }

    const normalized = empresa.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private assertEmpresaPermitida(
    payload: any,
    empresaRecurso?: string | null,
    label = 'recurso',
  ) {
    const empresaContexto = this.getEmpresaFromContext(payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    const empresa = String(empresaRecurso ?? '').trim().toUpperCase();

    if (!empresa) {
      throw new ForbiddenException(`No se pudo determinar la empresa del ${label}`);
    }

    if (empresa !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para acceder a ${label} de la empresa ${empresa}`,
      );
    }

    return empresaContexto;
  }

  private buildWorkspaceScopedDocumentosQuery(
    query: Record<string, string>,
    payload: any,
  ): Record<string, string> {
    const empresaContexto = this.getEmpresaFromContext(payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    const clienteSolicitado = String(query?.cliente ?? query?.empresa ?? '')
      .trim()
      .toUpperCase();

    if (clienteSolicitado && clienteSolicitado !== empresaContexto) {
      throw new ForbiddenException(
        `No tienes permiso para consultar documentos de la empresa ${clienteSolicitado}`,
      );
    }

    return {
      ...query,
      cliente: empresaContexto,
    };
  }

  private async fetchDocumentoScope(documentoId: string, requestId?: string) {
    const response = await axios.get(`${this.getBaseUrl()}/documentos/${documentoId}`, {
      headers: this.buildForwardHeaders(undefined, requestId),
    });

    const documento = this.unwrap(response);

    return {
      documentoId,
      empresa: documento?.cliente_abreviatura ?? documento?.clienteAbreviatura ?? null,
      documento,
    };
  }

  private async fetchArchivoScope(archivoId: string, requestId?: string) {
    const response = await axios.get(
      `${this.getBaseUrl()}/documentos/archivos/${archivoId}/scope`,
      {
        headers: this.buildForwardHeaders(undefined, requestId),
      },
    );

    return this.unwrap(response);
  }

  private async fetchOcrScope(ocrResultadoId: string, requestId?: string) {
    const response = await axios.get(
      `${this.getBaseUrl()}/documentos/ocr-resultados/${ocrResultadoId}`,
      {
        headers: this.buildForwardHeaders(undefined, requestId),
      },
    );

    const ocr = this.unwrap(response);

    return {
      ocrResultadoId,
      empresa: ocr?.cliente_abreviatura ?? ocr?.clienteAbreviatura ?? null,
      ocr,
    };
  }


  private getClienteDestinoIdFromContext(payload: any): number | null {
    const clienteDestinoId = Number(payload?.clienteDestinoId ?? NaN);
    return Number.isFinite(clienteDestinoId) && clienteDestinoId > 0
      ? clienteDestinoId
      : null;
  }

  private async fetchExpedienteScope(expedienteId: string, requestId?: string) {
    const response = await axios.get(`${this.getBaseUrl()}/expedientes/${expedienteId}`, {
      headers: this.buildForwardHeaders(undefined, requestId),
    });

    const expediente = this.unwrap(response);

    return {
      expedienteId,
      empresa:
        expediente?.empresa_codigo ??
        expediente?.empresaCodigo ??
        expediente?.cliente_abreviatura ??
        expediente?.clienteAbreviatura ??
        null,
      expediente,
    };
  }

  private buildWorkspaceScopedOcrExpedienteBody(body: any, payload: any) {
    const empresaContexto = this.getEmpresaFromContext(payload);
    const clienteDestinoIdContexto = this.getClienteDestinoIdFromContext(payload);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

    if (!clienteDestinoIdContexto) {
      throw new ForbiddenException('El token no tiene cliente destino de workspace válido');
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

  private async assertDocumentoPermitido(
    documentoId: string,
    payload: any,
    requestId?: string,
  ) {
    const scope = await this.fetchDocumentoScope(documentoId, requestId);
    return this.assertEmpresaPermitida(payload, scope.empresa, `documento ${documentoId}`);
  }

  private async assertArchivoPermitido(
    archivoId: string,
    payload: any,
    requestId?: string,
  ) {
    const scope = await this.fetchArchivoScope(archivoId, requestId);
    return this.assertEmpresaPermitida(payload, scope?.clienteAbreviatura ?? scope?.empresa, `archivo ${archivoId}`);
  }


  private async assertExpedientePermitido(
    expedienteId: string | number | undefined | null,
    payload: any,
    requestId?: string,
  ) {
    if (expedienteId === undefined || expedienteId === null || String(expedienteId).trim() === '') {
      throw new ForbiddenException('El expediente es obligatorio para validar el workspace');
    }

    const scope = await this.fetchExpedienteScope(String(expedienteId), requestId);
    return this.assertEmpresaPermitida(payload, scope.empresa, `expediente ${expedienteId}`);
  }

  private async assertOcrPermitido(
    ocrResultadoId: string,
    payload: any,
    requestId?: string,
  ) {
    const scope = await this.fetchOcrScope(ocrResultadoId, requestId);
    return this.assertEmpresaPermitida(payload, scope.empresa, `resultado OCR ${ocrResultadoId}`);
  }



  private getActionsFromContext(payload: any): string[] {
    const actions = payload?.permisos?.actions;

    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .filter((action) => typeof action === 'string')
      .map((action) => action.trim())
      .filter(Boolean);
  }

  private assertAnyActionPermitida(
    payload: any,
    actionsPermitidas: string[],
    label: string,
  ) {
    const actions = this.getActionsFromContext(payload);
    const tienePermiso = actionsPermitidas.some((action) => actions.includes(action));

    if (!tienePermiso) {
      throw new ForbiddenException(
        `No tienes permiso para ${label}. Acción requerida: ${actionsPermitidas.join(' o ')}`,
      );
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

  private buildAuditForwardHeaders(
    authorization: string | undefined,
    requestId: string | undefined,
    contexto: any,
  ): Record<string, string> {
    const empresaCodigo = this.getEmpresaFromContext(contexto);
    const clienteDestinoId = Number(contexto?.clienteDestinoId ?? NaN);

    return {
      ...this.buildForwardHeaders(authorization, requestId),
      ...(contexto?.sub ? { 'x-user-id': String(contexto.sub) } : {}),
      ...(contexto?.email ? { 'x-user-email': String(contexto.email) } : {}),
      ...(contexto?.workspaceId
        ? { 'x-workspace-id': String(contexto.workspaceId) }
        : {}),
      ...(empresaCodigo ? { 'x-empresa-codigo': empresaCodigo } : {}),
      ...(Number.isFinite(clienteDestinoId) && clienteDestinoId > 0
        ? { 'x-cliente-destino-id': String(clienteDestinoId) }
        : {}),
      ...(requestId ? { 'x-correlation-id': requestId } : {}),
    };
  }

  private unwrap(response: any) {
    return response?.data?.data ?? response?.data;
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

  private asUnknownRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private readContextString(
    source: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = source[key];

    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private getSistemaFromContext(payload: unknown): string | null {
    const context = this.asUnknownRecord(payload);

    if (!context) {
      return null;
    }

    const sistema = context.sistema;
    const sistemaRecord = this.asUnknownRecord(sistema);

    const direct =
      this.readContextString(context, 'sistemaCodigo') ??
      (typeof sistema === 'string'
        ? sistema
        : sistemaRecord
          ? this.readContextString(sistemaRecord, 'codigo')
          : null);

    const normalized = direct?.trim().toUpperCase() ?? '';
    return normalized || null;
  }

  private assertSecureUploadContext(contexto: unknown) {
    if (this.getSistemaFromContext(contexto) !== SECURE_UPLOAD.system) {
      throw new ForbiddenException(
        'La carga documental segura requiere el sistema DOCUMENTAL',
      );
    }

    this.assertAnyActionPermitida(
      contexto,
      [SECURE_UPLOAD.permission],
      'realizar carga documental segura',
    );

    const context = this.asUnknownRecord(contexto);

    if (!context) {
      throw new ForbiddenException('El token no contiene un contexto válido');
    }

    const empresaCodigo = this.getEmpresaFromContext(contexto);
    const clienteDestinoId = this.getClienteDestinoIdFromContext(contexto);

    const workspaceValue = context.workspaceId;
    const workspaceId =
      typeof workspaceValue === 'number'
        ? workspaceValue
        : typeof workspaceValue === 'string'
          ? Number(workspaceValue)
          : Number.NaN;

    const actorValue = context.sub;
    const actorId =
      typeof actorValue === 'string' || typeof actorValue === 'number'
        ? String(actorValue)
        : '';

    if (!empresaCodigo) {
      throw new ForbiddenException(
        'El token no tiene empresa de workspace válida',
      );
    }

    if (!clienteDestinoId) {
      throw new ForbiddenException(
        'El token no tiene cliente destino de workspace válido',
      );
    }

    if (!Number.isSafeInteger(workspaceId) || workspaceId <= 0) {
      throw new ForbiddenException('El token no tiene workspace válido');
    }

    if (!actorId.trim()) {
      throw new ForbiddenException('El token no tiene actor válido');
    }

    return {
      workspaceId,
      empresaCodigo,
      clienteDestinoId,
      actorId,
    };
  }

  private getClienteDestinoIdFromExpediente(
    expediente: unknown,
  ): number | null {
    const source = this.asUnknownRecord(expediente);

    if (!source) {
      return null;
    }

    const nested = this.asUnknownRecord(source.expediente);

    const value =
      source.cliente_destino_id ??
      source.clienteDestinoId ??
      nested?.cliente_destino_id ??
      nested?.clienteDestinoId;

    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private async assertSecureUploadExpedienteScope(
    expedienteId: number,
    contexto: unknown,
    requestId?: string,
  ) {
    const secureContext = this.assertSecureUploadContext(contexto);

    const rawScope: unknown = await this.fetchExpedienteScope(
      String(expedienteId),
      requestId,
    );

    const scope = this.asUnknownRecord(rawScope);

    if (!scope) {
      throw new ForbiddenException(
        'No se pudo determinar el scope del expediente',
      );
    }

    const empresaValue = scope.empresa;
    const empresa = typeof empresaValue === 'string' ? empresaValue : null;

    this.assertEmpresaPermitida(
      contexto,
      empresa,
      `expediente ${expedienteId}`,
    );

    const expedienteClienteDestinoId = this.getClienteDestinoIdFromExpediente(
      scope.expediente,
    );

    if (
      !expedienteClienteDestinoId ||
      expedienteClienteDestinoId !== secureContext.clienteDestinoId
    ) {
      throw new ForbiddenException(
        'El expediente no pertenece al cliente destino del contexto activo',
      );
    }

    return secureContext;
  }

  private async proxy(params: {
    method: Method;
    path: string;
    authorization?: string;
    requestId?: string;
    query?: Record<string, any>;
    body?: unknown;
    headers?: Record<string, string>;
  }) {
    await this.validateAuthorization(params.authorization);

    try {
      const response = await axios.request({
        method: params.method,
        url: `${this.getBaseUrl()}${params.path}`,
        params: params.query,
        data: params.body,
        headers: {
          ...(params.headers ?? {}),
          ...this.buildForwardHeaders(
            params.authorization,
            params.requestId,
          ),
        },
      });

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  @ApiOperation({ summary: 'Listar documentos vía API Gateway' })
  @Get()
  async findAll(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedDocumentosQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/documentos',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }


  @ApiOperation({ summary: 'Prevalidar carga guiada sin persistencia definitiva vía API Gateway' })
  @ApiConsumes('multipart/form-data')
  @Post('carga-guiada/prevalidar')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'file', maxCount: 1 },
    { name: 'archivo', maxCount: 1 },
  ]))
  async prevalidarCargaGuiada(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @UploadedFiles() files: Record<string, any[]>,
    @Body() body: Record<string, any>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.subir'], 'prevalidar carga de documentos');
    const empresaContexto = this.getEmpresaFromContext(contexto);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

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

    for (const [key, value] of Object.entries(body ?? {})) {
      if (value === undefined || value === null) continue;
      if (['cliente', 'clienteAbreviatura', 'empresa', 'empresaCodigo'].includes(key)) {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => form.append(key, String(item)));
      } else {
        form.append(key, String(value));
      }
    }

    form.append('cliente', empresaContexto);
    form.append('clienteAbreviatura', empresaContexto);
    form.append('empresa', empresaContexto);
    form.append('empresaCodigo', empresaContexto);

    try {
      const response = await axios.request({
        method: 'POST',
        url: `${this.getBaseUrl()}/documentos/carga-guiada/prevalidar`,
        data: form,
        headers: {
          ...this.buildForwardHeaders(authorization, requestId),
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      return this.unwrap(response);
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
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
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.subir'], 'subir documentos');
    const empresaContexto = this.getEmpresaFromContext(contexto);

    if (!empresaContexto) {
      throw new ForbiddenException('El token no tiene empresa de workspace válida');
    }

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
      if (['cliente', 'clienteAbreviatura', 'empresa', 'empresaCodigo'].includes(key)) {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => form.append(key, String(item)));
      } else {
        form.append(key, String(value));
      }
    }

    form.append('cliente', empresaContexto);
    form.append('clienteAbreviatura', empresaContexto);
    form.append('empresa', empresaContexto);
    form.append('empresaCodigo', empresaContexto);

    try {
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
    } catch (error: any) {
      this.throwUpstreamHttpException(error);
    }
  }

  @ApiOperation({ summary: 'Carga documental segura vía API Gateway' })
  @ApiConsumes('multipart/form-data')
  @Post('carga-segura')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        fileSize: SECURE_UPLOAD.fileSizeBytes,
        files: 1,
        fields: SECURE_UPLOAD.maxFields,
        parts: SECURE_UPLOAD.maxParts,
        fieldSize: SECURE_UPLOAD.maxFieldSizeBytes,
      },
    }),
  )
  async cargaSegura(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Headers('idempotency-key')
    idempotencyKeyHeader: string | string[] | undefined,
    @UploadedFiles() files: SecureUploadFile[],
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const contexto: unknown = await this.validateAuthorization(authorization);
    const validatedBody = validateSecureUploadBody(body ?? {});
    const idempotencyKey = validateIdempotencyKey(idempotencyKeyHeader);

    if (!Array.isArray(files) || files.length !== 1) {
      throw new HttpException(
        {
          code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
          message: 'Debe enviarse exactamente un archivo',
          details: null,
        },
        422,
      );
    }

    const file = validateSecureUploadFile(files[0]);
    const secureContext = await this.assertSecureUploadExpedienteScope(
      validatedBody.expedienteId,
      contexto,
      requestId,
    );

    const form = new FormData();

    form.append('archivo', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });
    form.append('expedienteId', String(validatedBody.expedienteId));
    form.append('tipoDocumental', validatedBody.tipoDocumental);

    if (validatedBody.tipoRelacion) {
      form.append('tipoRelacion', validatedBody.tipoRelacion);
    }

    form.append('esPrincipal', String(validatedBody.esPrincipal));
    form.append('canalIngreso', validatedBody.canalIngreso);

    if (validatedBody.metadata) {
      form.append('metadata', JSON.stringify(validatedBody.metadata));
    }

    try {
      const upstreamResponse = await axios.request<unknown>({
        method: 'POST',
        url: `${this.getBaseUrl()}/documentos/carga-segura`,
        data: form,
        headers: {
          ...form.getHeaders(),
          ...(authorization ? { authorization } : {}),
          'idempotency-key': idempotencyKey,
          ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
          ...(requestId ? { 'x-correlation-id': requestId } : {}),
          'x-workspace-id': String(secureContext.workspaceId),
          'x-empresa-codigo': secureContext.empresaCodigo,
          'x-cliente-destino-id': String(secureContext.clienteDestinoId),
          'x-actor-id': secureContext.actorId,
        },
        timeout: SECURE_UPLOAD.timeoutMs,
        maxBodyLength: SECURE_UPLOAD.multipartTotalBytes,
        maxContentLength: SECURE_UPLOAD.multipartTotalBytes,
      });

      const mapped = mapSecureUploadSuccess(upstreamResponse.data);

      response.status(mapped.status);
      return mapped.data;
    } catch (error: unknown) {
      throwSecureUploadError(error);
    }
  }

  @ApiOperation({ summary: 'Procesar OCR de archivo vía API Gateway' })
  @Post('archivos/:archivoId/procesar-ocr')
  async procesarOcrArchivo(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('archivoId') archivoId: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.validar', 'ocr.procesar'], 'procesar OCR');
    await this.assertArchivoPermitido(archivoId, contexto, requestId);

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
  async editarOcrResultadoPut(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.editar_ocr'], 'editar resultados OCR');
    await this.assertOcrPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'PUT',
      path: `/documentos/ocr-resultados/${id}/editar`,
      authorization,
      requestId,
      body,
    });
  }

  @Patch('ocr-resultados/:id/editar')
  async editarOcrResultadoPatch(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.editar_ocr'], 'editar resultados OCR');
    await this.assertOcrPermitido(id, contexto, requestId);

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
  async confirmarOcrResultado(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.confirmar_ocr', 'ocr.confirmar'], 'confirmar resultados OCR');
    await this.assertOcrPermitido(id, contexto, requestId);

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
  async confirmarOcrResultadoConExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.confirmar_ocr', 'ocr.confirmar'], 'confirmar resultados OCR');
    this.assertAnyActionPermitida(contexto, ['documentos.vincular_expediente'], 'vincular documentos a expedientes');
    await this.assertOcrPermitido(id, contexto, requestId);
    await this.assertExpedientePermitido((body as any)?.expedienteId, contexto, requestId);

    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/confirmar-con-expediente`,
      authorization,
      requestId,
      body,
      headers: this.buildAuditForwardHeaders(
        authorization,
        requestId,
        contexto,
      ),
    });
  }

  @ApiOperation({ summary: 'Rechazar resultado OCR vía API Gateway' })
  @Post('ocr-resultados/:id/rechazar')
  async rechazarOcrResultado(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.rechazar_ocr', 'ocr.rechazar'], 'rechazar resultados OCR');
    await this.assertOcrPermitido(id, contexto, requestId);

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
  async findOcrResultados(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Query() query: Record<string, string>,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    const scopedQuery = this.buildWorkspaceScopedDocumentosQuery(query, contexto);

    return this.proxy({
      method: 'GET',
      path: '/documentos/ocr-resultados',
      authorization,
      requestId,
      query: scopedQuery,
    });
  }

  @ApiOperation({ summary: 'Obtener resultado OCR por ID vía API Gateway' })
  @Get('ocr-resultados/:id')
  async findOcrResultadoById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertOcrPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/ocr-resultados/${id}`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Crear expediente desde OCR vía API Gateway' })
  @Post('ocr-resultados/:id/crear-expediente')
  async crearExpedienteDesdeOcr(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.vincular_expediente'], 'crear expedientes desde OCR');
    await this.assertOcrPermitido(id, contexto, requestId);
    const scopedBody = this.buildWorkspaceScopedOcrExpedienteBody(body, contexto);

    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/crear-expediente`,
      authorization,
      requestId,
      body: scopedBody,
    });
  }

  @ApiOperation({ summary: 'Sugerir expediente para OCR vía API Gateway' })
  @Post('ocr-resultados/:id/sugerir-expediente')
  async sugerirExpedienteParaOcr(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.validar', 'documentos.vincular_expediente'], 'sugerir expedientes');
    await this.assertOcrPermitido(id, contexto, requestId);

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
  async vincularOcrAExpediente(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.vincular_expediente'], 'vincular documentos a expedientes');
    await this.assertOcrPermitido(id, contexto, requestId);
    await this.assertExpedientePermitido((body as any)?.expedienteId, contexto, requestId);

    return this.proxy({
      method: 'POST',
      path: `/documentos/ocr-resultados/${id}/vincular-expediente`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Listar eventos documentales de un documento vía API Gateway' })
  @Get(':id/eventos')
  async findDocumentoEventos(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/eventos`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Listar versiones/archivos físicos de un documento lógico vía API Gateway' })
  @Get(':id/archivos')
  async findArchivosByDocumentoId(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/archivos`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Agregar archivo existente como versión de un documento lógico vía API Gateway' })
  @Post(':documentoId/archivos/:archivoId/agregar-version')
  async agregarArchivoComoVersion(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('documentoId') documentoId: string,
    @Param('archivoId') archivoId: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.vincular_expediente'], 'agregar versiones de archivo');
    await this.assertDocumentoPermitido(documentoId, contexto, requestId);
    await this.assertArchivoPermitido(archivoId, contexto, requestId);

    return this.proxy({
      method: 'POST',
      path: `/documentos/${documentoId}/archivos/${archivoId}/agregar-version`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Crear relación documental vía API Gateway' })
  @Post('relaciones')
  async createDocumentoRelacion(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.vincular_expediente'], 'crear relaciones documentales');
    const relacion = body as any;

    await this.assertDocumentoPermitido(relacion?.documentoOrigenId, contexto, requestId);
    await this.assertDocumentoPermitido(relacion?.documentoDestinoId, contexto, requestId);

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
  async findDocumentoRelaciones(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/relaciones`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Crear alerta de documento vía API Gateway' })
  @Post(':id/alertas')
  async createDocumentoAlerta(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['alertas.crear'], 'crear alertas');
    await this.assertDocumentoPermitido(id, contexto, requestId);

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
  async findDocumentoAlertas(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}/alertas`,
      authorization,
      requestId,
    });
  }

  @ApiOperation({ summary: 'Resolver alerta de documento vía API Gateway' })
  @Patch(':documentoId/alertas/:alertaId/resolver')
  async resolverDocumentoAlerta(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('documentoId') documentoId: string,
    @Param('alertaId') alertaId: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['alertas.resolver'], 'resolver alertas');
    await this.assertDocumentoPermitido(documentoId, contexto, requestId);

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
    const contexto = await this.validateAuthorization(authorization);
    await this.assertArchivoPermitido(archivoId, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/archivos/${archivoId}/preview-url`,
      authorization,
      requestId,
    });
  }


  @Patch(':id/editar')
  async actualizarDocumentoManual(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    this.assertAnyActionPermitida(contexto, ['documentos.validar', 'documentos.editar'], 'editar documentos');
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'PATCH',
      path: `/documentos/${id}/editar`,
      authorization,
      requestId,
      body,
    });
  }

  @ApiOperation({ summary: 'Obtener documento por ID vía API Gateway' })
  @Get(':id')
  async findById(
    @Headers('authorization') authorization: string | undefined,
    @Headers(REQUEST_ID_HEADER) requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const contexto = await this.validateAuthorization(authorization);
    await this.assertDocumentoPermitido(id, contexto, requestId);

    return this.proxy({
      method: 'GET',
      path: `/documentos/${id}`,
      authorization,
      requestId,
    });
  }
}
