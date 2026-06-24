import { Body, Controller, Get, Param, ParseIntPipe, Query, Post, Patch, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DocumentosService } from './documentos.service'; import { DocumentosPreviewService } from './documentos-preview.service';
import { DocumentosUploadService } from './documentos-upload.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { documentosQuerySchema } from '../common/schemas/documentos-query.schema';
import type { DocumentosQueryDto } from '../common/schemas/documentos-query.schema';

@ApiTags('documentos')
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService, private readonly preview: DocumentosPreviewService, private readonly upload: DocumentosUploadService) {}

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


  @ApiOperation({ summary: 'Carga guiada de archivo a R2 sin procesar OCR' })
  @ApiConsumes('multipart/form-data')
  @Post('carga-guiada')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'file', maxCount: 1 },
    { name: 'archivo', maxCount: 1 },
  ]))
  cargaGuiada(
    @UploadedFiles() files: Record<string, any[]>,
    @Body() body: any,
  ) {
    const file = files?.file?.[0] ?? files?.archivo?.[0];
    return this.upload.cargaGuiada(file, body);
  }

  @ApiOperation({ summary: 'Generar URL temporal de preview para archivo privado R2' }) @Get('archivos/:archivoId/preview-url') getArchivoPreviewUrl( @Param('archivoId', ParseIntPipe) archivoId: number, ) { return this.preview.getArchivoPreviewUrl(archivoId); } @Post('archivos/:archivoId/procesar-ocr')
  procesarOcrArchivo(
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @Body() body: {
      tipoEsperado?: string;
      areaOrigen?: string;
      expedienteId?: number;
      documentoBaseId?: number;
      tipoRelacionSugerida?: string;
      canalIngreso?: string;
      reprocesar?: boolean;
    } = {},
  ) {
    return this.service.procesarOcrArchivo(archivoId, body);
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

  @Post('ocr-resultados/:id/confirmar-con-expediente')
  confirmarOcrResultadoConExpediente(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      expedienteId: number;
      tipoRelacion?: string;
      esPrincipal?: boolean;
      orden?: number;
      metadata?: Record<string, any>;
      observacion?: string;
    },
  ) {
    return this.service.confirmarOcrResultadoConExpediente(id, body);
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

  @Post(':id/alertas')
  createDocumentoAlerta(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.createDocumentoAlerta(id, body);
  }

  @Get(':id/alertas')
  findDocumentoAlertas(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findDocumentoAlertas(id);
  }

  @Patch(':documentoId/alertas/:alertaId/resolver')
  resolverDocumentoAlerta(
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Param('alertaId', ParseIntPipe) alertaId: number,
  ) {
    return this.service.resolverDocumentoAlerta(
      documentoId,
      alertaId,
    );
  }

  @Post('ocr-resultados/:id/rechazar')
  rechazarOcrResultado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
  ) {
    return this.service.rechazarOcrResultado(
      id,
      body?.motivo,
    );
  }

  @Put('ocr-resultados/:id/editar')
  editarOcrResultadoPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      tipoPropuesto?: string;
      metadata?: Record<string, any>;
      observacion?: string;
    },
  ) {
    return this.service.editarOcrResultado(id, body);
  }

  @Patch('ocr-resultados/:id/editar')
  editarOcrResultado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      tipoPropuesto?: string;
      metadata?: Record<string, any>;
      observacion?: string;
    },
  ) {
    return this.service.editarOcrResultado(id, body);
  }

  @ApiOperation({ summary: 'Obtener documento por ID con archivos vinculados' })
  @ApiParam({ name: 'id', example: 1 })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}