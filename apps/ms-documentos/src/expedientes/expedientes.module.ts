import { Module } from '@nestjs/common';
import {
  ExpedientesImportacionService,
} from './expedientes-importacion.service';
import {
  ExpedientesImportacionRepository,
} from './expedientes-importacion.repository';
import { ArchivadoCoreModule } from '../documentos/archivado/archivado-core.module';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';
import { ExpedientesRepository } from './expedientes.repository';
import { DocumentalV2Module } from '../documental-v2/documental-v2.module';

@Module({
  imports: [
    DocumentoEventosModule,
    DocumentalV2Module,
    ArchivadoCoreModule,
  ],
  controllers: [ExpedientesController],
  providers: [
    ExpedientesService,
    ExpedientesRepository,
    ExpedientesImportacionService,
    ExpedientesImportacionRepository,
  ],
})
export class ExpedientesModule {}
