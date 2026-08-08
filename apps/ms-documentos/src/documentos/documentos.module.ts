import { Module } from '@nestjs/common';

import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';
import { DocumentalV2Module } from '../documental-v2/documental-v2.module';
import { OrquestarConfirmacionDocumentalV2UseCase } from '../documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase';
import { CARGA_SEGURA_STORAGE } from './carga-segura/carga-segura.constants';
import { CargaSeguraCompensation } from './carga-segura/carga-segura.compensation';
import { CargaSeguraPersistence } from './carga-segura/carga-segura.persistence';
import { CargaSeguraRepository } from './carga-segura/carga-segura.repository';
import { CargaSeguraService } from './carga-segura/carga-segura.service';
import { CargaSeguraController } from './carga-segura/http/carga-segura.controller';
import { R2CargaSeguraStorage } from './carga-segura/carga-segura.storage';
import { DocumentosController } from './documentos.controller';
import { DocumentosPreviewService } from './documentos-preview.service';
import { DocumentosRepository } from './documentos.repository';
import { DocumentosService } from './documentos.service';
import { DocumentosUploadService } from './documentos-upload.service';

@Module({
  imports: [DocumentoEventosModule, DocumentalV2Module],
  controllers: [DocumentosController, CargaSeguraController],
  providers: [
    DocumentosService,
    DocumentosRepository,
    OrquestarConfirmacionDocumentalV2UseCase,
    DocumentosPreviewService,
    DocumentosUploadService,
    CargaSeguraRepository,
    CargaSeguraPersistence,
    R2CargaSeguraStorage,
    {
      provide: CARGA_SEGURA_STORAGE,
      useExisting: R2CargaSeguraStorage,
    },
    CargaSeguraCompensation,
    CargaSeguraService,
  ],
  exports: [CargaSeguraService],
})
export class DocumentosModule {}
