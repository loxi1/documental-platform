import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository'; import { DocumentosPreviewService } from './documentos-preview.service';
import { DocumentosUploadService } from './documentos-upload.service';


@Module({
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository, DocumentosPreviewService, DocumentosUploadService],
})
export class DocumentosModule {}
