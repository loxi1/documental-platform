import { Body, Controller, Get, Param, ParseIntPipe, Headers, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ContenedorOperativoService } from './contenedor-operativo.service';
import type {
  ActualizarContenedorOperativoDto,
  ActualizarDocumentoOperativoPrincipalDto,
  ActualizarGrupoFacturaDocumentoDto,
  ActualizarGrupoFacturaDto,
  AnularDocumentalV2Dto,
  CrearContenedorOperativoDto,
  CrearDocumentoOperativoPrincipalDto,
  CrearGrupoFacturaDocumentoDto,
  CrearGrupoFacturaDto,
} from './documental-v2.dto';
import { DocumentoOperativoPrincipalService } from './documento-operativo-principal.service';
import { GrupoFacturaDocumentoService } from './grupo-factura-documento.service';
import { GrupoFacturaService } from './grupo-factura.service';
import { WorkspaceDocumentalV2UseCase } from './use-cases/workspace-documental-v2.usecase';

import { AsociarDocumentoPrincipalV2UseCase } from './use-cases/asociar-documento-principal-v2.usecase';
import { AsociarGrupoFacturaV2UseCase } from './use-cases/asociar-grupo-factura-v2.usecase';
import { AsociarDocumentoGrupoFacturaV2UseCase } from './use-cases/asociar-documento-grupo-factura-v2.usecase';
import { DocumentoExistenteReadonlyRepository } from './documento-existente-readonly.repository';
import { ConsultarTrazabilidadV2UseCase } from './use-cases/consultar-trazabilidad-v2.usecase';

@ApiTags('documental-v2')
@Controller('documental-v2')
export class DocumentalV2Controller {
  constructor(
    private readonly contenedores: ContenedorOperativoService,
    private readonly documentosOperativos: DocumentoOperativoPrincipalService,
    private readonly gruposFactura: GrupoFacturaService,
    private readonly grupoFacturaDocumentos: GrupoFacturaDocumentoService,
    private readonly workspaceDocumentalV2: WorkspaceDocumentalV2UseCase,
    private readonly asociarDocumentoPrincipalV2UseCase: AsociarDocumentoPrincipalV2UseCase,
    private readonly asociarGrupoFacturaV2UseCase: AsociarGrupoFacturaV2UseCase,
    private readonly asociarDocumentoGrupoFacturaV2UseCase: AsociarDocumentoGrupoFacturaV2UseCase,
    private readonly consultarTrazabilidadV2UseCase: ConsultarTrazabilidadV2UseCase,
    private readonly documentoExistenteReadonlyRepository: DocumentoExistenteReadonlyRepository,
  ) {}


  @ApiOperation({ summary: 'Construir vista interna Workspace Documental V2 desde Expediente V1' })
  @ApiParam({ name: 'expedienteId', example: 41 })
  @Get('workspace/expedientes-v1/:expedienteId')
  construirWorkspaceDesdeExpedienteV1(@Param('expedienteId', ParseIntPipe) expedienteId: number) {
    return this.workspaceDocumentalV2.construirDesdeExpedienteV1(expedienteId);
  }

  @ApiOperation({ summary: 'Consultar trazabilidad canónica V2 por Contenedor Operativo' })
  @ApiParam({ name: 'contenedorOperativoId', example: 2 })
  @Get('trazabilidad/contenedores/:contenedorOperativoId')
  consultarTrazabilidadPorContenedor(
    @Param('contenedorOperativoId', ParseIntPipe) contenedorOperativoId: number,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
  ) {
    return this.consultarTrazabilidadV2UseCase.execute({
      contenedorOperativoId,
      usuario: {
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
      },
    });
  }

  @ApiOperation({ summary: 'Crear Contenedor Operativo V2' })
  @Post('contenedores')
  crearContenedor(@Body() body: CrearContenedorOperativoDto) {
    return this.contenedores.crear(body);
  }

