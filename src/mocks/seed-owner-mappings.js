// Responsables de ejemplo del modo simulado (plan 5b), ya con la forma del contrato N2.
// Ficticios: nombres, correos y códigos inventados.

const row = (tenantKey, n, fields) => ({
  id: `own-${tenantKey.toLowerCase()}-${String(n).padStart(3, '0')}`,
  tenantKey,
  crmOwnerId: String(82929200 + n),
  crmOwnerName: null,
  crmOwnerEmail: null,
  erpOwnerId: null,
  erpOwnerName: null,
  erpEmployeeId: null,
  active: true,
  source: 'crm_seed',
  createdAt: '2026-07-03T02:03:51.125Z',
  updatedAt: '2026-07-03T02:03:51.125Z',
  ...fields,
})

const ACME = [
  {
    crmOwnerName: 'Erick Figueroa Pavón',
    crmOwnerEmail: 'ventas8@acme.example',
    erpOwnerId: 53,
    erpEmployeeId: 67,
  },
  {
    crmOwnerName: 'Ana Mora',
    crmOwnerEmail: 'ana.mora@acme.example',
    erpOwnerId: 12,
    erpOwnerName: 'Ana Mora V.',
    erpEmployeeId: 21,
  },
  { crmOwnerName: 'Luis Vargas', crmOwnerEmail: 'luis.vargas@acme.example', erpOwnerId: 31 },
  // Sin vendedor en el ERP: cuenta en "Sin vendedor".
  { crmOwnerName: 'Carla Rojas', crmOwnerEmail: 'carla.rojas@acme.example' },
  { crmOwnerName: null, crmOwnerEmail: 'soporte@acme.example', erpOwnerId: 7, source: 'manual' },
  {
    crmOwnerName: 'Pedro Solís',
    crmOwnerEmail: 'pedro.solis@acme.example',
    erpOwnerId: 44,
    active: false,
  },
]

const GLOBEX = [
  {
    crmOwnerName: 'María Jiménez',
    crmOwnerEmail: 'maria@globex.example',
    erpOwnerId: 5,
    erpEmployeeId: 9,
  },
  { crmOwnerName: 'Jorge Castro', crmOwnerEmail: 'jorge@globex.example', erpOwnerId: 6 },
]

const build = (tenantKey, list) => list.map((fields, index) => row(tenantKey, index + 1, fields))

/** Initech no tiene responsables (estado vacío). */
export const SEED_OWNER_MAPPINGS = [...build('ACME', ACME), ...build('GLOBEX', GLOBEX)]
