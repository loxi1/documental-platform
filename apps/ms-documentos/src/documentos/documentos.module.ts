import { TmpController } from './tmp/tmp.controller';
import { OrdenPagoCreacionController } from './orden-pago/orden-pago-creacion.controller';
import { OrdenPagoArchivoService } from './orden-pago/orden-pago-archivo.service';
import { OrdenPagoArchivoRepository } from './orden-pago/orden-pago-archivo.repository';
import { TmpService } from './tmp/tmp.service';
import { TmpRepository } from './tmp/tmp.repository';
import { FacturaTempMaterializationController } from './factura-temp/factura-temp-materialization.controller';
import { FacturaTempMaterializationRepository } from './factura-temp/factura-temp-materialization.repository';
import { FacturaTempMaterializationService } from './factura-temp/factura-temp-materialization.service';
import { ReciboHonorarioTempMaterializationController } from './recibo-honorario-temp/recibo-honorario-temp-materialization.controller';
import { ReciboHonorarioTempMaterializationRepository } from './recibo-honorario-temp/recibo-honorario-temp-materialization.repository';
import { ReciboHonorarioTempMaterializationService } from './recibo-honorario-temp/recibo-honorario-temp-materialization.service';
import { Module } from '@nestjs/common';

import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';
import { DocumentalV2Module } from '../documental-v2/documental-v2.module';
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
  controllers: [DocumentosController, CargaSeguraController, TmpController, OrdenPagoCreacionController, FacturaTempMaterializationController, ReciboHonorarioTempMaterializationController],
  providers: [
    TmpService, TmpRepository,
    FacturaTempMaterializationRepository,
    FacturaTempMaterializationService,
    ReciboHonorarioTempMaterializationRepository,
    ReciboHonorarioTempMaterializationService,
    OrdenPagoArchivoService, OrdenPagoArchivoRepository,
    DocumentosService,
    DocumentosRepository,
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
