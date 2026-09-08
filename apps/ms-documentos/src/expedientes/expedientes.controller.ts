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
import { ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { NatsSubjects } from '@documental/shared';
import { NATS_CLIENT } from '../nats/nats-client.provider';
import { ExpedientesService } from './expedientes.service';

@ApiTags('expedientes')
@Controller('expedientes')
export class ExpedientesController {
  constructor(
    private readonly service: ExpedientesService,
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
  ) {
    return this.service.getBandejaComprasOcos({
      empresa,
      estado,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      incluirPendientesValidacion: incluirPendientesValidacion === 'true',
    });
  }

  @Get('bandeja-contable')
  getBandejaContable(
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
