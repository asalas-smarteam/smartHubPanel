// Tickets de ejemplo del modo simulado (todo ficticio). Cubren todos los estados,
// mensajes de ambos lados, imágenes, una reapertura y tickets con contexto.
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

/**
 * @param {Array<object>} users usuarios del seed (para elegir quién abre cada ticket)
 */
export function createSeedTickets(users) {
  const tickets = []
  const counters = {}

  for (const [tenantKey, templateIndexes] of Object.entries(TENANT_TEMPLATES)) {
    const clients = users.filter((user) => user.tenantKey === tenantKey && user.active)
    counters[tenantKey] = 0

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

      const start = 200 - position * 18 - number // horas atrás de la apertura
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
