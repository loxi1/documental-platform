import { z } from 'zod';

export const logLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);

export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  APP_NAME: z.string().min(1, 'APP_NAME es obligatorio'),

  LOG_LEVEL: logLevelSchema.default('info'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es obligatorio'),

  NATS_URL: z
    .string()
    .min(1, 'NATS_URL es obligatorio'),
  
  MS_DOCUMENTOS_URL: z.string().url().optional(),
});

export const servicePortSchema = z.coerce
  .number()
  .int('El puerto debe ser entero')
  .min(1, 'El puerto debe ser mayor a 0')
  .max(65535, 'El puerto debe ser menor o igual a 65535');

export function validateEnv<T extends z.ZodType>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errors = result.error.flatten();

    throw new Error(
      `Variables de entorno inválidas: ${JSON.stringify(errors, null, 2)}`,
    );
  }

  return result.data;
}

export function createServiceEnvSchema(portKey: string) {
  return baseEnvSchema.extend({
    [portKey]: servicePortSchema,
  });
}
