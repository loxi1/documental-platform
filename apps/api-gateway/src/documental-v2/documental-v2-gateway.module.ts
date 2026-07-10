import { Module } from '@nestjs/common';

import { DocumentalV2GatewayController } from './documental-v2-gateway.controller';

@Module({
  controllers: [DocumentalV2GatewayController],
})
export class DocumentalV2GatewayModule {}
