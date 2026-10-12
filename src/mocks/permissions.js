// Matriz de permisos de la Fase 1, copiada de la tabla del spec (Cuentas, roles y permisos).
// La API real es la fuente de verdad; esto solo simula lo que devolverá en `permissions`.
const SMARTEAM = ['events.read', 'syncs.read', 'staff.tickets', 'staff.users', 'staff.events.raw']
const CLIENTE = [
  'tickets.read',
  'tickets.create',
  'tickets.reply',
  'tickets.reopen',
  'events.read',
  'syncs.read',
]

export function permissionsFor(user) {
  if (user.accountType === 'smarteam') return [...SMARTEAM]
  // En la Fase 1, `admin` y `usuario` del cliente tienen los mismos permisos.
  return [...CLIENTE]
}
