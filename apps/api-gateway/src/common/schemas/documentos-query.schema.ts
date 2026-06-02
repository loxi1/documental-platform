import { z } from 'zod';

const numeroEntero = (campo: string) =>
  z.coerce.number({
    error: `${campo} debe ser un número válido`,
  }).int(`${campo} debe ser un número entero`);

export const documentosQuerySchema = z.object({
  cliente: z.string().optional(),
  tipo: z.string().optional(),

  anio: numeroEntero('El año')
    .min(2020, 'El año debe ser mayor o igual a 2020')
    .max(2100, 'El año debe ser menor o igual a 2100')
    .optional(),

  mes: numeroEntero('El mes')
    .min(1, 'El mes debe estar entre 1 y 12')
    .max(12, 'El mes debe estar entre 1 y 12')
    .optional(),

  limit: numeroEntero('El límite')
    .min(1, 'El límite debe ser mayor o igual a 1')
    .max(100, 'El límite máximo permitido es 100')
    .default(20),

  offset: numeroEntero('El desplazamiento')
    .min(0, 'El desplazamiento debe ser mayor o igual a 0')
    .default(0),
});

export type DocumentosQueryDto =
  z.infer<typeof documentosQuerySchema>;
