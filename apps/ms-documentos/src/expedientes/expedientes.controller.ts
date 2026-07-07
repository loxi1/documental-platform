import {  
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExpedientesService } from './expedientes.service';

@ApiTags('expedientes')
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly service: ExpedientesService) {}

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

  @Get('bandeja-contable')
  getBandejaContable(
    @Query('empresa') empresa: string,
    @Query('anio') anio: string,
    @Query('mes') mes: string,
  ) {
    return this.service.getRevisionContable({
      empresa,
      anio: Number(anio),
      mes: Number(mes),
    });
  }

  @Get('revision-contable')
  getRevisionContable(
    @Query('empresa') empresa: string,
    @Query('anio') anio: string,
    @Query('mes') mes: string,
  ) {
    return this.service.getRevisionContable({
      empresa,
      anio: Number(anio),
      mes: Number(mes),
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
