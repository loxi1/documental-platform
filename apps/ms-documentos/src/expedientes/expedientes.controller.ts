import {  
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

  @Get('buscar-por-codigo')
  findByCodigoExpediente(@Query('codigo') codigo: string) {
    return this.service.findByCodigoExpediente(codigo);
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
  

  @Post(':id/documentos')
  addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.addDocumento(id, body);
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
