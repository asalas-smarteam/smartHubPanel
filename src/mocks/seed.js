// Datos de ejemplo del modo simulado. Todo es ficticio.
export const SEED_TENANTS = [
  { tenantKey: 'ACME', companyName: 'Acme Industrial', status: 'active' },
  { tenantKey: 'GLOBEX', companyName: 'Globex Comercial', status: 'active' },
  { tenantKey: 'INITECH', companyName: 'Initech Servicios', status: 'suspended' },
]

/** Cuentas para probar a mano (documentadas en el README). */
export const DEMO_ACCOUNTS = {
  smarteam: { email: 'smarteam@panel.test', password: 'Smarteam-2026' },
  clienteAdmin: { email: 'admin@acme.test', password: 'Temporal-123' },
  clienteUsuario: { email: 'usuario@acme.test', password: 'Usuario-2026' },
}

const FIRST_NAMES = [
  'Ana',
  'Luis',
  'María',
  'Carlos',
  'Sofía',
  'Jorge',
  'Valeria',
  'Diego',
  'Camila',
  'Andrés',
  'Daniela',
  'Fernando',
  'Paula',
  'Ricardo',
  'Lucía',
  'Esteban',
  'Natalia',
  'Gabriel',
]
const LAST_NAMES = [
  'Pérez',
  'Mora',
  'Rojas',
  'Vargas',
  'Solano',
  'Jiménez',
  'Castro',
  'Araya',
  'Brenes',
]

const BASE_DATE = Date.parse('2026-10-01T15:00:00.000Z')
const hoursAgo = (hours) => new Date(BASE_DATE - hours * 3_600_000).toISOString()

function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

export function createSeedUsers() {
  const users = [
    {
      id: 'u-staff-1',
      email: DEMO_ACCOUNTS.smarteam.email,
      name: 'Equipo Smarteam',
      accountType: 'smarteam',
      tenantKey: null,
      role: null,
      password: DEMO_ACCOUNTS.smarteam.password,
      mustChangePassword: false,
      active: true,
      tokenVersion: 0,
      lastLoginAt: hoursAgo(2),
      createdAt: hoursAgo(2000),
    },
    {
      id: 'u-acme-admin',
      email: DEMO_ACCOUNTS.clienteAdmin.email,
      name: 'Adriana Solís',
      accountType: 'cliente',
      tenantKey: 'ACME',
      role: 'admin',
      password: DEMO_ACCOUNTS.clienteAdmin.password,
      mustChangePassword: true,
      active: true,
      tokenVersion: 0,
      lastLoginAt: null,
      createdAt: hoursAgo(1),
    },
    {
      id: 'u-acme-usuario',
      email: DEMO_ACCOUNTS.clienteUsuario.email,
      name: 'Mario Quesada',
      accountType: 'cliente',
      tenantKey: 'ACME',
      role: 'usuario',
      password: DEMO_ACCOUNTS.clienteUsuario.password,
      mustChangePassword: false,
      active: true,
      tokenVersion: 0,
      lastLoginAt: hoursAgo(30),
      createdAt: hoursAgo(1500),
    },
  ]

  // 37 usuarios más, repartidos entre las empresas, para tener varias páginas.
  for (let i = 0; i < 37; i += 1) {
    const tenant = SEED_TENANTS[i % SEED_TENANTS.length]
    const first = FIRST_NAMES[i % FIRST_NAMES.length]
    const last = LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length]
    const isStaff = i % 12 === 11
    users.push({
      id: `u-${String(i + 1).padStart(3, '0')}`,
      email: `${slug(first)}.${slug(last)}${i + 1}@${isStaff ? 'panel' : slug(tenant.tenantKey)}.test`,
      name: `${first} ${last}`,
      accountType: isStaff ? 'smarteam' : 'cliente',
      tenantKey: isStaff ? null : tenant.tenantKey,
      role: isStaff ? null : i % 4 === 0 ? 'admin' : 'usuario',
      password: `Clave-segura-${i + 1}`,
      mustChangePassword: i % 9 === 0,
      active: i % 10 !== 7,
      tokenVersion: 0,
      lastLoginAt: i % 5 === 0 ? null : hoursAgo(10 + i * 5),
      createdAt: hoursAgo(10 + i * 24),
    })
  }
  return users
}
