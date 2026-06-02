import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Debe ingresar un correo válido'),

  password: z
    .string()
    .min(1, 'Debe ingresar la contraseña'),
});

export type LoginDto = z.infer<typeof loginSchema>;
