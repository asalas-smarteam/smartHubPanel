import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const staff = DEMO_ACCOUNTS.smarteam.email

async function openUsers() {
  const app = renderApp({ route: '/usuarios?pageSize=50', session: staff })
  const table = await screen.findByRole('table', { name: 'Usuarios' })
  await screen.findByText(/\d+ resultados/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

async function chooseOption(user, comboboxName, optionName) {
  await user.click(screen.getByRole('combobox', { name: comboboxName }))
  await user.click(await screen.findByRole('option', { name: optionName }))
}

async function openRowAction(user, table, name, action) {
  await user.click(within(table).getByRole('button', { name: `Acciones para ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: action }))
}

describe('Usuarios: acciones', () => {
  it('crear un usuario Smarteam no pide empresa ni rol', async () => {
    const { user } = await openUsers()
    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo usuario' })
    await chooseOption(user, 'Tipo de cuenta', 'Smarteam')
    expect(within(dialog).queryByRole('combobox', { name: 'Empresa' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Rol' })).not.toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Correo'), 'nueva.dev@panel.test')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Nueva Dev')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByRole('dialog', { name: 'Contraseña temporal' })).toBeInTheDocument()
    const created = getDb().users.find((u) => u.email === 'nueva.dev@panel.test')
    expect(created).toMatchObject({ accountType: 'smarteam', tenantKey: null, role: null })
  })

  it('crear un cliente exige empresa y rol; la temporal se ve una sola vez', async () => {
    const requests = recordRequests('/api/staff/users', 'POST')
    const { user, table } = await openUsers()
    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo usuario' })

    await user.type(within(dialog).getByLabelText('Correo'), 'vendedor@acme.test')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Vendedor Nuevo')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))
    expect(await within(dialog).findByText('Elige la empresa.')).toBeInTheDocument()
    expect(within(dialog).getByText('Elige el rol.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)

    await chooseOption(user, 'Empresa', 'Acme Industrial')
    await chooseOption(user, 'Rol', 'Usuario')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))

    const passwordDialog = await screen.findByRole('dialog', { name: 'Contraseña temporal' })
    const field = within(passwordDialog).getByLabelText('Contraseña temporal')
    const password = field.value
    expect(password).toMatch(/^.{4}-.{4}-.{4}$/)
    expect(getDb().users.find((u) => u.email === 'vendedor@acme.test').password).toBe(password)
    expect(requests[0].headers.get('X-Panel-Request')).toBe('1')

    await user.click(within(passwordDialog).getByRole('button', { name: 'Ya la copié' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Contraseña temporal' })).not.toBeInTheDocument(),
    )
    expect(screen.queryByDisplayValue(password)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain(password)
    expect(await within(table).findByText('vendedor@acme.test')).toBeInTheDocument()
  })

  it('correo duplicado → error en el campo correo', async () => {
    const { user } = await openUsers()
    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo usuario' })
    await chooseOption(user, 'Tipo de cuenta', 'Smarteam')
    await user.type(within(dialog).getByLabelText('Correo'), DEMO_ACCOUNTS.clienteUsuario.email)
    await user.type(within(dialog).getByLabelText('Nombre'), 'Repetido')
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }))
    expect(await within(dialog).findByText('Ese correo ya está registrado.')).toBeInTheDocument()
  })

  it('restablecer pide confirmación y muestra la temporal nueva', async () => {
    const { user, table } = await openUsers()
    await openRowAction(user, table, 'Mario Quesada', 'Restablecer contraseña')
    const confirm = await screen.findByRole('alertdialog')
    expect(
      within(confirm).getByText('¿Restablecer la contraseña de Mario Quesada?'),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Restablecer' }))

    const passwordDialog = await screen.findByRole('dialog', { name: 'Contraseña temporal' })
    const password = within(passwordDialog).getByLabelText('Contraseña temporal').value
    const mario = getDb().users.find((u) => u.id === 'u-acme-usuario')
    expect(mario).toMatchObject({ password, mustChangePassword: true })
  })

  it('desactivar con confirmación y reactivar', async () => {
    const requests = recordRequests('/api/staff/users/u-acme-usuario', 'PATCH')
    const { user, table } = await openUsers()
    await openRowAction(user, table, 'Mario Quesada', 'Desactivar')
    const confirm = await screen.findByRole('alertdialog')
    expect(
      within(confirm).getByText(/Su sesión dejará de funcionar de inmediato/),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))

    const row = () => within(table).getByText('Mario Quesada').closest('tr')
    await waitFor(() => expect(within(row()).getByText('Inactivo')).toBeInTheDocument())
    expect(requests[0].headers.get('X-Panel-Request')).toBe('1')

    await openRowAction(user, table, 'Mario Quesada', 'Reactivar')
    await waitFor(() => expect(within(row()).getByText('Activo')).toBeInTheDocument())
  })

  it('cambiar el rol de usuario a admin', async () => {
    const { user, table } = await openUsers()
    await openRowAction(user, table, 'Mario Quesada', 'Cambiar rol')
    const dialog = await screen.findByRole('dialog', { name: 'Cambiar rol' })
    await chooseOption(user, 'Rol', 'Admin')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    const row = () => within(table).getByText('Mario Quesada').closest('tr')
    await waitFor(() => expect(within(row()).getByText('Admin')).toBeInTheDocument())
    expect(getDb().users.find((u) => u.id === 'u-acme-usuario').role).toBe('admin')
  })
})
