import {
  createServiceEnvSchema,
  validateEnv,
} from '@documental/config';

export default () => {
  const env = validateEnv(
    createServiceEnvSchema('MS_AUTH_PORT'),
  );

  return {
    app: {
      port: env.MS_AUTH_PORT,
      name: 'ms-auth',
      nodeEnv: env.NODE_ENV,
      logLevel: env.LOG_LEVEL,
    },

    database: {
      url: env.DATABASE_URL,
    },

    nats: {
      url: env.NATS_URL,
    },
  };
};
