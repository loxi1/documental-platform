import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository'; import { DocumentosPreviewService } from './documentos-preview.service';
import { DocumentosUploadService } from './documentos-upload.service';
import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';


@Module({
  imports: [DocumentoEventosModule],
  controllers: [DocumentosController],
  providers: [DocumentosService, DocumentosRepository, DocumentosPreviewService, DocumentosUploadService],
})
export class DocumentosModule {}
