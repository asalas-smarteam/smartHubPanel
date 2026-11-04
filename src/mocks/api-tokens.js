// Tokens personales de la API (plan 4z) en el modo simulado. Cada token pertenece a una cuenta de
// Smarteam y sirve solo para el registro de trabajo de los tickets. Se guarda el hash, nunca el
// valor: el token completo se entrega una sola vez, al crearlo.
// Sin dependencias de db.js (db.js lo importa para el seed); lo que toca el estado está en
// handlers/api-tokens.js.

export const TOKEN_PREFIX = 'spn_'
export const TOKEN_TTL_DAYS = 90
export const MAX_ACTIVE_TOKENS = 5
const DAY_MS = 24 * 3_600_000
// Secreto: 32 bytes aleatorios en base64url sin relleno → 43 caracteres (contrato 12).
const SECRET_BYTES = 32
const SECRET_LENGTH = 43
/** Forma exacta de un token; lo demás se rechaza sin buscarlo. */
export const TOKEN_PATTERN = new RegExp(`^${TOKEN_PREFIX}[A-Za-z0-9_-]{${SECRET_LENGTH}}$`)
// Lo que se muestra del token en la lista: `spn_` y los 4 primeros caracteres del secreto.
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 4

/** Token de ejemplo de la cuenta Smarteam del seed (para tests y para probar a mano). */
export const SEED_API_TOKEN = `${TOKEN_PREFIX}${'smarteamDemoSeedToken_'.padEnd(SECRET_LENGTH, '0')}`

/**
 * Hash del token. SOLO MOCK: un hash simple y síncrono (cyrb53 con dos semillas) para no guardar
 * el valor en claro en localStorage. El backend real usa SHA-256; esto no es criptográfico.
 * @param {string} value
 */
export function hashToken(value) {
  const part = (seed) => {
    let h1 = 0xdeadbeef ^ seed
    let h2 = 0x41c6ce57 ^ seed
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i)
      h1 = Math.imul(h1 ^ code, 2654435761)
      h2 = Math.imul(h2 ^ code, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
  }
  return `mock-${part(1)}${part(2)}`
}

function randomBytes(count) {
  const bytes = new Uint8Array(count)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** Token nuevo: `spn_` + 32 bytes aleatorios en base64url (sin `=`). */
export function generateTokenValue() {
  const binary = String.fromCharCode(...randomBytes(SECRET_BYTES))
  const secret = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${TOKEN_PREFIX}${secret}`
}

function randomHex(length) {
  const bytes = randomBytes(Math.ceil(length / 2))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

export function buildToken({ userId, name, value, createdAt, lastUsedAt = null }) {
  const created = Date.parse(createdAt)
  return {
    id: `tok-${randomHex(12)}`,
    userId,
    name,
    prefix: value.slice(0, DISPLAY_PREFIX_LENGTH),
    hash: hashToken(value),
    createdAt,
    lastUsedAt,
    expiresAt: new Date(created + TOKEN_TTL_DAYS * DAY_MS).toISOString(),
    revokedAt: null,
  }
}

/** Token de ejemplo de la cuenta Smarteam del seed (fechas relativas a hoy, para que no venza). */
export function createSeedApiTokens(users) {
  const staff = users.find((user) => user.id === 'u-staff-1')
  if (!staff) return []
  const now = Date.now()
  return [
    buildToken({
      userId: staff.id,
      name: 'Claude (portátil)',
      value: SEED_API_TOKEN,
      createdAt: new Date(now - 10 * DAY_MS).toISOString(),
      lastUsedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
  ]
}

export const isTokenActive = (token, now = Date.now()) =>
  !token.revokedAt && Date.parse(token.expiresAt) > now

/** Lo que devuelve la API de un token: nunca el hash. */
export const toTokenItem = (token) => ({
  id: token.id,
  name: token.name,
  prefix: token.prefix,
  createdAt: token.createdAt,
  lastUsedAt: token.lastUsedAt,
  expiresAt: token.expiresAt,
})
