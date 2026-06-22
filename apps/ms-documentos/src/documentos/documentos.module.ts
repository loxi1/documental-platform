import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository'; import { DocumentosPreviewService } from './documentos-preview.service';


@Module({
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository, DocumentosPreviewService],
})
export class DocumentosModule {}
