import { ArchivadoMaterializacionService } from './archivado-materializacion.service';
import { Module } from '@nestjs/common';
import { NatsModule } from '../../nats/nats.module';
import { CargaSeguraStorageModule } from '../carga-segura/carga-segura-storage.module';
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { ArchivadoRuntimeService } from './archivado-runtime.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
@Module({
  imports: [NatsModule, CargaSeguraStorageModule],
  providers: [ArchivadoMaterializacionService, {provide:'ARCHIVADO_MATERIALIZACION',useExisting:ArchivadoMaterializacionService}, ArchivadoDocumentalService, ArchivadoRuntimeService, ArchivadoPostcommit],
  exports: [ArchivadoDocumentalService, ArchivadoRuntimeService, ArchivadoPostcommit, CargaSeguraStorageModule],
})
export class ArchivadoCoreModule {}
