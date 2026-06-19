import { Module } from '@nestjs/common';
import { ExpedientesGatewayController } from './expedientes.controller';

@Module({
  controllers: [ExpedientesGatewayController],
})
export class ExpedientesGatewayModule {}
