import { z } from 'zod';

export const selectWorkspaceSchema = z.object({
  identityToken: z.string().min(10, 'identityToken es obligatorio'),
  workspaceId: z.coerce.number().int().min(1, 'workspaceId inválido'),
  recordar: z.boolean().optional().default(false),
});

export type SelectWorkspaceDto = z.infer<typeof selectWorkspaceSchema>;
