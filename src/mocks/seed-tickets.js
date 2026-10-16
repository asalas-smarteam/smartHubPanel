// Tickets de ejemplo del modo simulado (todo ficticio). Cubren todos los estados,
// mensajes de ambos lados, imágenes, una reapertura y tickets con contexto, más un historial
// resuelto de ~18 meses para las Métricas de soporte.
import { findContextRecord } from './operations'
import { base64ToBytes, SEED_IMAGES } from './seed-images'

const BASE_DATE = Date.parse('2026-10-11T18:00:00.000Z')
const hoursAgo = (hours) => new Date(BASE_DATE - hours * 3_600_000).toISOString()

/** Registros que enlazan los tickets del seed (índice en el template → evento o sync real). */
export const SEED_CONTEXT_RECORDS = {
  ACME: [
    findContextRecord('ACME', 'webhookEvent', 'ev-acme-001'),
    findContextRecord('ACME', 'syncLog', 'sync-acme-001'),
  ],
  GLOBEX: [findContextRecord('GLOBEX', 'webhookEvent', 'ev-globex-001')],
  INITECH: [],
}

/** Bytes de una imagen del seed a partir de su fileId (`seed-<imagen>-…`). */
export function seedImageBytes(fileId) {
  const key = Object.keys(SEED_IMAGES).find((name) => fileId.startsWith(`seed-${name}-`))
  return key ? base64ToBytes(SEED_IMAGES[key]) : null
}

const SEED_IMAGE_SIZES = { captura: 576, error: 1540 }

function seedAttachment(image, ticketId, index) {
  return {
    fileId: `seed-${image}-${ticketId}-${index}`,
    filename: image === 'captura' ? 'captura-pantalla.png' : 'error.png',
    contentType: 'image/png',
    size: SEED_IMAGE_SIZES[image],
  }
}

// [título, categoría, estado final, imágenes en la apertura, contexto (índice en SEED_CONTEXT_RECORDS)]
const TEMPLATES = [
  ['La cotización no llegó al sistema destino', 'documentos', 'esperando_cliente', ['captura'], 0],
  ['Faltan precios en tres productos', 'precios', 'en_progreso', [], 1],
  ['El pedido 4512 se duplicó', 'documentos', 'resuelto', ['error'], null],
  ['No puedo entrar al panel', 'acceso', 'abierto', [], null],
  [
    'La sincronización de clientes no corrió anoche',
    'sincronizacion',
    'reabierto',
    ['captura', 'error'],
    null,
  ],
  ['El vendedor no aparece asignado', 'mapeos', 'resuelto', [], null],
  ['Pregunta sobre los descuentos por volumen', 'otro', 'abierto', [], null],
  ['El inventario por bodega no coincide', 'sincronizacion', 'en_progreso', ['captura'], null],
  ['Campo de dirección vacío en las cotizaciones', 'mapeos', 'esperando_cliente', [], null],
  ['Error al crear el pedido desde el negocio', 'documentos', 'resuelto', ['error'], null],
]

const TENANT_TEMPLATES = {
  ACME: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  GLOBEX: [9, 0, 3, 5, 7, 2, 6, 8, 1, 4],
  INITECH: [2, 5, 6, 3, 7, 9, 0, 8, 4, 1],
}

const STAFF = { userId: 'u-staff-1', name: 'Equipo Smarteam' }

// ---------- Historial resuelto (Métricas de soporte, plan 4e) ----------
// Tickets ya resueltos repartidos en ~18 meses, con tiempos de respuesta y resolución
// variados (F8, F9). Se numeran primero, en orden cronológico; los 10 de arriba van después.

const HISTORY_WEEKS = 78
const HISTORY_NEWEST_HOURS = 216 // el más reciente del historial, 9 días antes de BASE_DATE
// Tickets por semana [mínimo, máximo] según la empresa.
const HISTORY_RATE = { ACME: [2, 5], GLOBEX: [1, 2], INITECH: [0, 1] }
const HISTORY_SEEDS = { ACME: 5, GLOBEX: 17, INITECH: 29 }

