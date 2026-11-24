import { mimeArchivadoDesdeContenido, extensionArchivadoDesdeMime } from './archivado-nomenclatura';
import { Controller, Get, Post, Param, ParseIntPipe, Headers, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ArchivadoRuntimeService } from './archivado-runtime.service';
@Controller('documentos/archivado')
export class ArchivadoController {
  constructor(private readonly archivado:ArchivadoRuntimeService){}
  @Get('expedientes/:expedienteId')
  resumen(@Param('expedienteId',ParseIntPipe) id:number,@Headers('authorization') auth?:string){return this.archivado.resumen(id,auth);}
  @Post('expedientes/:expedienteId/regularizar')
  regularizar(@Param('expedienteId',ParseIntPipe) id:number,@Headers('authorization') auth?:string){return this.archivado.regularizar(id,auth);}
  @Get('preview/:archivoId')
  async preview(@Param('archivoId',ParseIntPipe) id:number,@Query('ticket') ticket:string,@Res() response:Response){
    const data=await this.archivado.leerPreview(id,ticket);
    const mime=mimeArchivadoDesdeContenido(data);
    if(!mime)throw new Error('ARCHIVADO_FORMATO_NO_COINCIDE');
    const extension=extensionArchivadoDesdeMime(mime);
    response.set({'Content-Type':mime,'Cache-Control':'private, no-store',
      'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="documento.${extension}"`}).send(data);
  }
}
