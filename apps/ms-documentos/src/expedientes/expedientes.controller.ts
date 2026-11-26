import {  
  Body,
  Headers,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import {
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ExpedientesImportacionService,
} from './expedientes-importacion.service';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { NatsSubjects } from '@documental/shared';
import { NATS_CLIENT } from '../nats/nats-client.provider';
import { ExpedientesService } from './expedientes.service';
import { OrdenPagoService } from '../documental-v2/finanzas/orden-pago.service';
import type { OrdenPagoActor } from '../documental-v2/finanzas/orden-pago.dto';

@ApiTags('expedientes')
@Controller('expedientes')
export class ExpedientesController {
  constructor(
    private readonly service: ExpedientesService,
    private readonly importacion: ExpedientesImportacionService,
    private readonly ordenPago: OrdenPagoService,
    @Inject(NATS_CLIENT) private readonly nats: ClientProxy,
  ) {}

  @Get()
  findAll(
    @Query('empresa') empresa?: string,
    @Query('estado') estado?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findAll({
      empresa,
      estado,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('buscar')
  buscarExpedientes(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('empresa') empresa?: string,
  ) {
    return this.service.buscarExpedientes({
      q,
      empresa,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('buscar-por-codigo')
  findByCodigoExpediente(
    @Query('codigo') codigo: string,
    @Query('empresa') empresa?: string,
  ) {
    return this.service.findByCodigoExpediente(codigo, empresa);
  }


  @Get('mantenimiento')
  findMantenimiento(
    @Query('empresa') empresa?: string,
    @Query('clienteDestinoId') clienteDestinoId?: string,
    @Query('estado') estado?: string,
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.findMantenimiento({
      empresa,
      clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : undefined,
      estado,
      q: q ?? search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('mantenimiento/:id')
  findMantenimientoById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findMantenimientoById(id);
  }


  @ApiConsumes('multipart/form-data')
  @Post('mantenimiento/importar-csv')
  @UseInterceptors(FileInterceptor('archivo', {
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: 1,
      fields: 1,
      fieldSize: 128,
      parts: 3,
    },
  }))
  async importarCsv(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-workspace-id') workspaceHeader: string | undefined,
    @Headers('x-empresa-codigo') empresaHeader: string | undefined,
    @Headers('x-cliente-destino-id') clienteHeader: string | undefined,
    @Headers('x-actor-id') actorHeader: string | undefined,
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      size: number;
    },
    @Body() body: Record<string, unknown>,
  ) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    let auth: any;

    try {
      auth = await firstValueFrom(
        this.nats.send(NatsSubjects.AuthValidateToken, {
          token: authorization.slice(7).trim(),
        }).pipe(timeout(10000)),
      );
    } catch {
      throw new UnauthorizedException(
        'No se pudo validar el token',
      );
    }

    if (!auth?.valid || !auth.payload) {
      throw new UnauthorizedException(
        'Token invalido o expirado',
      );
    }

    const payload = auth.payload;

    const perfil = String(
      payload.perfil ?? payload.perfilCodigo ?? '',
    ).trim().toLowerCase();

    if (!['admin', 'compras', 'contabilidad'].includes(perfil)) {
      throw new ForbiddenException(
        'IMPORTACION_PERFIL_NO_AUTORIZADO',
      );
    }

    const workspaceId = Number(payload.workspaceId);

    const empresaCodigo = String(
      payload.empresa ?? payload.empresaCodigo ?? '',
    ).trim().toUpperCase();

    const clienteDestinoId = Number(payload.clienteDestinoId);

    const usuarioId = Number(payload.sub ?? payload.usuarioId);

    if (
      !Number.isSafeInteger(workspaceId) ||
      workspaceId <= 0 ||
      !Number.isSafeInteger(clienteDestinoId) ||
      clienteDestinoId <= 0 ||
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0 ||
      !/^[A-Z0-9_-]{1,20}$/.test(empresaCodigo)
    ) {
      throw new ForbiddenException(
        'IMPORTACION_CONTEXTO_INVALIDO',
      );
    }

    if (
      workspaceHeader !== String(workspaceId) ||
      empresaHeader !== empresaCodigo ||
      clienteHeader !== String(clienteDestinoId) ||
      actorHeader !== String(usuarioId)
    ) {
      throw new ForbiddenException(
        'IMPORTACION_CONTEXTO_NO_COINCIDE',
      );
    }

    if (
      !body ||
      Object.keys(body).some(key => key !== 'solicitudId') ||
      typeof body.solicitudId !== 'string' ||
      !file?.buffer
    ) {
      throw new BadRequestException(
        'IMPORTACION_SOLICITUD_INVALIDA',
      );
    }

    return this.importacion.importar({
      solicitudId: body.solicitudId,
      nombreOriginal: file.originalname,
      contenido: file.buffer,
      contexto: {
        workspaceId,
        empresaCodigo,
        clienteDestinoId,
        usuarioId,
        usuarioEmail:
          typeof payload.email === 'string'
            ? payload.email
            : null,
        perfil,
        requestId: requestId ?? null,
        sessionContextId:
          typeof payload.sessionContextId === 'string'
            ? payload.sessionContextId
            : null,
      },
    });
  }

  @Post('mantenimiento')
  createMantenimiento(@Body() body: any) {
    return this.service.createMantenimiento(body);
  }

  @Patch('mantenimiento/:id')
  updateMantenimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.updateMantenimiento(id, body);
  }

  @Patch('mantenimiento/:id/estado')
  updateMantenimientoEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.updateMantenimientoEstado(id, body ?? {});
  }

  @Get(':id/resumen')
  getResumen(@Param('id', ParseIntPipe) id: number) {
    return this.service.getResumen(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get(':id/timeline')
  getTimeline(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getTimeline(id);
  }
  
  @Get(':id/principales/:principalId/facturas-pendientes')
  async findFacturasPendientes(
    @Param('id', ParseIntPipe) id: number,
    @Param('principalId', ParseIntPipe) principalId: number,
    @Headers('authorization') authorization?: string,
  ) {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(principalId) || principalId <= 0) {
      throw new BadRequestException('Identificadores inválidos');
    }
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    let auth: any;
    try {
      auth = await firstValueFrom(this.nats.send(NatsSubjects.AuthValidateToken, {
        token: authorization.slice(7).trim(),
      }).pipe(timeout(10000)));
    } catch {
      throw new UnauthorizedException('No se pudo validar el token');
    }
    if (!auth?.valid) throw new UnauthorizedException('Token inválido');
    const workspaceId = Number(auth.payload?.workspaceId);
    const clienteDestinoId = Number(auth.payload?.clienteDestinoId);
    const empresa = String(auth.payload?.empresa ?? auth.payload?.empresaCodigo ?? '').trim().toUpperCase();
    if (!Number.isSafeInteger(workspaceId) || workspaceId <= 0 ||
        !Number.isSafeInteger(clienteDestinoId) || clienteDestinoId <= 0 || !empresa) {
      throw new ForbiddenException('Workspace autenticado incompleto');
    }
    return this.service.findFacturasPendientes(id, principalId, { workspaceId, clienteDestinoId, empresa });
  }

  @Get(':id/documentos')
  findDocumentos(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findDocumentos(id);
  }

  @Post(':id/documentos')
  addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.addDocumento(id, body);
  }

  @Get('bandeja-compras')
  getBandejaComprasOcos(
    @Query('empresa') empresa: string,
    @Query('estado') estado?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('incluirPendientesValidacion') incluirPendientesValidacion?: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
  ) {
    return this.service.getBandejaComprasOcos({
      empresa,
      anio,
      mes,
      estado,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      incluirPendientesValidacion: incluirPendientesValidacion === 'true',
    });
  }

  @Get('bandeja-contable')
  getBandejaContable(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @Headers('x-cliente-destino-id') clienteDestinoId: string | undefined,
    @Query('empresa') empresa: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('soloPendientesFinanzas') soloPendientesFinanzas?: string,
  ) {
    return this.service.getRevisionContable({
      empresa,
      anio: anio ? Number(anio) : undefined,
      mes: mes ? Number(mes) : undefined,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      soloPendientesFinanzas: soloPendientesFinanzas === 'true',
    }, workspaceId ? {
      workspaceId: Number(workspaceId),
      clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
    } : undefined);
  }

  @Get('revision-contable/orden-pago/:ordenPagoId')
  async getOrdenPagoRevisionContable(
    @Headers() headers: Record<string, string>,
    @Param('ordenPagoId', ParseIntPipe) ordenPagoId: number,
  ) {
    const actor: OrdenPagoActor = {
      id: Number(headers['x-user-id']),
      workspaceId: Number(headers['x-workspace-id']),
      empresaCodigo: String(headers['x-empresa-codigo'] ?? '').trim().toUpperCase(),
      clienteDestinoId: headers['x-cliente-destino-id']
        ? Number(headers['x-cliente-destino-id'])
        : null,
      email: headers['x-user-email'],
      requestId: headers['x-request-id'],
      correlationId: headers['x-correlation-id'],
      sessionContextId: headers['x-session-context-id'],
      sistemaCodigo: headers['x-sistema-codigo'],
      perfilCodigo: headers['x-perfil-codigo'],
    };

    const detalle = await this.ordenPago.obtenerDetalleRevisionContable(
      ordenPagoId,
      actor,
    );

    const filaContable = await this.service.getRevisionContableOrdenPago(
      ordenPagoId,
      detalle.numero,
      {
        empresa: actor.empresaCodigo,
        clienteDestinoId: actor.clienteDestinoId ?? null,
        workspaceId: actor.workspaceId,
        fechaEmision: detalle.fechaEmision,
      },
    );

    return {
      ...detalle,
      documentosRelacionados:
        filaContable?.documentos_relacionados ?? [],
      estadoRegularizacion:
        filaContable?.estadoRegularizacion ?? null,
      tiposDocumentalesRegularizadoresPermitidos:
        filaContable?.tiposDocumentalesRegularizadoresPermitidos ??
        detalle.tiposDocumentalesRegularizadoresPermitidos,
    };
  }

  @Get('revision-contable')
  getRevisionContable(
    @Query('empresa') empresa: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('soloPendientesFinanzas') soloPendientesFinanzas?: string,
  ) {
    return this.service.getRevisionContable({
      empresa,
      anio: anio ? Number(anio) : undefined,
      mes: mes ? Number(mes) : undefined,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      soloPendientesFinanzas: soloPendientesFinanzas === 'true',
    });
  }

  @Get(':id/estado-documental')
  getEstadoDocumental(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getEstadoDocumental(id);
  }

  @Get('dashboard-contable')
  getDashboardContable(
    @Query('empresa') empresa: string,
    @Query('anio') anio: string,
    @Query('mes') mes: string,
  ) {
    return this.service.getDashboardContable({
      empresa,
      anio: Number(anio),
      mes: Number(mes),
    });
  }
  
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}
