import { z } from 'zod';

export const workspacesSchema = z.object({
  identityToken: z.string().min(10, 'identityToken es obligatorio'),
});

export type WorkspacesDto = z.infer<typeof workspacesSchema>;