const HISTORY_TITLES = {
  documentos: [
    'No llega el número de documento al negocio',
    'Cotización sin descuento aplicado',
    'Factura con moneda incorrecta',
    'Pedido con bodega equivocada',
  ],
  sincronizacion: [
    'Contacto duplicado en el destino',
    'El negocio no actualiza la etapa',
    'Productos nuevos no aparecen',
  ],
  precios: ['Cambio de lista de precios', 'Error de redondeo en impuestos'],
  mapeos: ['Campos personalizados vacíos', 'El vendedor queda sin código'],
  acceso: ['Alta de usuario para vendedor nuevo', 'Restablecer acceso de una cuenta'],
  otro: ['Consulta sobre el horario de sincronización', 'Duda sobre el reporte de calidad'],
}
const CATEGORY_WEIGHTS = [
  ['documentos', 30],
  ['sincronizacion', 20],
  ['precios', 15],
  ['mapeos', 15],
  ['acceso', 10],
  ['otro', 10],
]
// Horas hasta la resolución final, por rango (F8): [mínimo, máximo, peso].
const RESOLUTION_RANGES = [
  [0.5, 4, 28],
  [4, 24, 40],
  [24, 72, 23],
  [72, 140, 9],
]
const INTERNAL_NOTES = [
  'Se corrigió el mapeo del campo y se reprocesaron los documentos.',
  'El dato venía incompleto desde el negocio; se explicó al cliente cómo completarlo.',
  'Se ajustó la configuración de la lista de precios.',
  'Se reinició la tarea de sincronización y se verificó la siguiente corrida.',
]

function random(seed) {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}

function pickWeighted(entries, value) {
  const total = entries.reduce((sum, entry) => sum + entry.at(-1), 0)
  let cursor = value * total
  for (const entry of entries) {
    cursor -= entry.at(-1)
    if (cursor < 0) return entry
  }
  return entries.at(-1)
}

/** Ticket resuelto del historial. `opened` y los demás tiempos van en horas antes de BASE_DATE. */
function historyTicket({ tenantKey, number, opener, next }) {
  const id = `t-${tenantKey.toLowerCase()}-${String(number).padStart(3, '0')}`
  const [category] = pickWeighted(CATEGORY_WEIGHTS, next())
  const titles = HISTORY_TITLES[category]
  const title = titles[Math.floor(next() * titles.length)]
  const { opened } = opener
  const firstResponse = next() < 0.7 ? 0.15 + next() * 1.85 : 0.5 + next() * 8
  const [min, max] = pickWeighted(RESOLUTION_RANGES, next())
  const resolution = Math.max(min + next() * (max - min), firstResponse + 0.25)
  const reopened = next() < 0.07
  const who = opener.user
  const by = (type) => (type === 'smarteam' ? STAFF.name : who.name)

  const ticket = {
    id,
    tenantKey,
    number,
    code: `${tenantKey}-${String(number).padStart(4, '0')}`,
    title,
    description: `${title}. Les dejamos el detalle para revisarlo.`,
    category,
    status: 'resuelto',
    context: null,
    createdBy: { userId: who.id, name: who.name, role: who.role },
    attachments: [],
    messages: [],
    internalResolution: null,
    statusHistory: [
      { from: null, to: 'abierto', byType: 'cliente', byName: who.name, at: hoursAgo(opened) },
    ],
    openedAt: hoursAgo(opened),
    firstResponseAt: hoursAgo(opened - firstResponse),
    resolvedAt: null,
    reopenCount: reopened ? 1 : 0,
    lastActivityAt: hoursAgo(opened - resolution),
    lastPublicAuthorType: 'smarteam',
    clientLastSeenAt: hoursAgo(opened - resolution - 1),
    staffLastSeenAt: hoursAgo(opened - resolution),
  }
  let status = 'abierto'
  const message = (authorType, body, at) => {
    const author = authorType === 'smarteam' ? STAFF : { userId: who.id, name: who.name }
    ticket.messages.push({
      id: `${id}-m${ticket.messages.length + 1}`,
      authorType,
      authorId: author.userId,
      authorName: author.name,
      body,
      attachments: [],
      createdAt: hoursAgo(at),
    })
  }
  const move = (to, byType, at) => {
    ticket.statusHistory.push({ from: status, to, byType, byName: by(byType), at: hoursAgo(at) })
    status = to
  }

  message('smarteam', 'Gracias por avisar. Lo estamos revisando.', opened - firstResponse)
  move('en_progreso', 'smarteam', opened - firstResponse)
  if (reopened) {
    const first = opened - firstResponse - (resolution - firstResponse) * 0.5
    message('smarteam', 'Quedó corregido. Avísennos si vuelve a pasar.', first)
    move('resuelto', 'smarteam', first)
    message('cliente', 'Sigue fallando con algunos negocios.', first - 2)
    move('abierto', 'cliente', first - 2)
    move('en_progreso', 'smarteam', first - 2.5)
  }
  message('smarteam', 'Listo, ya quedó resuelto.', opened - resolution)
  move('resuelto', 'smarteam', opened - resolution)
  ticket.resolvedAt = hoursAgo(opened - resolution)
  ticket.internalResolution = {
    text: INTERNAL_NOTES[number % INTERNAL_NOTES.length],
    updatedAt: hoursAgo(opened - resolution),
    updatedBy: { userId: STAFF.userId, name: STAFF.name },
  }
  return ticket
}

