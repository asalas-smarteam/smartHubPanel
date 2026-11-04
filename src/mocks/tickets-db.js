// Tickets del modo simulado: proyecciones (lo que ve el cliente y lo que ve Smarteam),
// adjuntos y helpers. Imita las reglas del spec §2 y el contrato docs/contrato-backend/02-soporte.md.
import { getDb, save } from './db'
import { seedImageBytes } from './seed-tickets'

// ---------- Adjuntos ----------
// Las imágenes subidas se guardan en memoria (no en localStorage): se pierden al recargar dev:mock.
const uploadedFiles = new Map()
let fileSequence = 0

export function storeUpload(file, contentType) {
  fileSequence += 1
  const fileId = `f-${Date.now().toString(36)}-${fileSequence}`
  uploadedFiles.set(fileId, { blob: file, contentType })
  return { fileId, filename: file.name || 'imagen-pegada.png', contentType, size: file.size }
}

/** Bytes y tipo de un adjunto, o null si no está disponible. */
export function readAttachment(fileId, contentType) {
  const uploaded = uploadedFiles.get(fileId)
  if (uploaded) return { body: uploaded.blob, contentType: uploaded.contentType }
  const seeded = seedImageBytes(fileId)
  return seeded ? { body: seeded, contentType } : null
}

/** Busca el adjunto dentro del ticket (en la apertura o en cualquier mensaje). */
export function findTicketAttachment(ticket, fileId) {
  const all = [...ticket.attachments, ...ticket.messages.flatMap((message) => message.attachments)]
  return all.find((attachment) => attachment.fileId === fileId) ?? null
}

// ---------- Tenants caídos (solo para tests de `warnings`) ----------
let failingTenants = new Set()
export function setFailingTenants(tenantKeys) {
  failingTenants = new Set(tenantKeys)
}
export function isTenantFailing(tenantKey) {
  return failingTenants.has(tenantKey)
}
export function resetTicketsTestState() {
  failingTenants = new Set()
  uploadedFiles.clear()
}

// ---------- Consultas ----------
export function getTickets() {
  return getDb().tickets
}

export function findTicket(tenantKey, id) {
  return getTickets().find((ticket) => ticket.id === id && ticket.tenantKey === tenantKey) ?? null
}

export function companyNameOf(tenantKey) {
  return getDb().tenants.find((tenant) => tenant.tenantKey === tenantKey)?.companyName ?? null
}

export function nextTicketNumber(tenantKey) {
  const counters = getDb().ticketCounters
  counters[tenantKey] = (counters[tenantKey] ?? 0) + 1
  return counters[tenantKey]
}

const after = (a, b) => !b || a > b

function hasNewsFor(ticket, side) {
  if (side === 'cliente') {
    return (
      ticket.lastPublicAuthorType === 'smarteam' &&
      after(ticket.lastActivityAt, ticket.clientLastSeenAt)
    )
  }
  return (
    ticket.lastPublicAuthorType === 'cliente' &&
    after(ticket.lastActivityAt, ticket.staffLastSeenAt)
  )
}

// ---------- Proyecciones (contrato D1 a D5) ----------
function baseItem(ticket, side) {
  return {
    id: ticket.id,
    code: ticket.code,
    title: ticket.title,
    category: ticket.category,
    status: ticket.status,
    createdBy: { name: ticket.createdBy.name, role: ticket.createdBy.role ?? null },
    openedAt: ticket.openedAt,
    lastActivityAt: ticket.lastActivityAt,
    resolvedAt: ticket.resolvedAt,
    reopenCount: ticket.reopenCount,
    hasNews: hasNewsFor(ticket, side),
    contextType: ticket.context?.type ?? null,
  }
}

const publicMessage = (message) => ({
  id: message.id,
  authorType: message.authorType,
  authorName: message.authorName,
  body: message.body,
  attachments: message.attachments.map((attachment) => ({ ...attachment })),
  createdAt: message.createdAt,
})

function detail(ticket, side) {
  return {
    ...baseItem(ticket, side),
    description: ticket.description,
    attachments: ticket.attachments.map((attachment) => ({ ...attachment })),
    firstResponseAt: ticket.firstResponseAt,
    context: ticket.context ? { ...ticket.context } : null,
    messages: ticket.messages.map(publicMessage),
    statusHistory: ticket.statusHistory.map((entry) => ({ ...entry })),
  }
}

