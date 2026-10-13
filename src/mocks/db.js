// Estado del modo simulado. Imita lo que guarda el backend: usuarios (con tokenVersion),
// sesiones e intentos fallidos de login. Solo existe en el código de mocks.
import { createSeedUsers, SEED_TENANTS } from './seed'
import { createSeedTickets } from './seed-tickets'

const STORAGE_KEY = 'panel-mock-db'
const SESSION_KEY = 'panel-mock-session'

let persistInBrowser = false
let memorySessionId = null
let state = createInitialState()

function createInitialState() {
  const users = createSeedUsers()
  const { tickets, counters } = createSeedTickets(users)
  return {
    tenants: SEED_TENANTS.map((tenant) => ({ ...tenant })),
    users,
    sessions: {},
    failedLogins: {},
    tickets,
    ticketCounters: counters,
  }
}

/** Datos guardados por una versión anterior del mock (sin tickets): se completan con el seed. */
function migrate(saved) {
  if (!saved.tickets) {
    const { tickets, counters } = createSeedTickets(saved.users)
    saved.tickets = tickets
    saved.ticketCounters = counters
  }
  return saved
}

/** Activa la persistencia en localStorage/sessionStorage (solo en el navegador, modo mock). */
export function enableBrowserPersistence() {
  persistInBrowser = true
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) state = migrate(JSON.parse(saved))
    save()
  } catch {
    state = createInitialState()
  }
}

/** Vuelve a los datos de ejemplo (se usa después de cada test). */
export function resetDb() {
  state = createInitialState()
  memorySessionId = null
  if (persistInBrowser) save()
}

export function getDb() {
  return state
}

export function save() {
  if (!persistInBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sin almacenamiento disponible: el mock sigue funcionando en memoria.
  }
}

/** La "cookie" de sesión de esta pestaña. */
export function getCurrentSessionId() {
  if (!persistInBrowser) return memorySessionId
  try {
    return window.sessionStorage.getItem(SESSION_KEY)
  } catch {
    return memorySessionId
  }
}

export function setCurrentSessionId(sessionId) {
  memorySessionId = sessionId
  if (!persistInBrowser) return
  try {
    if (sessionId) window.sessionStorage.setItem(SESSION_KEY, sessionId)
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignorado: queda la sesión en memoria.
  }
}

export function createSession(user) {
  const sessionId = `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  state.sessions[sessionId] = { userId: user.id, tv: user.tokenVersion }
  setCurrentSessionId(sessionId)
  save()
  return sessionId
}

export function destroyCurrentSession() {
  const sessionId = getCurrentSessionId()
  if (sessionId) delete state.sessions[sessionId]
  setCurrentSessionId(null)
  save()
}

/** Usuario de la sesión actual, o null si no hay sesión válida (como el hook del backend). */
export function getSessionUser() {
  const sessionId = getCurrentSessionId()
  const session = sessionId ? state.sessions[sessionId] : null
  if (!session) return null
  const user = state.users.find((candidate) => candidate.id === session.userId)
  if (!user || !user.active || user.tokenVersion !== session.tv) return null
  return user
}

/** Re-emite la sesión actual con el tokenVersion vigente (cookie nueva, ver plan §3.2 C3). */
export function refreshCurrentSession(user) {
  const sessionId = getCurrentSessionId()
  if (sessionId && state.sessions[sessionId]) {
    state.sessions[sessionId].tv = user.tokenVersion
    save()
  }
}

/** Inicia sesión directamente (para tests y helpers). */
export function signInAs(email) {
  const user = state.users.find((candidate) => candidate.email === email)
  if (!user) throw new Error(`No existe el usuario de prueba ${email}`)
  return createSession(user)
}
