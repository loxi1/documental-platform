import { Body, Controller, Get, Param, ParseIntPipe, Query, Post } from '@nestjs/common';
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

  @Post('archivos/:archivoId/procesar-ocr')
  procesarOcrArchivo(
    @Param('archivoId', ParseIntPipe) archivoId: number,
  ) {
    return this.service.procesarOcrArchivo(archivoId);
  }

  @Get('ocr-resultados')
  findOcrResultados(
    @Query('estado') estado?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('soloNoVinculados') soloNoVinculados?: string
  ) {
    return this.service.findOcrResultados({
      estado,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
      soloNoVinculados: soloNoVinculados === 'true',
    });
  }

  @Get('ocr-resultados/:id')
  findOcrResultadoById(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOcrResultadoById(id);
  }

  @Post('ocr-resultados/:id/confirmar')
  confirmarOcrResultado(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.confirmarOcrResultado(id);
  }

  @Post('relaciones')
  createDocumentoRelacion(@Body() body: any) {
    return this.service.createDocumentoRelacion(body);
  }

  @Get(':id/relaciones')
  findDocumentoRelaciones(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findDocumentoRelaciones(id);
  }

  @Post('ocr-resultados/:id/crear-expediente')
  crearExpedienteDesdeOcr(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.crearExpedienteDesdeOcr(id, body);
  }

  @Post('ocr-resultados/:id/sugerir-expediente')
  sugerirExpedienteParaOcr(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.sugerirExpedienteParaOcr(id);
  }

  @Post('ocr-resultados/:id/vincular-expediente')
  vincularOcrAExpediente(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.vincularOcrAExpediente(id, body);
  }

  @ApiOperation({ summary: 'Obtener documento por ID con archivos vinculados' })
  @ApiParam({ name: 'id', example: 1 })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}