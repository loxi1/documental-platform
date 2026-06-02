import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { GruposRepository } from './grupos.repository';

@Module({
  controllers: [GruposController],
  providers: [GruposService, GruposRepository],
})
export class GruposModule {}
