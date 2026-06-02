import { z } from 'zod';

export const selectContextSchema = z.object({
  usuarioId: z.coerce.number().int().min(1, 'usuarioId inválido'),
  sistema: z.string().min(1, 'sistema es obligatorio'),
  empresaCodigo: z.string().min(1, 'empresaCodigo es obligatorio'),
});

export type SelectContextDto = z.infer<typeof selectContextSchema>;
