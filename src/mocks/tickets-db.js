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
  }
}

// ---------- Cambios ----------
export function addMessage(ticket, { authorType, user, body, attachments }) {
  const now = new Date().toISOString()
  ticket.messages.push({
    id: `${ticket.id}-m${ticket.messages.length + 1}-${Date.now().toString(36)}`,
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
}

export function changeStatus(ticket, to, { byType, user }) {
  const now = new Date().toISOString()
  ticket.statusHistory.push({ from: ticket.status, to, byType, byName: user.name, at: now })
  ticket.status = to
  ticket.lastActivityAt = now
}

export { save }