/** Historial de una empresa, del más antiguo al más reciente (números 1..n). */
function createHistoryTickets(tenantKey, clients) {
  if (clients.length === 0) return []
  const next = random(HISTORY_SEEDS[tenantKey])
  const [low, high] = HISTORY_RATE[tenantKey]
  const openings = []
  for (let week = HISTORY_WEEKS; week >= 0; week -= 1) {
    const count = low + Math.floor(next() * (high - low + 1))
    for (let i = 0; i < count; i += 1) {
      // Un día hábil de esa semana, en horario de oficina.
      const opened = HISTORY_NEWEST_HOURS + week * 168 + Math.floor(next() * 5) * 24 + next() * 9
      openings.push(opened)
    }
  }
  return openings
    .sort((a, b) => b - a)
    .map((opened, index) =>
      historyTicket({
        tenantKey,
        number: index + 1,
        opener: { opened, user: clients[index % clients.length] },
        next,
      }),
    )
}

/**
 * @param {Array<object>} users usuarios del seed (para elegir quién abre cada ticket)
 */
/** Versión de los tickets de ejemplo: si cambia, dev:mock reemplaza los guardados en el navegador. */
export const TICKET_SEED_VERSION = 2

export function createSeedTickets(users) {
  const tickets = []
  const counters = {}

  for (const [tenantKey, templateIndexes] of Object.entries(TENANT_TEMPLATES)) {
    const clients = users.filter((user) => user.tenantKey === tenantKey && user.active)
    const history = createHistoryTickets(tenantKey, clients)
    tickets.push(...history)
    counters[tenantKey] = history.length

    templateIndexes.forEach((templateIndex, position) => {
      const [title, category, finalStatus, images, contextIndex] = TEMPLATES[templateIndex]
      counters[tenantKey] += 1
      const number = counters[tenantKey]
      const id = `t-${tenantKey.toLowerCase()}-${String(number).padStart(3, '0')}`
      // El primer ticket de ACME lo abre el usuario de prueba del README.
      const author =
        tenantKey === 'ACME' && position < 3
          ? users.find((user) => user.id === 'u-acme-usuario')
          : clients[position % Math.max(clients.length, 1)]
      const opener = { userId: author.id, name: author.name, role: author.role }
      const context =
        contextIndex !== null && SEED_CONTEXT_RECORDS[tenantKey][contextIndex]
          ? (({ type, id: refId, snapshot }) => ({ type, refId, snapshot }))(
              SEED_CONTEXT_RECORDS[tenantKey][contextIndex],
            )
          : null

      const start = 200 - position * 18 - (position + 1) // horas atrás de la apertura
      const ticket = {
        id,
        tenantKey,
        number,
        code: `${tenantKey}-${String(number).padStart(4, '0')}`,
        title,
        description: `${title}. Lo notamos hoy en la mañana; adjuntamos lo que vimos en pantalla.`,
        category,
        status: 'abierto',
        context,
        createdBy: opener,
        attachments: images.map((image, index) => seedAttachment(image, id, index)),
        messages: [],
        internalResolution: null,
        statusHistory: [
          {
            from: null,
            to: 'abierto',
            byType: 'cliente',
            byName: opener.name,
            at: hoursAgo(start),
          },
        ],
        openedAt: hoursAgo(start),
        firstResponseAt: null,
        resolvedAt: null,
        reopenCount: 0,
        lastActivityAt: hoursAgo(start),
        lastPublicAuthorType: 'cliente',
        clientLastSeenAt: hoursAgo(start),
        staffLastSeenAt: null,
      }

      let clock = start
      const say = (authorType, body, attachments = []) => {
        clock -= 2
        const who = authorType === 'smarteam' ? STAFF : opener
        ticket.messages.push({
          id: `${id}-m${ticket.messages.length + 1}`,
          authorType,
          authorId: who.userId,
          authorName: who.name,
          body,
          attachments,
          createdAt: hoursAgo(clock),
        })
        ticket.lastActivityAt = hoursAgo(clock)
        ticket.lastPublicAuthorType = authorType
        if (authorType === 'smarteam') {
          ticket.staffLastSeenAt = hoursAgo(clock)
          ticket.firstResponseAt ??= hoursAgo(clock)
        } else {
          ticket.clientLastSeenAt = hoursAgo(clock)
        }
      }
      const move = (to, byType) => {
        ticket.statusHistory.push({
          from: ticket.status,
          to,
          byType,
          byName: byType === 'smarteam' ? STAFF.name : opener.name,
          at: hoursAgo(clock),
        })
        ticket.status = to
      }

      if (finalStatus === 'abierto') {
        tickets.push(ticket)
        return
      }

      say('smarteam', 'Gracias por avisar. Lo estamos revisando.')
      move('en_progreso', 'smarteam')

      if (finalStatus === 'esperando_cliente') {
        say('smarteam', '¿Nos confirmas qué lista de precios usó el vendedor?', [
          seedAttachment('captura', `${id}-m2`, 0),
        ])
        move('esperando_cliente', 'smarteam')
      }

      if (finalStatus === 'resuelto' || finalStatus === 'reabierto') {
        say('cliente', 'Les comparto el detalle por si sirve.', [
          seedAttachment('error', `${id}-m2`, 0),
        ])
        say('smarteam', 'Corregimos la configuración. Por favor reenvía el documento.')
        move('resuelto', 'smarteam')
        ticket.resolvedAt = hoursAgo(clock)
        ticket.internalResolution = {
          text: 'El mapeo del campo apuntaba a una propiedad equivocada; se corrigió y se reprocesó.',
          updatedAt: hoursAgo(clock),
          updatedBy: { userId: STAFF.userId, name: STAFF.name },
        }
      }

      if (finalStatus === 'reabierto') {
        say('cliente', 'Sigue fallando con los clientes nuevos.')
        move('abierto', 'cliente')
        ticket.reopenCount = 1
      }

      // El cliente ya vio lo anterior, salvo cuando Smarteam le pidió algo (para que la
      // novedad en la lista sea la excepción, como en la vida real).
      if (ticket.status !== 'esperando_cliente') ticket.clientLastSeenAt = hoursAgo(clock - 1)
      tickets.push(ticket)
    })
  }

  return { tickets, counters }
}
