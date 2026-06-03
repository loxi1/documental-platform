import { Module } from '@nestjs/common';
import { DocumentosGatewayController } from './documentos.controller';

@Module({
  controllers: [DocumentosGatewayController],
})
export class DocumentosGatewayModule {}
