import { z } from 'zod'

import { EVENT_STATUSES } from '@/features/events/constants'

const count = z.number().int().min(0)
const seconds = z.number().min(0).nullable()

export const periodSchema = z.object({ from: z.string(), to: z.string(), tz: z.string() })

/** Resumen de integración (contrato F2). `group` es texto libre: uno nuevo se muestra como "Otro". */
export const integrationSummarySchema = z.object({
  period: periodSchema,
  totals: z.object({
    documents: count,
    created: count,
    // Errores que un reintento dejó bien: los calcula el front (plan 4k-bis); la API no lo manda.
    corrected: count.default(0),
    errored: count,
    pending: count,
    references: count,
    referencesWithoutDocument: count,
    avgDurationSeconds: seconds,
    avgDurationCreatedSeconds: seconds,
    oldestPendingAt: z.string().nullable(),
  }),
  byDay: z.array(
    z.object({
      date: z.string(),
      created: count,
      corrected: count.default(0),
      errored: count,
      pending: count,
    }),
  ),
  causes: z.array(z.object({ key: z.string(), label: z.string(), group: z.string(), count })),
  groups: z.array(z.object({ key: z.string(), count })),
  multiAttempt: z.object({
    total: count,
    items: z.array(
      z.object({
        reference: z.string(),
        title: z.string().nullable(),
        attempts: count,
        resolvedAfterSeconds: seconds,
        steps: z.array(
          z.object({
            at: z.string(),
            status: z.enum(EVENT_STATUSES).nullable(),
            summary: z.string(),
            documentNumber: z.string().nullable(),
          }),
        ),
      }),
    ),
  }),
})
