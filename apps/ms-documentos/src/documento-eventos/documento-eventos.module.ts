import { Module } from '@nestjs/common';

import { DocumentoEventosRepository } from './documento-eventos.repository';
import { DocumentoEventosService } from './documento-eventos.service';

@Module({
  providers: [DocumentoEventosRepository, DocumentoEventosService],
  exports: [DocumentoEventosService],
})
export class DocumentoEventosModule {}
