import { z } from 'zod'

import { paginatedSchema } from '@/lib/pagination'

import { TICKET_CATEGORIES, TICKET_STATUSES } from './constants'

// Forma de las respuestas de Soporte: contrato docs/contrato-backend/02-soporte.md (D1 a D8).

const status = z.enum(TICKET_STATUSES)
const category = z.enum(TICKET_CATEGORIES)
const isoDate = z.string()
const actorType = z.enum(['cliente', 'smarteam', 'ia'])

/** D1. Ítem de la lista del cliente. */
export const ticketListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  category,
  status,
  createdBy: z.object({ name: z.string(), role: z.string().nullable().optional() }),
  openedAt: isoDate,
  lastActivityAt: isoDate,
  resolvedAt: isoDate.nullable(),
  reopenCount: z.number().int().min(0),
  hasNews: z.boolean(),
  contextType: z.enum(['webhookEvent', 'syncLog']).nullable(),
})

/** D2. Ítem de la bandeja de Smarteam. */
export const inboxItemSchema = ticketListItemSchema.extend({
  tenantKey: z.string(),
  companyName: z.string().nullable(),
  firstResponseAt: isoDate.nullable(),
})

export const ticketPageSchema = paginatedSchema(ticketListItemSchema)

export const inboxPageSchema = paginatedSchema(inboxItemSchema).extend({
  warnings: z
    .array(z.object({ tenantKey: z.string(), error: z.string().optional() }))
    .optional()
    .default([]),
})

/** D4. Mensaje. */
export const attachmentSchema = z.object({
  fileId: z.string(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
})

export const messageSchema = z.object({
  id: z.string(),
  authorType: actorType,
  authorName: z.string(),
  body: z.string(),
  attachments: z.array(attachmentSchema),
  createdAt: isoDate,
})

/** D5. Entrada de la historia de estados. */
export const statusHistorySchema = z.object({
  from: status.nullable(),
  to: status,
  byType: actorType,
  byName: z.string(),
  at: isoDate,
})

/** D3. Detalle (del cliente). Zod descarta los campos que no declara. */
export const ticketDetailSchema = ticketListItemSchema.extend({
  description: z.string(),
  /** Imágenes enviadas al crear el ticket. */
  attachments: z.array(attachmentSchema),
  firstResponseAt: isoDate.nullable(),
  context: z
    .object({
      type: z.enum(['webhookEvent', 'syncLog']),
      refId: z.string(),
      snapshot: z.unknown(),
    })
    .nullable(),
  messages: z.array(messageSchema),
  statusHistory: z.array(statusHistorySchema),
})

/** D3. Detalle de Smarteam: además empresa y resolución interna. */
export const staffTicketDetailSchema = ticketDetailSchema.extend({
  tenantKey: z.string(),
  companyName: z.string().nullable(),
  internalResolution: z
    .object({
      text: z.string(),
      updatedAt: isoDate,
      updatedBy: z.object({ name: z.string() }),
    })
    .nullable(),
})

/** D7. Respuesta de crear (solo se usa id y code). */
export const createdTicketSchema = z.object({ id: z.string(), code: z.string() })

/** D8. Resumen de la bandeja. */
const countsByStatus = z.object({
  abierto: z.number().int(),
  en_progreso: z.number().int(),
  esperando_cliente: z.number().int(),
  resuelto: z.number().int(),
})

export const inboxSummarySchema = z.object({
  byStatus: countsByStatus,
  byTenant: z.array(
    z.object({
      tenantKey: z.string(),
      companyName: z.string().nullable(),
      byStatus: countsByStatus,
    }),
  ),
})
