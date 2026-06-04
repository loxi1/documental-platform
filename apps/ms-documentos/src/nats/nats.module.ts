import { Global, Module } from '@nestjs/common';
import { NatsClientProvider } from './nats-client.provider';

@Global()
@Module({
  providers: [NatsClientProvider],
  exports: [NatsClientProvider],
})
export class NatsModule {}
