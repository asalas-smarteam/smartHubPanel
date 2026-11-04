import { z } from 'zod'

// Tokens personales de la API (plan 4z): contrato docs/contrato-backend/12-registro-trabajo.md.

/** Máximo de tokens activos por cuenta (la API responde 409 token_limit al pasarse). */
export const MAX_ACTIVE_TOKENS = 5
/** Días que dura un token desde que se crea. */
export const TOKEN_TTL_DAYS = 90
/** Desde cuántos días antes del vencimiento se marca en ámbar. */
export const TOKEN_EXPIRY_WARNING_DAYS = 7
export const TOKEN_NAME_MAX = 60

const isoDate = z.string()

export const apiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  createdAt: isoDate,
  lastUsedAt: isoDate.nullable(),
  expiresAt: isoDate,
})

export const apiTokenListSchema = z.object({ items: z.array(apiTokenSchema) })

export const createdApiTokenSchema = z.object({ token: z.string().min(1), item: apiTokenSchema })

/** ¿Tiene caracteres de control (C0, DEL o C1)? La API los rechaza en el nombre. */
const hasControlChars = (text) =>
  Array.from(text).some((char) => {
    const code = char.codePointAt(0)
    return code < 0x20 || (code >= 0x7f && code <= 0x9f)
  })

/** Crear un token pide el nombre y la contraseña actual (decisión de producto del plan 4z). */
export const createApiTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe un nombre para reconocerlo.')
    .max(TOKEN_NAME_MAX, `Máximo ${TOKEN_NAME_MAX} caracteres.`)
    .refine((name) => !hasControlChars(name), 'El nombre tiene caracteres no permitidos.'),
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
})
