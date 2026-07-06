import { Module } from '@nestjs/common';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { DocumentoEventosModule } from '../documento-eventos/documento-eventos.module';
import { ExpedientesRepository } from './expedientes.repository';

@Module({
  imports: [DocumentoEventosModule],
  controllers: [ExpedientesController],
  providers: [ExpedientesService, ExpedientesRepository],
})
export class ExpedientesModule {}
