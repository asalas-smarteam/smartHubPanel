import { z } from 'zod'

const text = z.string().nullable().optional()
/** Códigos del ERP: número (o texto, si el backend lo guarda así); `null` si no tiene. */
const code = z.union([z.number(), z.string()]).nullable().optional()

/** Un responsable (contrato N2). Lo que no está en el contrato, Zod lo descarta. */
export const ownerMappingSchema = z.object({
  id: z.string(),
  crmOwnerId: text,
  crmOwnerName: text,
  crmOwnerEmail: text,
  erpOwnerId: code,
  erpOwnerName: text,
  erpEmployeeId: code,
  active: z.boolean(),
  source: text,
  createdAt: text,
  updatedAt: text,
})

/** `GET /owner-mappings` (N1): todos, sin paginar. */
export const ownerMappingsSchema = z.object({ items: z.array(ownerMappingSchema) })
