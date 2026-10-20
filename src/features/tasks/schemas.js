import { z } from 'zod'

const text = z.string().nullable().optional()
const iso = z.string().nullable().optional()

const filterSchema = z.object({
  property: text,
  operator: text,
  value: z.unknown().optional(),
  isDefault: z.boolean(),
  isDynamic: z.boolean(),
  dynamicType: text,
  editable: z.boolean(),
})

/** Una tarea programada (contrato J2). */
export const scheduledTaskSchema = z.object({
  id: z.string(),
  name: text,
  type: text,
  objectType: text,
  sourcePath: text,
  mode: z.string(),
  schedule: z.object({
    intervalMinutes: z.number().nullable().optional(),
    times: z.array(z.string()).default([]),
    days: z.array(z.string()).default([]),
    startTime: text,
    endTime: text,
    timeZone: text,
  }),
  batchSize: z.number().nullable().optional(),
  associationsEnabled: z.boolean(),
  requireCrmIdUpdate: z.boolean(),
  filters: z.array(filterSchema).default([]),
  orderBy: z.array(z.object({ property: text, direction: z.string() })).default([]),
  active: z.boolean(),
  lastRunAt: iso,
  lastError: text,
  // Opcional (J5): próxima ejecución según el programador.
  nextRunAt: iso,
})

/** `GET /scheduled-tasks` (J1): todas las tareas, sin paginar. */
export const scheduledTasksSchema = z.object({ items: z.array(scheduledTaskSchema) })
