import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    accessToken: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().refine(value => Array.from(value).length >= 8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' }),
    confirmPassword: z.string().min(1),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'La confirmación no coincide con la nueva contraseña.',
      path: ['confirmPassword'],
    },
  );

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
