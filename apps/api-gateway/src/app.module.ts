import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { NatsModule } from './nats/nats.module';
import { DocumentosGatewayModule } from './documentos/documentos.module';
import { ExpedientesGatewayModule } from './expedientes/expedientes.module';
import { DocumentalV2GatewayModule } from './documental-v2/documental-v2-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [configuration],
    }),
    NatsModule,
    AuthModule,
    DocumentosGatewayModule,
    ExpedientesGatewayModule,
    DocumentalV2GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
