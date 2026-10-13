import { z } from 'zod'

import { paginatedSchema } from '@/lib/pagination'

import { OBJECT_TYPES, SYNC_STATUSES } from './constants'

export const syncTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['record_sync', 'dropdown_options']),
})

/** Tareas para el filtro (contrato E8, sin paginar). */
export const syncTasksSchema = z.object({ items: z.array(syncTaskSchema) })

const count = z.number().int().min(0)

/** Corrida de la lista (contrato E5 y E6). */
export const syncSchema = z.object({
  id: z.string(),
  task: syncTaskSchema,
  objectType: z.enum(OBJECT_TYPES).nullable(),
  status: z.enum(SYNC_STATUSES),
  counts: z.object({
    processed: count,
    sent: count,
    failed: count,
    updated: count,
    skipped: count,
  }),
  skippedReasons: z.array(z.object({ reason: z.string(), count })),
  // Texto, objeto o null (contrato E7).
  errorMessage: z.unknown().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
})

export const syncPageSchema = paginatedSchema(syncSchema)

/** Detalle: la corrida más sus errores paginados (contrato E7). Cada error es JSON libre. */
export const syncDetailSchema = syncSchema.extend({
  errors: paginatedSchema(z.unknown()),
})
