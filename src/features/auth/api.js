import { z } from 'zod'

import { apiFetch } from '@/lib/api/client'

/** Respuesta de GET /api/auth/me (contrato del spec). */
export const meSchema = z.object({
  name: z.string(),
  email: z.string(),
  accountType: z.enum(['smarteam', 'cliente']),
  role: z.enum(['admin', 'usuario']).nullable(),
  tenantKey: z.string().nullable(),
  companyName: z.string().nullable(),
  permissions: z.array(z.string()),
  mustChangePassword: z.boolean(),
})

export const authApi = {
  /** @param {AbortSignal} [signal] */
  me: (signal) => apiFetch('/auth/me', { signal, schema: meSchema }),
  /** El cuerpo de la respuesta no se usa: después del login se vuelve a pedir /me (plan §3.2 C4). */
  login: ({ email, password }) =>
    apiFetch('/auth/login', { method: 'POST', json: { email, password } }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  changePassword: ({ currentPassword, newPassword }) =>
    apiFetch('/auth/change-password', { method: 'POST', json: { currentPassword, newPassword } }),
}
