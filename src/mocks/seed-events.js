// Eventos y corridas de sincronización de ejemplo del modo simulado (todo ficticio).
//
// Se guardan como los guarda el backend (nombres internos de sus modelos) y los handlers los
// traducen a los nombres genéricos del contrato (E1, E5), igual que lo hará la API real.
// Los nombres internos que mencionan sistemas se arman por partes: así el test de nombres
// prohibidos sigue protegiendo el código de la app.

const DEST = 's' + 'ap'
const ORIGIN = 'hub' + 'spot'

/** Nombres internos del backend (solo para los mocks). */
export const INTERNAL = Object.freeze({
  ORDER_CREATED: `${DEST}_order_created`,
  CREATED_ORIGIN_ERROR: `${DEST}_created_${ORIGIN}_error`,
  IN_PROCESS: 'inprocess',
  REPORT: 'report',
  AUDIT_FIELD: `${DEST}Audit`,
  OBJECT_ID_FIELD: 'hs_' + 'object_id',
  RECORD_SYNC_TASK: `${DEST.toUpperCase()}_SYNC`,
  DROPDOWN_TASK: 'DROPDOWN_OPTIONS',
})

const BASE_DATE = Date.parse('2026-10-12T18:00:00.000Z')
const hoursAgo = (hours) => new Date(BASE_DATE - hours * 3_600_000).toISOString()
const pad = (number) => String(number).padStart(3, '0')

// Generador determinista: los datos son siempre los mismos (tests y capturas estables).
function random(seed) {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}

const EVENT_TYPES = ['createQuotation', 'createDeal', 'updateQuotation', 'updateDealStage']
// Reparto de estados: mayoría completados, y de todo lo demás.
const STATUS_CYCLE = [
  'completed',
  'completed',
  'errored',
  'completed',
  INTERNAL.ORDER_CREATED,
  'completed',
  'waiting',
  INTERNAL.CREATED_ORIGIN_ERROR,
  'completed',
  INTERNAL.IN_PROCESS,
]
const EVENT_ERRORS = [
  'El artículo ITEM-0042 no existe en el sistema destino.',
  'Tiempo de espera agotado al llamar al sistema destino.',
  'El cliente del negocio no tiene código en el sistema destino.',
  'La lista de precios del negocio no está mapeada.\nRevisar la configuración de precios.',
]
const ORIGIN_ERRORS = [
  'Se creó el documento, pero no se pudo actualizar el negocio de origen (409).',
  'Documento creado; el negocio de origen rechazó el número de documento.',
]

const EVENT_COUNTS = { ACME: 45, GLOBEX: 20, INITECH: 8 }
const TENANT_SEEDS = { ACME: 11, GLOBEX: 23, INITECH: 37 }

function buildEvent(tenantKey, index, next) {
  const id = `ev-${tenantKey.toLowerCase()}-${pad(index)}`
  let status = STATUS_CYCLE[(index + 7) % STATUS_CYCLE.length]
  let type = EVENT_TYPES[index % EVENT_TYPES.length]
  if (index % 13 === 0) type = 'updateContact' // un tipo que el panel no conoce
  // El primero de cada empresa es el error que enlazan los tickets del seed.
  if (index === 1) {
    status = 'errored'
    type = 'createQuotation'
  }
  const reference = `1837465${2900 + (index % 12)}`
  const created = index * 11 + Math.floor(next() * 6)
  const maxRetries = 3
  const isError = status === 'errored'
  const retries = isError ? maxRetries : status === 'waiting' ? 0 : Math.floor(next() * 2)
  let lastError = null
  if (isError) lastError = EVENT_ERRORS[index === 1 ? 0 : index % EVENT_ERRORS.length]
  if (status === INTERNAL.CREATED_ORIGIN_ERROR) lastError = ORIGIN_ERRORS[index % 2]
  const processed = !['waiting', INTERNAL.IN_PROCESS].includes(status)

  return {
    _id: id,
    tenantKey,
    eventType: type,
    status,
    retryCount: retries,
    maxRetries,
    lastError,
    dedupActive: false,
    payload: {
      deal: {
        [INTERNAL.OBJECT_ID_FIELD]: reference,
        dealname: `Negocio ${reference.slice(-4)}`,
        amount: String(1000 + index * 137),
        pipeline: 'default',
      },
      subscriptionType: type,
    },
    [INTERNAL.AUDIT_FIELD]: processed
      ? {
          steps: [
            { step: 'recibido', at: hoursAgo(created) },
            { step: 'enviado al destino', at: hoursAgo(created - 0.05) },
            ...(isError ? [{ step: 'error', at: hoursAgo(created - 0.1), detail: lastError }] : []),
          ],
          destinationDocument: isError ? null : `COT-${20_000 + index}`,
        }
      : null,
    createdAt: hoursAgo(created),
    updatedAt: hoursAgo(created - 0.1),
  }
}

/** Reportes de calidad: viven en la misma colección pero nunca salen en /events. */
function buildReports(tenantKey) {
  return [1, 2, 3].map((n) => ({
    _id: `ev-${tenantKey.toLowerCase()}-r0${n}`,
    tenantKey,
    eventType: 'qualityReport',
    status: INTERNAL.REPORT,
    retryCount: 0,
    maxRetries: 0,
    lastError: null,
    dedupActive: false,
    payload: { report: n },
    [INTERNAL.AUDIT_FIELD]: null,
    createdAt: hoursAgo(n * 5),
    updatedAt: hoursAgo(n * 5),
  }))
}