  @ApiOperation({ summary: 'Listar Contenedores Operativos V2' })
  @ApiQuery({ name: 'empresaCodigo', required: false, example: 'BBTI' })
  @ApiQuery({ name: 'clienteDestinoId', required: false, example: 2 })
  @ApiQuery({ name: 'tipoContexto', required: false, example: 'centro_costo_op' })
  @ApiQuery({ name: 'estado', required: false, example: 'activo' })
  @ApiQuery({ name: 'q', required: false, example: '050201' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @Get('contenedores')
  listarContenedores(
    @Query('empresaCodigo') empresaCodigo?: string,
    @Query('clienteDestinoId') clienteDestinoId?: string,
    @Query('tipoContexto') tipoContexto?: string,
    @Query('estado') estado?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contenedores.listar({
      empresaCodigo,
      clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : undefined,
      tipoContexto,
      estado,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @ApiOperation({ summary: 'Buscar Contenedor Operativo V2 por clave funcional' })
  @ApiQuery({ name: 'empresaCodigo', required: true, example: 'BBTI' })
  @ApiQuery({ name: 'tipoContexto', required: true, example: 'centro_costo_op' })
  @ApiQuery({ name: 'codigo', required: true, example: '050201' })
  @Get('contenedores/buscar')
  buscarContenedorPorClave(
    @Query('empresaCodigo') empresaCodigo: string,
    @Query('tipoContexto') tipoContexto: string,
    @Query('codigo') codigo: string,
  ) {
    return this.contenedores.buscarPorClave({ empresaCodigo, tipoContexto, codigo });
  }

  @ApiOperation({ summary: 'Obtener Contenedor Operativo V2 por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @Get('contenedores/:id')
  buscarContenedorPorId(@Param('id', ParseIntPipe) id: number) {
    return this.contenedores.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar Contenedor Operativo V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Patch('contenedores/:id')
  actualizarContenedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarContenedorOperativoDto,
  ) {
    return this.contenedores.actualizar({ ...body, id });
  }

  @ApiOperation({ summary: 'Anular Contenedor Operativo V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Post('contenedores/:id/anular')
  anularContenedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnularDocumentalV2Dto = {},
  ) {
    return this.contenedores.anular({ id, ...body });
  }

  @ApiOperation({ summary: 'Crear Documento Operativo Principal V2' })
  @Post('documentos-operativos-principales')
  crearDocumentoOperativoPrincipal(@Body() body: CrearDocumentoOperativoPrincipalDto) {
    return this.documentosOperativos.crear(body);
  }

  @ApiOperation({ summary: 'Listar Documentos Operativos Principales de un Contenedor V2' })
  @ApiParam({ name: 'contenedorOperativoId', example: 1 })
  @Get('contenedores/:contenedorOperativoId/documentos-operativos-principales')
  listarDocumentosOperativosPorContenedor(
    @Param('contenedorOperativoId', ParseIntPipe) contenedorOperativoId: number,
  ) {
    return this.documentosOperativos.listarPorContenedor(contenedorOperativoId);
  }

  @ApiOperation({ summary: 'Buscar Documento Operativo Principal V2 por documento_id' })
  @ApiParam({ name: 'documentoId', example: 10 })
  @Get('documentos-operativos-principales/documento/:documentoId')
  buscarDocumentoOperativoPorDocumentoId(@Param('documentoId', ParseIntPipe) documentoId: number) {
    return this.documentosOperativos.buscarPorDocumentoId(documentoId);
  }

  @ApiOperation({ summary: 'Obtener Documento Operativo Principal V2 por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @Get('documentos-operativos-principales/:id')
  buscarDocumentoOperativoPorId(@Param('id', ParseIntPipe) id: number) {
    return this.documentosOperativos.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar Documento Operativo Principal V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Patch('documentos-operativos-principales/:id')
  actualizarDocumentoOperativoPrincipal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarDocumentoOperativoPrincipalDto,
  ) {
    return this.documentosOperativos.actualizar({ ...body, id });
  }

  @ApiOperation({ summary: 'Anular Documento Operativo Principal V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Post('documentos-operativos-principales/:id/anular')
  anularDocumentoOperativoPrincipal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnularDocumentalV2Dto = {},
  ) {
    return this.documentosOperativos.anular({ id, ...body });
  }

  @ApiOperation({ summary: 'Crear Grupo de Factura V2' })
  @Post('grupos-factura')
  crearGrupoFactura(@Body() body: CrearGrupoFacturaDto) {
    return this.gruposFactura.crear(body);
  }

  @ApiOperation({ summary: 'Listar Grupos de Factura de un Documento Operativo Principal V2' })
  @ApiParam({ name: 'documentoOperativoPrincipalId', example: 1 })
  @Get('documentos-operativos-principales/:documentoOperativoPrincipalId/grupos-factura')
  listarGruposFacturaPorDocumentoOperativoPrincipal(
    @Param('documentoOperativoPrincipalId', ParseIntPipe) documentoOperativoPrincipalId: number,
  ) {
    return this.gruposFactura.listarPorDocumentoOperativoPrincipal(documentoOperativoPrincipalId);
  }

  @ApiOperation({ summary: 'Buscar Grupo de Factura V2 por factura_documento_id' })
  @ApiParam({ name: 'facturaDocumentoId', example: 20 })
  @Get('grupos-factura/factura/:facturaDocumentoId')
  buscarGrupoFacturaPorFacturaDocumentoId(
    @Param('facturaDocumentoId', ParseIntPipe) facturaDocumentoId: number,
  ) {
    return this.gruposFactura.buscarPorFacturaDocumentoId(facturaDocumentoId);
  }

  @ApiOperation({ summary: 'Obtener Grupo de Factura V2 por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @Get('grupos-factura/:id')
  buscarGrupoFacturaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.gruposFactura.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar Grupo de Factura V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Patch('grupos-factura/:id')
  actualizarGrupoFactura(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarGrupoFacturaDto,
  ) {
    return this.gruposFactura.actualizar({ ...body, id });
  }

  @ApiOperation({ summary: 'Anular Grupo de Factura V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Post('grupos-factura/:id/anular')
  anularGrupoFactura(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnularDocumentalV2Dto = {},
  ) {
    return this.gruposFactura.anular({ id, ...body });
  }

  @ApiOperation({ summary: 'Vincular documento a Grupo de Factura V2' })
  @Post('grupo-factura-documentos')
  crearGrupoFacturaDocumento(@Body() body: CrearGrupoFacturaDocumentoDto) {
    return this.grupoFacturaDocumentos.crear(body);
  }

  @ApiOperation({ summary: 'Listar documentos de un Grupo de Factura V2' })
  @ApiParam({ name: 'grupoFacturaId', example: 1 })
  @Get('grupos-factura/:grupoFacturaId/documentos')
  listarDocumentosPorGrupoFactura(@Param('grupoFacturaId', ParseIntPipe) grupoFacturaId: number) {
    return this.grupoFacturaDocumentos.listarPorGrupoFactura(grupoFacturaId);
  }

  @ApiOperation({ summary: 'Buscar vínculo activo de documento en Grupo de Factura V2' })
  @ApiParam({ name: 'documentoId', example: 30 })
  @Get('grupo-factura-documentos/documento/:documentoId/activo')
  buscarGrupoFacturaDocumentoActivoPorDocumentoId(
    @Param('documentoId', ParseIntPipe) documentoId: number,
  ) {
    return this.grupoFacturaDocumentos.buscarActivoPorDocumentoId(documentoId);
  }

  @ApiOperation({ summary: 'Obtener vínculo de documento con Grupo de Factura V2 por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @Get('grupo-factura-documentos/:id')
  buscarGrupoFacturaDocumentoPorId(@Param('id', ParseIntPipe) id: number) {
    return this.grupoFacturaDocumentos.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Actualizar vínculo de documento con Grupo de Factura V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Patch('grupo-factura-documentos/:id')
  actualizarGrupoFacturaDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarGrupoFacturaDocumentoDto,
  ) {
    return this.grupoFacturaDocumentos.actualizar({ ...body, id });
  }

  @ApiOperation({ summary: 'Asociar documento existente como Documento Operativo Principal V2' })
  @Post('documentos-operativos-principales/asociar')
  async asociarDocumentoPrincipal(
    @Body() dto: any,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.asociarDocumentoPrincipalV2UseCase.execute({
      contenedorOperativoId: Number(dto.contenedorOperativoId),
      documentoId: Number(dto.documentoId),
      tipoPrincipal: dto.tipoPrincipal,
      usuario: {
        id: userId ? Number(userId) : null,
        email: userEmail ?? null,
        workspaceId: workspaceId ? Number(workspaceId) : null,
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        origen: 'api-gateway',
      },
    });
  }

  @ApiOperation({ summary: 'Listar documentos candidatos para Documento Operativo Principal V2' })
  @Get('documentos-candidatos-principal')
  async listarCandidatosPrincipal(@Query() query: any) {
    const data = await this.documentoExistenteReadonlyRepository.listarCandidatosPrincipal({
      empresaCodigo: query.empresaCodigo,
      tipoPrincipal: query.tipoPrincipal,
      q: query.q,
      estado: query.estado,
      limit: query.limit ? Number(query.limit) : undefined,
    });

    return data.map((documento) => ({
      documentoId: documento.id,
      tipoDocumental: documento.tipoDocumental,
      tipoDocumentalLabel: documento.tipoDocumental === 'OC' ? 'Orden de compra' : documento.tipoDocumental,
      numeroDocumento: documento.numero,
      titulo: `${documento.tipoDocumental} ${documento.numero ?? documento.id}`,
      proveedorNombre: documento.razonSocialEmisor,
      proveedorRuc: documento.rucEmisor,
      fechaEmision: documento.fechaEmision,
      montoTotal: documento.montoTotal,
      moneda: documento.moneda,
      estado: documento.estado,
      nombreArchivo: documento.nombreArchivo,
      yaEsPrincipalV2: documento.yaEsPrincipalV2,
    }));
  }



  @ApiOperation({ summary: 'Listar Facturas candidatas para crear Grupo de Factura V2' })
  @Get('facturas-candidatas')
  async listarFacturasCandidatas(
    @Query('documentoOperativoPrincipalId') documentoOperativoPrincipalId: string,
    @Query('texto') texto?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.asociarGrupoFacturaV2UseCase.listarFacturasCandidatas({
      documentoOperativoPrincipalId: Number(documentoOperativoPrincipalId),
      texto,
      pagina: pagina ? Number(pagina) : undefined,
      limite: limite ? Number(limite) : undefined,
      usuario: {
        id: userId ? Number(userId) : null,
        email: userEmail ?? null,
        workspaceId: workspaceId ? Number(workspaceId) : null,
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        origen: 'api-gateway',
      },
    });
  }

  @ApiOperation({ summary: 'Asociar Factura existente creando Grupo de Factura V2' })
  @Post('grupos-factura/asociar')
  async asociarGrupoFactura(
    @Body() dto: any,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.asociarGrupoFacturaV2UseCase.execute({
      documentoOperativoPrincipalId: Number(dto.documentoOperativoPrincipalId),
      facturaDocumentoId: Number(dto.facturaDocumentoId),
      usuario: {
        id: userId ? Number(userId) : null,
        email: userEmail ?? null,
        workspaceId: workspaceId ? Number(workspaceId) : null,
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        origen: 'api-gateway',
      },
    });
  }

  @ApiOperation({ summary: 'Listar documentos candidatos para asociar a Grupo de Factura V2' })
  @Get('documentos-candidatos-grupo')
  async listarDocumentosCandidatosGrupo(
    @Query('grupoFacturaId') grupoFacturaId: string,
    @Query('tipoDocumental') tipoDocumental?: string,
    @Query('texto') texto?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.asociarDocumentoGrupoFacturaV2UseCase.listarDocumentosCandidatos({
      grupoFacturaId: Number(grupoFacturaId),
      tipoDocumental,
      texto,
      pagina: pagina ? Number(pagina) : undefined,
      limite: limite ? Number(limite) : undefined,
      usuario: {
        id: userId ? Number(userId) : null,
        email: userEmail ?? null,
        workspaceId: workspaceId ? Number(workspaceId) : null,
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        origen: 'api-gateway',
      },
    });
  }

  @ApiOperation({ summary: 'Asociar documento existente a Grupo de Factura V2' })
  @Post('grupos-factura/documentos/asociar')
  async asociarDocumentoGrupoFactura(
    @Body() dto: any,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Headers('x-empresa-codigo') empresaCodigo?: string,
    @Headers('x-cliente-destino-id') clienteDestinoId?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.asociarDocumentoGrupoFacturaV2UseCase.execute({
      grupoFacturaId: Number(dto.grupoFacturaId),
      documentoId: Number(dto.documentoId),
      tipoRelacion: dto.tipoRelacion,
      usuario: {
        id: userId ? Number(userId) : null,
        email: userEmail ?? null,
        workspaceId: workspaceId ? Number(workspaceId) : null,
        empresaCodigo: empresaCodigo ?? null,
        clienteDestinoId: clienteDestinoId ? Number(clienteDestinoId) : null,
        requestId: requestId ?? null,
        correlationId: correlationId ?? null,
        origen: 'api-gateway',
      },
    });
  }

  @ApiOperation({ summary: 'Anular vínculo de documento con Grupo de Factura V2' })
  @ApiParam({ name: 'id', example: 1 })
  @Post('grupo-factura-documentos/:id/anular')
  anularGrupoFacturaDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnularDocumentalV2Dto = {},
  ) {
    return this.grupoFacturaDocumentos.anular({ id, ...body });
  }
}
