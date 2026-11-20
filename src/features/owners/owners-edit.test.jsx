// Plan 5c: el administrador edita el vendedor y el empleado del ERP y trae responsables del CRM.
import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

import { syncMessage } from './filters'

const admin = DEMO_ACCOUNTS.clienteAdmin.email // ACME, rol admin
const user = DEMO_ACCOUNTS.clienteUsuario.email // ACME, rol usuario
const staff = DEMO_ACCOUNTS.smarteam.email

const dbRow = (name) => getDb().ownerMappings.find((o) => o.crmOwnerName === name)

async function openOwners(route = '/responsables', session = admin) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Mapeo de responsables' })
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)
const rowWith = (table, text) => bodyRows(table).find((row) => row.textContent.includes(text))

async function openEdit(app, name) {
  await app.user.click(screen.getByRole('button', { name: `Editar ${name}` }))
  const dialog = await screen.findByRole('dialog', { name: 'Editar responsable' })
  return {
    dialog,
    seller: within(dialog).getByLabelText('Vendedor en el ERP'),
    employee: within(dialog).getByLabelText('Empleado en el ERP (digitador)'),
    save: within(dialog).getByRole('button', { name: 'Guardar cambios' }),
  }
}

async function retype(app, input, text) {
  await app.user.clear(input)
  if (text) await app.user.type(input, text)
}

beforeEach(() => {
  getDb().users.find((u) => u.email === admin).mustChangePassword = false
})

afterEach(() => {
  toast.dismiss()
})

describe('Mapeo de responsables: edición (plan 5c)', () => {
  it('el usuario del cliente sigue en solo lectura: sin Editar ni Actualizar', async () => {
    const { table } = await openOwners('/responsables', user)
    expect(screen.getByText(/Solo lectura\./)).toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Actualizar responsables del CRM' }),
    ).not.toBeInTheDocument()
  })

  it('el admin edita vendedor y empleado: aviso de riesgo, guardado y tabla al día', async () => {
    const requests = recordRequests(`/api/owner-mappings/${dbRow('Erick Figueroa Pavón').id}`)
    const app = await openOwners()
    expect(screen.queryByText(/Solo lectura\./)).not.toBeInTheDocument()
    const { dialog, seller, employee, save } = await openEdit(app, 'Erick Figueroa Pavón')
    expect(dialog).toHaveTextContent('ventas8@acme.example')
    expect(seller).toHaveValue('53')
    expect(employee).toHaveValue('67')
    expect(within(dialog).getByRole('note')).toHaveTextContent(
      'El panel no comprueba que estos códigos existan en el ERP',
    )
    // Sin cambios no se puede guardar.
    expect(save).toBeDisabled()

    await retype(app, seller, '113, 758')
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Con varios códigos, los documentos creados desde el CRM salen sin vendedor.',
    )
    await retype(app, employee, '70')
    await app.user.click(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Se guardaron los cambios del responsable.')).toBeInTheDocument()
    expect(requests.map((r) => r.method)).toEqual(['PATCH'])
    expect(dbRow('Erick Figueroa Pavón')).toMatchObject({
      erpOwnerId: '113,758',
      erpEmployeeId: '70',
    })
    await waitFor(() =>
      expect(rowWith(app.table, 'Erick Figueroa Pavón')).toHaveTextContent('113,758'),
    )
    expect(getDb().ownerMappingHistory).toHaveLength(1)
  })

  it('vaciar los campos quita los códigos; letras o comas en el empleado no se envían', async () => {
    const requests = recordRequests(`/api/owner-mappings/${dbRow('Ana Mora').id}`)
    const app = await openOwners()
    const { dialog, seller, employee, save } = await openEdit(app, 'Ana Mora')

    await retype(app, seller, '12x')
    await retype(app, employee, '21,22')
    await app.user.click(save)
    expect(within(dialog).getByText(/Usa solo números/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Debe ser un solo número/)).toBeInTheDocument()
    expect(requests).toHaveLength(0)

    await retype(app, seller, '')
    await retype(app, employee, '')
    await app.user.click(save)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(dbRow('Ana Mora')).toMatchObject({ erpOwnerId: null, erpEmployeeId: null })
    await waitFor(() => expect(rowWith(app.table, 'Ana Mora')).toHaveTextContent('Sin vendedor'))
  })

  it('vendedor que ya es de otro responsable: el error sale en el campo y no se cierra', async () => {
    const app = await openOwners()
    const { dialog, seller, save } = await openEdit(app, 'Ana Mora')
    await retype(app, seller, '53')
    await app.user.click(save)
    expect(
      await within(dialog).findByText(
        'Ese código de vendedor ya está asignado a otro responsable.',
      ),
    ).toBeInTheDocument()
    expect(dbRow('Ana Mora').erpOwnerId).toBe(12)
  })

  it('si otro lo cambió antes, se cierra, avisa y muestra los datos nuevos', async () => {
    const app = await openOwners()
    const { seller, save } = await openEdit(app, 'Luis Vargas')
    // Otro administrador lo cambia mientras el diálogo está abierto.
    Object.assign(dbRow('Luis Vargas'), {
      erpOwnerId: '88',
      updatedAt: '2026-11-19T15:00:00.000Z',
    })
    await retype(app, seller, '31,32')
    await app.user.click(save)
    expect(await screen.findByText(/Alguien más cambió este registro/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(dbRow('Luis Vargas').erpOwnerId).toBe('88')
    await waitFor(() => expect(rowWith(app.table, 'Luis Vargas')).toHaveTextContent('88'))
  })

  it('"Actualizar responsables del CRM" agrega los que faltan y avisa cuántos', async () => {
    const app = await openOwners()
    const before = bodyRows(app.table).length
    await app.user.click(screen.getByRole('button', { name: 'Actualizar responsables del CRM' }))
    expect(
      await screen.findByText(
        'Se agregaron 2 responsables nuevos y se actualizaron los datos de 1 responsable.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(bodyRows(app.table)).toHaveLength(before + 2))
    expect(rowWith(app.table, 'Nuria Campos')).toHaveTextContent('Sin vendedor')
    // Los códigos que ya estaban no cambian.
    expect(rowWith(app.table, 'Erick Figueroa Pavón')).toHaveTextContent('53')

    await app.user.click(screen.getByRole('button', { name: 'Actualizar responsables del CRM' }))
    expect(await screen.findByText('No hay responsables nuevos en el CRM.')).toBeInTheDocument()
  })

  it('Smarteam edita en la empresa elegida (ruta de staff)', async () => {
    const [globex] = getDb().ownerMappings.filter((o) => o.tenantKey === 'GLOBEX')
    const requests = recordRequests(`/api/staff/tenants/GLOBEX/owner-mappings/${globex.id}`)
    const app = await openOwners('/responsables?empresa=GLOBEX', staff)
    const { employee, save } = await openEdit(app, globex.crmOwnerName)
    await retype(app, employee, '15')
    await app.user.click(save)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requests.map((r) => r.method)).toEqual(['PATCH'])
    expect(globex.erpEmployeeId).toBe('15')
  })

  it('textos del aviso de sincronización', () => {
    expect(syncMessage({ added: 1, updated: 0 })).toBe('Se agregó 1 responsable nuevo.')
    expect(syncMessage({ added: 0, updated: 2 })).toBe(
      'No hay responsables nuevos; se actualizaron los datos de 2 responsables.',
    )
    expect(syncMessage({ added: 0, updated: 0 })).toBe('No hay responsables nuevos en el CRM.')
  })
})
