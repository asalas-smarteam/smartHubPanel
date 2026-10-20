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
  SENT_FIELD: `payload${DEST[0].toUpperCase()}${DEST.slice(1)}`,
  RESPONSE_FIELD: `response${DEST[0].toUpperCase()}${DEST.slice(1)}`,
  OBJECT_ID_FIELD: 'hs_' + 'object_id',
  RECORD_SYNC_TASK: `${DEST.toUpperCase()}_SYNC`,
  DROPDOWN_TASK: 'DROPDOWN_OPTIONS',
  // Entradas que la cola de eventos guarda en errorMessage (G7): recibido, enviado y respuestas.
  QUEUE_RECEIVED: `payload_${ORIGIN[0].toUpperCase()}${ORIGIN.slice(1)}`,
  QUEUE_SENT: `payload_${DEST.toUpperCase()}`,
  QUEUE_CRM_RESPONSE: `response_${ORIGIN}`,
  QUEUE_ERP_RESPONSE: `response_${DEST.toUpperCase()}`,
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
          // Lo enviado al destino y su respuesta (plan 4i: `exchange` en la API).
          [INTERNAL.SENT_FIELD]: {
            order: {
              CardCode: `C-${10_000 + index}`,
              NumAtCard: reference,
              DocumentLines: [{ ItemCode: `ITEM-${String(index).padStart(4, '0')}`, Quantity: 2 }],
            },
          },
          [INTERNAL.RESPONSE_FIELD]: {
            businessPartner: {
              CardCode: `C-${10_000 + index}`,
              ContactEmployees: [{ Name: 'Contacto de ejemplo', Password: '0000' }],
            },
            order: isError ? null : { DocNum: 20_000 + index },
          },
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

// Ids de tarea como los del backend (ObjectId de 24 caracteres hexadecimales), estables.
let taskSequence = 0
const taskId = () => `6acf${(taskSequence += 1).toString(16).padStart(20, '0')}`

