import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiParam, } from '@nestjs/swagger';

import { GruposService } from './grupos.service';

@ApiTags('grupos')
@Controller('grupos')
export class GruposController {
  constructor(private readonly service: GruposService) {}

  @ApiOperation({ summary: 'Listar grupos documentales con filtros' })
  @ApiQuery({ name: 'cliente', required: false, example: 'BBTEC' })
  @ApiQuery({ name: 'tipo', required: false, example: 'OC' })
  @ApiQuery({ name: 'anio', required: false, example: 2026 })
  @ApiQuery({ name: 'mes', required: false, example: 4 })
  @ApiQuery({ name: 'oc', required: false, example: '003091' })
  @ApiQuery({ name: 'os', required: false, example: 'OS-001' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @Get()
  findAll(
    @Query('cliente') cliente?: string,
    @Query('tipo') tipo?: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('oc') oc?: string,
    @Query('os') os?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findAll({
      cliente,
      tipo,
      anio: anio ? Number(anio) : undefined,
      mes: mes ? Number(mes) : undefined,
      oc,
      os,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @ApiOperation({ summary: 'Obtener grupo documental por ID con documentos vinculados' })
  @ApiParam({ name: 'id', example: 1 })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}
