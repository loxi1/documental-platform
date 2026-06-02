import {
  createServiceEnvSchema,
  validateEnv,
} from '@documental/config';

export default () => {
  const env = validateEnv(
    createServiceEnvSchema('API_GATEWAY_PORT'),
  );

  return {
    app: {
      port: env.API_GATEWAY_PORT,
      name: 'api-gateway',
      nodeEnv: env.NODE_ENV,
      logLevel: env.LOG_LEVEL,
    },

    nats: {
      url: env.NATS_URL,
    },
  };
};