/** Lo que ve una cuenta cliente. Nunca incluye `internalResolution`. */
export const toClientListItem = (ticket) => baseItem(ticket, 'cliente')
export const toClientDetail = (ticket) => detail(ticket, 'cliente')

/** Lo que ve Smarteam. */
export function toStaffListItem(ticket) {
  return {
    ...baseItem(ticket, 'smarteam'),
    tenantKey: ticket.tenantKey,
    companyName: companyNameOf(ticket.tenantKey),
    firstResponseAt: ticket.firstResponseAt,
  }
}

/** Entrada del registro de trabajo tal como la devuelve la API (plan 4z). */
export const toWorkLogEntry = (entry) => ({
  id: entry.id,
  author: { name: entry.authorName },
  hours: entry.hours,
  internalNote: entry.internalNote,
  crmProjectId: entry.crmProjectId,
  createdAt: entry.createdAt,
  messageId: entry.messageId,
})

/** Registro de trabajo del ticket (solo Smarteam): total de horas y entradas, la más nueva primero. */
function workLogOf(ticket) {
  const entries = [...(ticket.workLog ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // Las horas son múltiplos de 0,25: se suman en cuartos para no arrastrar decimales.
  const quarters = entries.reduce((sum, entry) => sum + Math.round(entry.hours * 4), 0)
  return { totalHours: quarters / 4, entries: entries.map(toWorkLogEntry) }
}

export function toStaffDetail(ticket) {
  return {
    ...detail(ticket, 'smarteam'),
    tenantKey: ticket.tenantKey,
    companyName: companyNameOf(ticket.tenantKey),
    internalResolution: ticket.internalResolution
      ? {
          text: ticket.internalResolution.text,
          updatedAt: ticket.internalResolution.updatedAt,
          updatedBy: { name: ticket.internalResolution.updatedBy.name },
        }
      : null,
    workLog: workLogOf(ticket),
  }
}

// ---------- Cambios ----------
/** Agrega un mensaje público y devuelve su id. */
export function addMessage(ticket, { authorType, user, body, attachments }) {
  const now = new Date().toISOString()
  const id = `${ticket.id}-m${ticket.messages.length + 1}-${Date.now().toString(36)}`
  ticket.messages.push({
    id,
    authorType,
    authorId: user.id,
    authorName: user.name,
    body,
    attachments,
    createdAt: now,
  })
  ticket.lastActivityAt = now
  ticket.lastPublicAuthorType = authorType
  if (authorType === 'smarteam') {
    ticket.staffLastSeenAt = now
    ticket.firstResponseAt ??= now
  } else {
    ticket.clientLastSeenAt = now
  }
  return id
}

export function changeStatus(ticket, to, { byType, user }) {
  const now = new Date().toISOString()
  ticket.statusHistory.push({ from: ticket.status, to, byType, byName: user.name, at: now })
  ticket.status = to
  ticket.lastActivityAt = now
}

/**
 * Resuelve el ticket (contrato D7): mensaje público al cliente, resolución interna y estado
 * "Resuelto". Quien llama valida antes que el ticket no esté resuelto. Devuelve el id del mensaje.
 */
export function resolveTicket(ticket, { user, message, internalResolution, attachments = [] }) {
  const messageId = addMessage(ticket, { authorType: 'smarteam', user, body: message, attachments })
  const now = new Date().toISOString()
  ticket.internalResolution = {
    text: internalResolution,
    updatedAt: now,
    updatedBy: { userId: user.id, name: user.name },
  }
  changeStatus(ticket, 'resuelto', { byType: 'smarteam', user })
  ticket.resolvedAt = now
  return messageId
}

/** Guarda una entrada del registro de trabajo (plan 4z) y la devuelve. */
export function addWorkLogEntry(ticket, { user, hours, internalNote, crmProjectId, messageId }) {
  ticket.workLog ??= []
  const entry = {
    id: `${ticket.id}-w${ticket.workLog.length + 1}-${Date.now().toString(36)}`,
    authorId: user.id,
    authorName: user.name,
    hours,
    internalNote,
    crmProjectId,
    createdAt: new Date().toISOString(),
    messageId,
  }
  ticket.workLog.push(entry)
  return entry
}

export { save }
