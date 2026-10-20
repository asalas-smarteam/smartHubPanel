import { z } from 'zod'

const text = z.string().nullable().optional()

/** Un mapeo de campo (contrato I2). Los textos pueden faltar o venir `null`. */
export const fieldMappingSchema = z.object({
  id: z.string(),
  sourceField: text,
  targetField: text,
  objectType: text,
  sourceContext: text,
  isActive: z.boolean(),
  editable: z.boolean(),
  includeInSourceQuery: z.boolean(),
  userField: z.boolean(),
})

/** `GET /field-mappings` (I1): todos los mapeos, sin paginar. */
export const fieldMappingsSchema = z.object({ items: z.array(fieldMappingSchema) })
