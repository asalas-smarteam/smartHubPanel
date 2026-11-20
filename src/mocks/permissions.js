// Matriz de permisos de la Fase 1, copiada de la tabla del spec (Cuentas, roles y permisos).
// La API real es la fuente de verdad; esto solo simula lo que devolverá en `permissions`.
const SMARTEAM = [
  'events.read',
  'syncs.read',
  'mappings.read',
  'owners.write',
  'tasks.read',
  'staff.tickets',
  'staff.users',
  'staff.events.raw',
]
const CLIENTE = [
  'tickets.read',
  'tickets.create',
  'tickets.reply',
  'tickets.reopen',
  'events.read',
  'syncs.read',
  'mappings.read',
  'tasks.read',
]

export function permissionsFor(user) {
  // Solo en los tests: un usuario puede traer su propia lista (p. ej. Smarteam sin staff.events.raw).
  if (Array.isArray(user.permissions)) return [...user.permissions]
  if (user.accountType === 'smarteam') return [...SMARTEAM]
  // El admin del cliente además edita el mapeo de responsables (plan 5c); el usuario, no.
  if (user.role === 'admin') return [...CLIENTE, 'owners.write']
  return [...CLIENTE]
}
