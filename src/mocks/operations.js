// Traducción de eventos y syncs internos a la forma del contrato (E1 a E8), como lo hará
// la API real. La usan los handlers y el contexto de los tickets del seed.
import { INTERNAL, SEED_OPERATIONS } from './seed-events'

/** Estado interno → genérico (E1). `report` no tiene equivalente: nunca sale. */
export const EVENT_STATUS_MAP = {
  waiting: 'waiting',
  [INTERNAL.IN_PROCESS]: 'in_process',
  [INTERNAL.ORDER_CREATED]: 'destination_created',
  [INTERNAL.CREATED_ORIGIN_ERROR]: 'destination_created_origin_error',
  completed: 'completed',
  errored: 'errored',
}

const TASK_TYPE_MAP = {
  [INTERNAL.RECORD_SYNC_TASK]: 'record_sync',
  [INTERNAL.DROPDOWN_TASK]: 'dropdown_options',
}

/** Evento visible (no es reporte de calidad). */
export const isListedEvent = (raw) => raw.status !== INTERNAL.REPORT

/**
 * Evento de la API. `withRaw`: suma `payload` y `audit` (solo Smarteam con staff.events.raw).
 * @param {object} raw
 * @param {{ withRaw?: boolean }} [options]
 */
export function toApiEvent(raw, { withRaw = false } = {}) {
  const event = {
    id: raw._id,
    type: raw.eventType,
    status: EVENT_STATUS_MAP[raw.status],
    retries: raw.retryCount,
    maxRetries: raw.maxRetries,
    lastError: raw.lastError ?? null,
    reference: raw.payload?.deal?.[INTERNAL.OBJECT_ID_FIELD] ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
  if (withRaw) {
    event.payload = structuredClone(raw.payload)
    event.audit = structuredClone(raw[INTERNAL.AUDIT_FIELD] ?? null)
  }
  return event
}

/** Tarea de la API (E8): solo id, nombre y tipo traducido. */
export function toApiTask(rawTask) {
  return { id: rawTask._id, name: rawTask.clientName, type: TASK_TYPE_MAP[rawTask.taskType] }
}

export function findTask(taskId) {
  return SEED_OPERATIONS.tasks.find((task) => task._id === taskId) ?? null
}

/** Corrida de la API (E5, E6), sin la lista de errores. */
export function toApiSync(raw) {
  return {
    id: raw._id,
    task: toApiTask(findTask(raw.clientConfigId)),
    objectType: raw.objectType ? raw.objectType.toLowerCase() : null,
    status: raw.status ?? 'running',
    counts: {
      processed: raw.recordsProcessed,
      sent: raw.sent,
      failed: raw.failed,
      updated: raw.updated,
      skipped: raw.skipped,
    },
    skippedReasons: raw.skippedReasons.map((entry) => ({ ...entry })),
    errorMessage: structuredClone(raw.errorMessage ?? null),
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt ?? null,
  }
}

export const tenantEvents = (tenantKey) =>
  SEED_OPERATIONS.events.filter((raw) => raw.tenantKey === tenantKey && isListedEvent(raw))
export const tenantSyncs = (tenantKey) =>
  SEED_OPERATIONS.syncs.filter((raw) => raw.tenantKey === tenantKey)
export const tenantTasks = (tenantKey) =>
  SEED_OPERATIONS.tasks.filter((task) => task.tenantKey === tenantKey)

/**
 * Registro enlazable como contexto de un ticket (`webhookEvent` o `syncLog`) de esa empresa,
 * con su `snapshot` en la forma del contrato. null si no existe o es de otra empresa.
 */
export function findContextRecord(tenantKey, type, id) {
  if (type === 'webhookEvent') {
    const raw = tenantEvents(tenantKey).find((event) => event._id === id)
    return raw ? { type, id, snapshot: toApiEvent(raw) } : null
  }
  if (type === 'syncLog') {
    const raw = tenantSyncs(tenantKey).find((sync) => sync._id === id)
    return raw ? { type, id, snapshot: toApiSync(raw) } : null
  }
  return null
}
