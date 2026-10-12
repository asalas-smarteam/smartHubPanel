import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'Escribe el correo.')
  .pipe(z.email('Escribe un correo válido.'))
const name = z.string().trim().min(1, 'Escribe el nombre.').max(120, 'Máximo 120 caracteres.')
const role = z.enum(['admin', 'usuario'], { error: 'Elige el rol.' })

/** Alta de usuario: si es de cliente, empresa y rol son obligatorios. */
export const createUserSchema = z.discriminatedUnion('accountType', [
  z.object({ accountType: z.literal('smarteam'), email, name }),
  z.object({
    accountType: z.literal('cliente'),
    email,
    name,
    tenantKey: z.string().min(1, 'Elige la empresa.'),
    role,
  }),
])

export const changeRoleSchema = z.object({ role })

export const ROLE_LABELS = { admin: 'Admin', usuario: 'Usuario' }
export const ACCOUNT_TYPE_LABELS = { smarteam: 'Smarteam', cliente: 'Cliente' }
