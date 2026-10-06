import { Module } from '@nestjs/common';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';
import { ExpedientesRepository } from './expedientes.repository';
import { DocumentalV2Module } from '../documental-v2/documental-v2.module';

@Module({
  imports: [DocumentoEventosModule, DocumentalV2Module],
  controllers: [ExpedientesController],
  providers: [ExpedientesService, ExpedientesRepository],
})
export class ExpedientesModule {}
