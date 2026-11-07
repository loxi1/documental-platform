import { Provider } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const NATS_CLIENT = 'NATS_CLIENT';

export const NatsClientProvider: Provider = {
  provide: NATS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const namespace = config.get<string>('AUTH_NATS_NAMESPACE') ?? 'auth';
    if (namespace !== 'auth' && namespace !== 'dev.source.auth') {
      throw new Error('AUTH_NATS_NAMESPACE inválido');
    }
    const client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: [config.get<string>('nats.url') ?? 'nats://localhost:4222'],
      },
    });
    const send: typeof client.send = client.send.bind(client);
    client.send = <TResult = any, TInput = any>(pattern: any, data: TInput) =>
      send<TResult, TInput>(
        typeof pattern === 'string' && pattern.startsWith('auth.')
          ? `${namespace}${pattern.slice(4)}`
          : pattern,
        data,
      );
    return client;
  },
};