function buildTasks(tenantKey) {
  return TASKS[tenantKey].map(([, name, taskType, objectType]) => ({
    _id: taskId(),
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

// Vueltas del procesador de la cola de webhooks (plan 5 del backend, G1): no tienen tarea
// configurada; casi todas vacías y una con un error guardado como objeto (G4).
function buildQueueSyncs(tenantKey) {
  const prefix = `sync-${tenantKey.toLowerCase()}-q`
  const empty = [1, 2, 3, 4].map((n) => ({
    _id: `${prefix}0${n}`,
    tenantKey,
    queue: true,
    clientConfigId: null,
    objectType: 'Deal',
    status: 'completed',
    recordsProcessed: 0,
    sent: 0,
    failed: 0,
    updated: 0,
    skipped: 0,
    skippedReasons: [],
    errorMessage: null,
    errors: [],
    startedAt: hoursAgo(1 + n),
    finishedAt: hoursAgo(1 + n - 0.0003),
  }))
  const withError = {
    ...empty[0],
    _id: `${prefix}05`,
    recordsProcessed: 3,
    sent: 2,
    failed: 1,
    // Lo que hoy guarda la cola: request y respuesta internas (solo Smarteam las ve crudas).
    errorMessage: {
      request: { method: 'POST', url: 'https://erp.interno.local:50000/Quotations' },
      response: { status: 500, body: 'Respuesta inesperada del servidor (500).' },
    },
    errors: [
      {
        record: '18493000123',
        message: 'Respuesta inesperada del servidor (500).',
        eventId: 'ev-acme-001',
        response: { status: 500 },
      },
    ],
    startedAt: hoursAgo(6),
    finishedAt: hoursAgo(5.99),
  }
  // Caso real de Printer (plan 4g): la cola registra el fallo pero guarda el detalle solo en
  // errorMessage; `errors` queda vacío y el cliente ve únicamente el resumen.
  const withoutDetail = {
    ...withError,
    _id: `${prefix}06`,
    recordsProcessed: 1,
    sent: 0,
    failed: 1,
    errors: [],
    startedAt: hoursAgo(7),
    finishedAt: hoursAgo(6.99),
  }
  // Formato real de la cola (G7): el detalle va en errorMessage como lista de entradas y
  // `errors` queda vacío; la API deriva los ítems y el resumen con el primer mensaje.
  const fromQueueEntries = {
    ...withoutDetail,
    _id: `${prefix}07`,
    recordsProcessed: 2,
    failed: 2,
    errorMessage: [
      {
        [INTERNAL.QUEUE_RECEIVED]: { deal: { [INTERNAL.OBJECT_ID_FIELD]: '18374652901' } },
        [INTERNAL.QUEUE_SENT]: { CardCode: 'C-0042' },
        [INTERNAL.QUEUE_CRM_RESPONSE]: null,
        [INTERNAL.QUEUE_ERP_RESPONSE]: {
          error: { message: 'El artículo ITEM-0042 no existe en el sistema destino.' },
        },
      },
      {
        [INTERNAL.QUEUE_RECEIVED]: { deal: { [INTERNAL.OBJECT_ID_FIELD]: '18499990000' } },
        [INTERNAL.QUEUE_SENT]: null,
        [INTERNAL.QUEUE_CRM_RESPONSE]: null,
        [INTERNAL.QUEUE_ERP_RESPONSE]: null,
      },
    ],
    errors: [],
    startedAt: hoursAgo(8),
    finishedAt: hoursAgo(7.98),
  }
  return [...empty, withError, withoutDetail, fromQueueEntries]
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
  // Al final: las vueltas de la cola no deben tomar el lugar de la corrida en curso.
  if (tenantKey === 'ACME') syncs.push(...buildQueueSyncs(tenantKey))
  return syncs
}

// ---------- Historial de ACME (tablero del Inicio, plan 4e) ----------
// ~90 días de documentos con volumen realista, todos anteriores a `ev-acme-001` (así la lista
// de eventos sigue empezando por él). Errores con varias causas (catálogo F5) y negocios que
// se reintentan hasta crearse (F6).

const HISTORY_DAYS = 91
// Día hábil en Costa Rica (UTC−6): de 8:00 a 18:00 locales = 14:00 a 24:00 UTC.
const LOCAL_OFFSET_HOURS = 6

// [mensaje, peso]: más frecuentes primero.
const HISTORY_ERRORS = [
  ['La identificación fiscal del cliente está incompleta (falta el tipo de identificación).', 11],
  ['El cliente C-10234 está inactivo en el sistema destino.', 5],
  ['El prospecto P-2231 está inactivo; no se puede cotizar.', 3],
  ['El negocio no tiene líneas de producto.', 7],
  ['Tiempo de espera agotado al llamar al sistema destino.', 6],
  ['La condición de pago del negocio (30 días) no coincide con la del cliente.', 5],
  ['El negocio está sin empresa ni contacto asociados.', 4],
  ['El valor del campo "Dirección" es demasiado largo en el contacto (máx. 100).', 3],
  ['El subgrupo 14 no es válido para el cliente.', 2],
  ['Respuesta inesperada del servidor (500).', 1],
]
const DEAL_KINDS = [
  'Renovación de equipos',
  'Ampliación de bodega',
  'Contrato anual',
  'Pedido de repuestos',
  'Licencias',
  'Mantenimiento preventivo',
  'Suministro de oficina',
  'Uniformes',
  'Mobiliario',
  'Instalación eléctrica',
]
const DEAL_PLACES = [
  'Heredia',
  'Cartago',
  'Alajuela',
  'Escazú',
  'Liberia',
  'Limón',
  'Grecia',
  'San Pedro',
  'Xela',
]

function pickWeighted(entries, value) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let cursor = value * total
  for (const [item, weight] of entries) {
    cursor -= weight
    if (cursor < 0) return item
  }
  return entries.at(-1)[0]
}

function historyEvent(
  tenantKey,
  sequence,
  { reference, title, createdMs, status, lastError, retries },
) {
  const isError = status === 'errored'
  // Duración: segundos si sale bien; los errores agotan reintentos (minutos).
  const durationMs = isError
    ? (240 + ((sequence * 37) % 660)) * 1000
    : (20 + ((sequence * 13) % 90)) * 1000
  return {
    _id: `ev-${tenantKey.toLowerCase()}-h${String(sequence).padStart(4, '0')}`,
    tenantKey,
    eventType: sequence % 5 === 0 ? 'createDeal' : 'createQuotation',
    status,
    retryCount: retries,
    maxRetries: 3,
    lastError,
    dedupActive: false,
    payload: {
      deal: {
        [INTERNAL.OBJECT_ID_FIELD]: reference,
        dealname: title,
        amount: String(2500 + ((sequence * 391) % 48_000)),
        pipeline: 'default',
      },
      subscriptionType: 'createQuotation',
    },
    [INTERNAL.AUDIT_FIELD]: {
      steps: [
        { step: 'recibido', at: new Date(createdMs).toISOString() },
        {
          step: isError ? 'error' : 'documento creado',
          at: new Date(createdMs + durationMs).toISOString(),
        },
      ],
      destinationDocument: isError ? null : String(5_020_000 + sequence),
    },
    createdAt: new Date(createdMs).toISOString(),
    updatedAt: new Date(createdMs + durationMs).toISOString(),
  }
}

function buildHistory(tenantKey) {
  const next = random(TENANT_SEEDS[tenantKey] * 101)
  const latest = BASE_DATE - 18 * 3_600_000 // siempre antes que ev-acme-001
  const events = []
  let sequence = 0
  let referenceNumber = 0
  const push = (fields) => {
    if (fields.createdMs > latest) return
    sequence += 1
    events.push(historyEvent(tenantKey, sequence, fields))
  }

  for (let daysAgo = 1; daysAgo <= HISTORY_DAYS; daysAgo += 1) {
    // Medianoche local del día, en UTC.
    const dayStart =
      Math.floor((BASE_DATE - LOCAL_OFFSET_HOURS * 3_600_000) / 86_400_000) * 86_400_000 -
      daysAgo * 86_400_000 +
      LOCAL_OFFSET_HOURS * 3_600_000
    const weekday = new Date(dayStart - LOCAL_OFFSET_HOURS * 3_600_000).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const count = weekend ? Math.floor(next() * 3) : 6 + Math.floor(next() * 7)

    for (let i = 0; i < count; i += 1) {
      referenceNumber += 1
      const reference = `1849${String(300_000 + referenceNumber)}`
      const title = `${DEAL_KINDS[Math.floor(next() * DEAL_KINDS.length)]} ${DEAL_PLACES[Math.floor(next() * DEAL_PLACES.length)]}`
      const createdMs = dayStart + (8 + next() * 10) * 3_600_000
      const roll = next()

      if (roll >= 0.11) {
        let status = 'completed'
        if (roll < 0.16) status = INTERNAL.ORDER_CREATED
        else if (roll < 0.19) status = INTERNAL.CREATED_ORIGIN_ERROR
        const lastError = status === INTERNAL.CREATED_ORIGIN_ERROR ? ORIGIN_ERRORS[i % 2] : null
        push({ reference, title, createdMs, status, lastError, retries: Math.floor(next() * 2) })
        continue
      }

      // Error: casi siempre alguien corrige el dato y el negocio vuelve a entrar.
      const lastError = pickWeighted(HISTORY_ERRORS, next())
      push({ reference, title, createdMs, status: 'errored', lastError, retries: 3 })
      if (next() < 0.25) continue
      let retryMs = createdMs + (0.3 + next() * 30) * 3_600_000
      if (next() < 0.2) {
        push({ reference, title, createdMs: retryMs, status: 'errored', lastError, retries: 3 })
        retryMs += (0.5 + next() * 20) * 3_600_000
      }
      push({
        reference,
        title,
        createdMs: retryMs,
        status: 'completed',
        lastError: null,
        retries: 0,
      })
    }
  }
  return events
}

function build() {
  const events = []
  const tasks = []
  const syncs = []
  for (const tenantKey of Object.keys(EVENT_COUNTS)) {
    const next = random(TENANT_SEEDS[tenantKey])
    for (let i = 1; i <= EVENT_COUNTS[tenantKey]; i += 1)
      events.push(buildEvent(tenantKey, i, next))
    if (tenantKey === 'ACME') events.push(...buildHistory(tenantKey))
    events.push(...buildReports(tenantKey))
    const tenantTasks = buildTasks(tenantKey)
    tasks.push(...tenantTasks)
    syncs.push(...buildSyncs(tenantKey, tenantTasks))
  }
  return { events, tasks, syncs }
}

/** Datos de solo lectura: se arman una vez. */
export const SEED_OPERATIONS = build()
