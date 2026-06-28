import { z } from 'zod';
import { selectWorkspaceSchema } from './select-workspace.schema';

const legacySelectContextSchema = z.object({
  usuarioId: z.coerce.number().int().min(1, 'usuarioId inválido'),
  sistema: z.string().min(1, 'sistema es obligatorio'),
  empresaCodigo: z.string().min(1, 'empresaCodigo es obligatorio'),
});

export const selectContextSchema = z.union([
  selectWorkspaceSchema,
  legacySelectContextSchema,
]);

export type SelectContextDto = z.infer<typeof selectContextSchema>;
