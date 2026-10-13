import { z } from 'zod'

import { paginatedSchema } from '@/lib/pagination'

import { EVENT_STATUSES } from './constants'

/** Evento de la lista y del detalle del cliente (contrato E1 a E4). */
export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(EVENT_STATUSES),
  retries: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  lastError: z.string().nullable(),
  reference: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const eventPageSchema = paginatedSchema(eventSchema)

/**
 * Detalle para Smarteam: suma `payload` y `audit` solo con `staff.events.raw`.
 * En el esquema del cliente esos campos no existen: si llegaran por error, Zod los descarta.
 */
export const staffEventDetailSchema = eventSchema.extend({
  payload: z.unknown().optional(),
  audit: z.unknown().optional(),
})
