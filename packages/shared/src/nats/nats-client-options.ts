export type NatsClientOptions = {
  servers: string;
  timeout?: number;
};

export function createNatsClientOptions(
  natsUrl: string,
  timeout = 1000,
): NatsClientOptions {
  return {
    servers: natsUrl,
    timeout,
  };
}
