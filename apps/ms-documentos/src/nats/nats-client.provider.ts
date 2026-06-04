import { Provider } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const NATS_CLIENT = 'NATS_CLIENT';

export const NatsClientProvider: Provider = {
  provide: NATS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: [config.get<string>('nats.url') ?? 'nats://localhost:4222'],
      },
    });
  },
};
