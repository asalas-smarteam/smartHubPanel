// Traducción de eventos y syncs internos a la forma del contrato (E1 a E8), como lo hará
// la API real. La usan los handlers y el contexto de los tickets del seed.
import { classifyError } from './error-causes'
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

/** Tarea de las corridas de la cola de webhooks (plan 5 del backend, G1). */
export const EVENT_QUEUE_TASK = Object.freeze({
  id: 'event_queue',
  name: 'Cola de eventos',
  type: 'event_queue',
})

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
    // Causa del último error con el catálogo de ejemplo (G3, mismas causas que F5).
    cause: raw.lastError ? classifyError(raw.lastError) : null,
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

/** Claves que nunca le llegan al cliente dentro de `exchange` (contraseñas, tokens…). */
const SECRET_KEY = /pass(word)?|token|secret/i

function withoutSecrets(value) {
  if (Array.isArray(value)) return value.map(withoutSecrets)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEY.test(key))
        .map(([key, inner]) => [key, withoutSecrets(inner)]),
    )
  }
  return value
}

/**
 * Lo recibido, lo enviado y la respuesta (plan 4i), solo en el detalle. `client`: sin secretos.
 * @param {object} raw
 * @param {{ client?: boolean }} [options]
 */
export function toApiExchange(raw, { client = false } = {}) {
  const audit = raw[INTERNAL.AUDIT_FIELD] ?? {}
  const exchange = {
    received: structuredClone(raw.payload ?? null),
    sent: structuredClone(audit[INTERNAL.SENT_FIELD] ?? null),
    response: structuredClone(audit[INTERNAL.RESPONSE_FIELD] ?? null),
  }
  return client ? withoutSecrets(exchange) : exchange
}

/** Tarea de la API (E8): solo id, nombre y tipo traducido. */
export function toApiTask(rawTask) {
  return { id: rawTask._id, name: rawTask.clientName, type: TASK_TYPE_MAP[rawTask.taskType] }
}

export function findTask(taskId) {
  return SEED_OPERATIONS.tasks.find((task) => task._id === taskId) ?? null
}

/** Tarea de una corrida, o null si ya no existe. */
function taskOf(taskId) {
  const task = findTask(taskId)
  return task ? toApiTask(task) : null
}

/**
 * Vista de cliente de una corrida (G4): un error guardado como objeto o lista se resume en
 * texto, porque puede traer requests y respuestas internas. Smarteam la ve cruda.
 */
export function toClientSync(raw) {
  const sync = toApiSync(raw)
  if (sync.errorMessage !== null && typeof sync.errorMessage === 'object') {
    sync.errorMessage = { summary: `${raw.failed} error(es) en la corrida` }
  }
  return sync
}

/** Errores de una corrida en la vista de cliente (G4): solo registro y mensaje. */
export const toClientSyncError = (error) => ({
  record: error?.record != null ? String(error.record) : null,
  message: typeof error?.message === 'string' ? error.message : null,
  ...(typeof error?.eventId === 'string' ? { eventId: error.eventId } : {}),
})

/** Corrida de la API (E5, E6), sin la lista de errores. */
export function toApiSync(raw) {
  return {
    id: raw._id,
    task: raw.queue ? { ...EVENT_QUEUE_TASK } : taskOf(raw.clientConfigId),
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
    // El snapshot es la vista de cliente: el cliente lo ve en su ticket (G5).
    return raw ? { type, id, snapshot: toClientSync(raw) } : null
  }
  return null
}
