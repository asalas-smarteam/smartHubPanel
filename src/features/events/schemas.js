import { z } from 'zod'

import { paginatedSchema } from '@/lib/pagination'

import { EVENT_STATUSES } from './constants'

/** Evento de la lista y del detalle del cliente (contrato E1 a E4). */
export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  // null: estado interno que el backend todavía no traduce (lo loguea); se muestra "Desconocido".
  status: z.enum(EVENT_STATUSES).nullable(),
  // Evento que corrigió este error: lo agrega el front (plan 4k-bis), la API no lo manda.
  correctedBy: z.object({ id: z.string(), at: z.string() }).nullable().optional(),
  retries: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  lastError: z.string().nullable(),
  // Causa del último error (plan 5 del backend, G3); null si no hay error. `group` es texto
  // libre: un grupo nuevo se muestra como "Otro".
  cause: z.object({ key: z.string(), label: z.string(), group: z.string() }).nullable().optional(),
  reference: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const eventPageSchema = paginatedSchema(eventSchema)

/**
 * Lo recibido del CRM, lo enviado al ERP y su respuesta (plan 4i). Solo en el detalle; cada parte
 * es JSON libre o null. Al cliente le llega saneado (sin credenciales).
 */
export const exchangeSchema = z.object({
  received: z.unknown().optional(),
  sent: z.unknown().optional(),
  response: z.unknown().optional(),
})

/** Detalle del cliente: el evento y, si el backend lo manda, `exchange`. */
export const eventDetailSchema = eventSchema.extend({
  exchange: exchangeSchema.nullable().optional(),
})

/**
 * Detalle para Smarteam: suma `payload` y `audit` solo con `staff.events.raw`.
 * En el esquema del cliente esos campos no existen: si llegaran por error, Zod los descarta.
 */
export const staffEventDetailSchema = eventDetailSchema.extend({
  payload: z.unknown().optional(),
  audit: z.unknown().optional(),
})
