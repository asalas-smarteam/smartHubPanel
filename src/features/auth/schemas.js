import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 10

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo.').pipe(z.email('Escribe un correo válido.')),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`),
    confirmPassword: z.string().min(1, 'Repite la contraseña nueva.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'La contraseña nueva debe ser distinta de la actual.',
  })
