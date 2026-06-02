import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository';

@Module({
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository],
})
export class DocumentosModule {}
