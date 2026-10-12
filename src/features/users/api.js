import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch } from '@/lib/api/client'
import { paginatedSchema } from '@/lib/pagination'

/** Usuario del panel tal como lo devuelve la API (supuesto C6). */
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  accountType: z.enum(['smarteam', 'cliente']),
  tenantKey: z.string().nullable(),
  companyName: z.string().nullable(),
  role: z.enum(['admin', 'usuario']).nullable(),
  active: z.boolean(),
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
})

const usersPageSchema = paginatedSchema(userSchema)
const createdUserSchema = z.object({ user: userSchema, temporaryPassword: z.string().min(1) })
const temporaryPasswordSchema = z.object({ temporaryPassword: z.string().min(1) })

export const USERS_QUERY_KEY = ['staff', 'users']

export const usersApi = {
  list: ({ page, pageSize, tenantKey }, signal) =>
    apiFetch('/staff/users', {
      query: { page, pageSize, tenantKey },
      signal,
      schema: usersPageSchema,
    }),
  create: (values) =>
    apiFetch('/staff/users', { method: 'POST', json: values, schema: createdUserSchema }),
  // La respuesta del PATCH no se usa (el spec no la define): se vuelve a pedir la lista.
  update: ({ id, ...changes }) =>
    apiFetch(`/staff/users/${encodeURIComponent(id)}`, { method: 'PATCH', json: changes }),
  resetPassword: (id) =>
    apiFetch(`/staff/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      schema: temporaryPasswordSchema,
    }),
}

/** Página de usuarios; mantiene la anterior mientras carga la siguiente. */
export function useUsers({ page, pageSize, tenantKey }) {
  const params = { page, pageSize, tenantKey: tenantKey || undefined }
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: ({ signal }) => usersApi.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

function useUsersMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  })
}

export const useCreateUser = () => useUsersMutation(usersApi.create)
export const useUpdateUser = () => useUsersMutation(usersApi.update)
export const useResetPassword = () => useUsersMutation(usersApi.resetPassword)
