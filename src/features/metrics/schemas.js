import { z } from 'zod'

import { periodSchema } from '@/features/dashboard/schemas'

const count = z.number().int().min(0)
const seconds = z.number().min(0).nullable()

/** Rangos de tiempo de resolución (F8), en orden. */
export const BUCKET_KEYS = ['lt4h', '4h_24h', '1d_3d', 'gt3d']

/** Métricas de tickets del cliente (F8). Sin `byTenant`: si llegara, Zod lo descarta. */
export const ticketMetricsSchema = z.object({
  period: periodSchema,
  totals: z.object({
    resolved: count,
    resolvedPreviousPeriod: count,
    reopened: count,
    open: count,
    openWithoutFirstResponse: count,
    medianFirstResponseSeconds: seconds,
    medianResolutionSeconds: seconds,
  }),
  byWeek: z.array(
    z.object({
      weekStart: z.string(),
      resolved: count,
      reopened: count,
      medianResolutionSeconds: seconds,
    }),
  ),
  buckets: z.array(z.object({ key: z.enum(BUCKET_KEYS), count })),
  byCategory: z.array(
    z.object({ category: z.string(), resolved: count, medianResolutionSeconds: seconds }),
  ),
})

/** Métricas de Smarteam: además, la tabla por empresa y, si alguna no respondió, `warnings` (G6). */
export const staffTicketMetricsSchema = ticketMetricsSchema.extend({
  warnings: z.array(z.object({ tenantKey: z.string(), error: z.string().optional() })).optional(),
  byTenant: z.array(
    z.object({
      tenantKey: z.string(),
      companyName: z.string().nullable(),
      resolved: count,
      medianFirstResponseSeconds: seconds,
      medianResolutionSeconds: seconds,
      reopened: count,
      open: count,
    }),
  ),
})
