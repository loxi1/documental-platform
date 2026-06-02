import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiParam, } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { documentosQuerySchema } from '../common/schemas/documentos-query.schema';
import type { DocumentosQueryDto } from '../common/schemas/documentos-query.schema';

@ApiTags('documentos')
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @ApiOperation({ summary: 'Listar documentos con filtros y paginación' })
  @ApiQuery({ name: 'cliente', required: false, example: 'BBTI' })
  @ApiQuery({ name: 'tipo', required: false, example: 'FACTURA' })
  @ApiQuery({ name: 'anio', required: false, example: 2026 })
  @ApiQuery({ name: 'mes', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @Get()
  findAll(
    @Query(new ZodValidationPipe(documentosQuerySchema))
    query: DocumentosQueryDto,
  ) {
    return this.service.findAll(query);
  }

  @Get('tipos')
  getTipos() {
    return this.service.getTipos();
  }

  @ApiOperation({ summary: 'Listar clientes destino' })
  @Get('clientes-destino')
  getClientesDestino() {
    return this.service.getClientesDestino();
  }

  @ApiOperation({ summary: 'Buscar proveedores por RUC o razón social' })
  @ApiQuery({ name: 'search', required: false, example: 'EDEN' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @Get('proveedores')
  getProveedores(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getProveedores(
      search,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @ApiOperation({ summary: 'Obtener documento por ID con archivos vinculados' })
  @ApiParam({ name: 'id', example: 1 })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}