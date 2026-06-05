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

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Post(':id/documentos')
  addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.addDocumento(id, body);
  }
}