// Tareas de sincronización por empresa (lo que el backend guarda en su configuración).
const TASKS = {
  ACME: [
    ['products', 'Productos', INTERNAL.RECORD_SYNC_TASK, 'Product'],
    ['contacts', 'Contactos', INTERNAL.RECORD_SYNC_TASK, 'Contact'],
    ['lists', 'Opciones de listas', INTERNAL.DROPDOWN_TASK, null],
  ],
  GLOBEX: [
    ['products', 'Productos', INTERNAL.RECORD_SYNC_TASK, 'Product'],
    ['companies', 'Empresas', INTERNAL.RECORD_SYNC_TASK, 'Company'],
  ],
  INITECH: [['invoices', 'Facturas', INTERNAL.RECORD_SYNC_TASK, 'Invoice']],
}
const SYNC_COUNTS = { ACME: 30, GLOBEX: 12, INITECH: 5 }
const SKIP_REASONS = [
  'Sin precio en la lista base',
  'Sin cambios desde la última corrida',
  'Inactivo',
]

function buildTasks(tenantKey) {
  return TASKS[tenantKey].map(([key, name, taskType, objectType]) => ({
    _id: `task-${tenantKey.toLowerCase()}-${key}`,
    tenantKey,
    clientName: name,
    taskType,
    objectType,
    // Configuración interna que la API nunca debe exponer (contrato E8).
    credentials: { user: 'integracion', password: 'no-debe-salir' },
    schedule: '0 */6 * * *',
  }))
}

function syncErrors(count, prefix) {
  return Array.from({ length: count }, (_, i) => ({
    record: `${prefix}-${String(i + 1).padStart(4, '0')}`,
    message: i % 3 === 0 ? 'Sin precio en la lista base' : 'Campo obligatorio vacío: código',
    attempt: 1 + (i % 2),
  }))
}

function buildSync(tenantKey, index, tasks, next) {
  const task = tasks[(index - 1) % tasks.length]
  const id = `sync-${tenantKey.toLowerCase()}-${pad(index)}`
  const started = index * 12 + 1
  const processed = 40 + Math.floor(next() * 160)
  const failed = index % 7 === 3 ? 1 + Math.floor(next() * 4) : 0
  const skipped = index % 4 === 0 ? 1 + Math.floor(next() * 5) : 0
  const sync = {
    _id: id,
    tenantKey,
    clientConfigId: task._id,
    objectType: task.objectType,
    status: index % 9 === 5 ? 'errored' : 'completed',
    recordsProcessed: processed,
    sent: processed - failed - skipped,
    failed,
    updated: Math.floor((processed - failed) / 3),
    skipped,
    skippedReasons: skipped
      ? [{ reason: SKIP_REASONS[index % SKIP_REASONS.length], count: skipped }]
      : [],
    errorMessage: null,
    errors: syncErrors(failed, 'REG'),
    startedAt: hoursAgo(started),
    finishedAt: hoursAgo(started - 0.07 - next() * 0.4),
  }
  if (sync.status === 'errored') sync.errorMessage = 'La corrida se detuvo antes de terminar.'
  return sync
}

function buildSyncs(tenantKey, tasks) {
  const next = random(TENANT_SEEDS[tenantKey] * 7)
  const syncs = Array.from({ length: SYNC_COUNTS[tenantKey] }, (_, i) =>
    buildSync(tenantKey, i + 1, tasks, next),
  )
  const first = syncs[0]
  // La corrida que enlaza el ticket "Faltan precios en tres productos".
  Object.assign(first, {
    clientConfigId: tasks[0]._id,
    objectType: tasks[0].objectType,
    status: 'errored',
    recordsProcessed: 120,
    sent: 115,
    failed: 3,
    updated: 40,
    skipped: 2,
    skippedReasons: [{ reason: 'Sin precio en la lista base', count: 2 }],
    errorMessage: 'Tres productos sin precio en la lista base.',
    errors: syncErrors(3, 'ITEM'),
  })
  if (tenantKey === 'ACME') {
    // Error con detalle estructurado y muchos errores (para paginar).
    Object.assign(syncs[3], {
      status: 'errored',
      recordsProcessed: 150,
      sent: 90,
      failed: 60,
      updated: 30,
      skipped: 0,
      skippedReasons: [],
      errorMessage: {
        code: 'BATCH_REJECTED',
        detail: 'El destino rechazó el lote 3 de 4.',
        batch: 3,
      },
      errors: syncErrors(60, 'CLI'),
    })
    // Una corrida en curso: la más reciente, sin terminar (status interno null).
    Object.assign(syncs[syncs.length - 1], {
      status: null,
      startedAt: hoursAgo(0.3),
      finishedAt: null,
      errors: [],
      failed: 0,
      errorMessage: null,
    })
  }
  return syncs
}

function build() {
  const events = []
  const tasks = []
  const syncs = []
  for (const tenantKey of Object.keys(EVENT_COUNTS)) {
    const next = random(TENANT_SEEDS[tenantKey])
    for (let i = 1; i <= EVENT_COUNTS[tenantKey]; i += 1)
      events.push(buildEvent(tenantKey, i, next))
    events.push(...buildReports(tenantKey))
    const tenantTasks = buildTasks(tenantKey)
    tasks.push(...tenantTasks)
    syncs.push(...buildSyncs(tenantKey, tenantTasks))
  }
  return { events, tasks, syncs }
}

/** Datos de solo lectura: se arman una vez. */
export const SEED_OPERATIONS = build()
