import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsModule } from './nats/nats.module';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentosModule } from './documentos/documentos.module';
import { GruposModule } from './grupos/grupos.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [configuration],
    }),
    DocumentosModule,
    GruposModule,
    NatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
