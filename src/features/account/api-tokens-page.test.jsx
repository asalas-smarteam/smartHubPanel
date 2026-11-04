import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { buildToken, SEED_API_TOKEN } from '@/mocks/api-tokens'
import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const { smarteam, clienteUsuario } = DEMO_ACCOUNTS
const DAY_MS = 24 * 3_600_000

async function openTokens(options = {}) {
  const app = renderApp({ route: '/cuenta/tokens', session: smarteam.email, ...options })
  await screen.findByRole('heading', { name: 'Tokens de API' })
  return app
}

const table = () => screen.findByRole('table', { name: 'Tokens de API' })

/**
 * Clic en el fondo del diálogo (afuera del contenido). Radix deja `pointer-events: none` en el
 * body mientras el diálogo está abierto, así que se salta esa comprobación de user-event.
 */
const clickOutside = () =>
  userEvent
    .setup({ pointerEventsCheck: 0 })
    .click(document.querySelector('[data-slot="dialog-overlay"]'))

/** Agrega tokens activos a la cuenta Smarteam del seed (directo en la base del mock). */
function addTokens(count) {
  for (let i = 0; i < count; i += 1) {
    getDb().apiTokens.push(
      buildToken({
        userId: 'u-staff-1',
        name: `Equipo ${i + 1}`,
        value: `spn_${String(i).padStart(43, 'a')}`,
        createdAt: new Date(Date.now() - (i + 20) * DAY_MS).toISOString(),
      }),
    )
  }
}

describe('Mi cuenta: pestañas (plan 4z)', () => {
  it('el botón "Cuenta" lleva a Contraseña y las pestañas navegan a Tokens de API', async () => {
    const { user, router } = renderApp({ route: '/bandeja', session: smarteam.email })
    const accountLink = await screen.findByRole('link', { name: 'Mi cuenta' })
    expect(accountLink).toHaveTextContent('Cuenta')
    await user.click(accountLink)
    expect(router.state.location.pathname).toBe('/cuenta/contrasena')

    const tabs = await screen.findByRole('navigation', { name: 'Mi cuenta' })
    expect(within(tabs).getByRole('link', { name: 'Contraseña' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(within(tabs).getByRole('link', { name: 'Tokens de API' }))
    expect(router.state.location.pathname).toBe('/cuenta/tokens')
    expect(await screen.findByRole('heading', { name: 'Tokens de API' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Mi cuenta' })).getByRole('link', {
        name: 'Tokens de API',
      }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('con staff.tickets pero sin staff.users: solo la pestaña de tokens', async () => {
    getDb().users.find((u) => u.id === 'u-staff-1').permissions = ['staff.tickets']
    const { user, router } = renderApp({ route: '/bandeja', session: smarteam.email })
    await user.click(await screen.findByRole('link', { name: 'Mi cuenta' }))
    expect(router.state.location.pathname).toBe('/cuenta/tokens')
    const tabs = await screen.findByRole('navigation', { name: 'Mi cuenta' })
    expect(within(tabs).queryByRole('link', { name: 'Contraseña' })).not.toBeInTheDocument()
  })

  it('cliente: sin botón de cuenta y sin acceso a los tokens', async () => {
    renderApp({ route: '/cuenta/tokens', session: clienteUsuario.email })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument()
  })
})

describe('Tokens de API (plan 4z)', () => {
  it('lista los tokens con prefijo, fechas y "Nunca" si no se usó', async () => {
    getDb().apiTokens[0].lastUsedAt = null
    await openTokens()
    const rows = within(await table()).getAllByRole('row')
    expect(rows).toHaveLength(2)
    const row = rows[1]
    expect(within(row).getByText('Claude (portátil)')).toBeInTheDocument()
    expect(within(row).getByText(`${SEED_API_TOKEN.slice(0, 8)}…`)).toHaveClass('font-mono')
    expect(within(row).getByText('Nunca')).toBeInTheDocument()
    // Al token del seed le faltan ~80 días: no se marca.
    expect(row.querySelector('[data-expiring]')).toBeNull()
    expect(screen.getByText(/se muestra una sola vez/)).toBeInTheDocument()
  })

  it('marca en ámbar los que vencen en 7 días o menos', async () => {
    getDb().apiTokens[0].expiresAt = new Date(Date.now() + 3 * DAY_MS - 60_000).toISOString()
    await openTokens()
    const row = within(await table()).getAllByRole('row')[1]
    expect(within(row).getByText('Vence en 3 días').closest('[data-expiring]')).toHaveClass(
      'text-status-waiting-fg',
    )
  })

  it('crear: pide nombre y contraseña; muestra el token una vez con Copiar y cómo configurarlo', async () => {
    const { user, queryClient } = await openTokens()
    await user.click(screen.getByRole('button', { name: 'Crear token' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo token de API' })

    // Nombre y contraseña son obligatorios.
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))
    expect(await within(dialog).findByText('Escribe un nombre para reconocerlo.')).toBeVisible()
    expect(within(dialog).getByText('Escribe tu contraseña actual.')).toBeVisible()
    const password = within(dialog).getByLabelText('Tu contraseña actual')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')

    await user.type(within(dialog).getByLabelText('Nombre'), 'Claude en la oficina')
    await user.type(password, smarteam.password)
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))

    const created = await screen.findByRole('dialog', { name: 'Token creado' })
    const input = within(created).getByLabelText('Tu token')
    expect(input).toHaveAttribute('readonly')
    const value = input.value
    expect(value).toMatch(/^spn_[A-Za-z0-9_-]{43}$/)
    expect(within(created).getByText('Guárdalo ahora: no se vuelve a mostrar.')).toBeVisible()
    expect(within(created).getByText('PANEL_TOKEN')).toBeInTheDocument()
    expect(within(created).getByText(`${window.location.origin}/api`)).toBeInTheDocument()

    await user.click(within(created).getByRole('button', { name: 'Copiar' }))
    expect(await within(created).findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(value)

    // Con el token a la vista, ni Escape ni el clic afuera cierran, y no hay botón "Cerrar".
    expect(within(created).queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await clickOutside()
    expect(screen.getByRole('dialog', { name: 'Token creado' })).toBeInTheDocument()

    await user.click(within(created).getByRole('button', { name: 'Ya lo guardé' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Queda en la lista (primero, sin uso) y el valor completo ya no está en pantalla.
    await waitFor(async () => expect(within(await table()).getAllByRole('row')).toHaveLength(3))
    const firstRow = within(await table()).getAllByRole('row')[1]
    expect(within(firstRow).getByText('Claude en la oficina')).toBeInTheDocument()
    expect(within(firstRow).getByText('Nunca')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(value)
    expect(screen.queryByDisplayValue(value)).not.toBeInTheDocument()

    // Ni el token ni la contraseña quedan en la caché de mutaciones.
    await waitFor(() => {
      const cached = JSON.stringify(
        queryClient
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state),
      )
      expect(cached).not.toContain(value)
      expect(cached).not.toContain(smarteam.password)
    })
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
  })

  it('contraseña actual incorrecta: el error va en el campo y no se crea nada', async () => {
    const { user } = await openTokens()
    await table()
    await user.click(screen.getByRole('button', { name: 'Crear token' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo token de API' })
    await user.type(within(dialog).getByLabelText('Nombre'), 'Otro')
    await user.type(within(dialog).getByLabelText('Tu contraseña actual'), 'no-es-esta-clave')
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))

    const field = within(dialog).getByLabelText('Tu contraseña actual')
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(within(dialog).getByText('La contraseña actual no es correcta.')).toBeVisible()
    expect(within(dialog).getAllByText('La contraseña actual no es correcta.')).toHaveLength(1)
    expect(getDb().apiTokens).toHaveLength(1)

    // Sin envío en curso ni token a la vista, el clic afuera sí cierra.
    await clickOutside()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mientras se crea no se puede cerrar el diálogo', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const real = getDb()
    server.use(
      http.post('/api/account/api-tokens', async () => {
        await gate
        return HttpResponse.json(
          {
            token: `spn_${'b'.repeat(43)}`,
            item: { ...real.apiTokens[0], id: 'tok-lento', name: 'Lento', lastUsedAt: null },
          },
          { status: 201 },
        )
      }),
    )
    const { user } = await openTokens()
    await table()
    await user.click(screen.getByRole('button', { name: 'Crear token' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo token de API' })
    await user.type(within(dialog).getByLabelText('Nombre'), 'Lento')
    await user.type(within(dialog).getByLabelText('Tu contraseña actual'), smarteam.password)
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))

    expect(await within(dialog).findByRole('button', { name: 'Creando…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(within(dialog).queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await clickOutside()
    expect(screen.getByRole('dialog', { name: 'Nuevo token de API' })).toBeInTheDocument()

    release()
    expect(await screen.findByRole('dialog', { name: 'Token creado' })).toBeInTheDocument()
  })

  it('si no se puede copiar, avisa y deja el token seleccionado', async () => {
    const { user } = await openTokens()
    await table()
    await user.click(screen.getByRole('button', { name: 'Crear token' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo token de API' })
    await user.type(within(dialog).getByLabelText('Nombre'), 'Sin portapapeles')
    await user.type(within(dialog).getByLabelText('Tu contraseña actual'), smarteam.password)
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))
    const created = await screen.findByRole('dialog', { name: 'Token creado' })

    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('sin permiso'))
    await user.click(within(created).getByRole('button', { name: 'Copiar' }))
    expect(
      await screen.findByText('No se pudo copiar; selecciónalo y cópialo.'),
    ).toBeInTheDocument()
    const input = within(created).getByLabelText('Tu token')
    expect(input).toHaveFocus()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
    expect(within(created).getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('revocar pide confirmación; cancelar no cambia nada', async () => {
    const { user } = await openTokens()
    await table()
    await user.click(screen.getByRole('button', { name: 'Revocar Claude (portátil)' }))
    const confirm = await screen.findByRole('alertdialog', {
      name: '¿Revocar el token «Claude (portátil)»?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    expect(getDb().apiTokens[0].revokedAt).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Revocar Claude (portátil)' }))
    const again = await screen.findByRole('alertdialog')
    await user.click(within(again).getByRole('button', { name: 'Revocar' }))
    expect(await screen.findByText('Token «Claude (portátil)» revocado.')).toBeInTheDocument()
    expect(getDb().apiTokens[0].revokedAt).not.toBeNull()
    // Sin tokens: estado vacío.
    expect(await screen.findByText('Todavía no tienes tokens')).toBeInTheDocument()
  })

  it('con 5 tokens activos "Crear token" se deshabilita y explica el motivo', async () => {
    addTokens(4)
    await openTokens()
    await table()
    const button = screen.getByRole('button', { name: 'Crear token' })
    await waitFor(() => expect(button).toBeDisabled())
    expect(button).toHaveAccessibleDescription(
      'Llegaste al máximo de 5 tokens activos. Revoca uno para crear otro.',
    )
  })

  it('si igual llega 409 token_limit al crear, muestra el error en el diálogo', async () => {
    server.use(
      http.post('/api/account/api-tokens', () =>
        HttpResponse.json(
          { error: 'token_limit', message: 'Ya tienes 5 tokens activos.' },
          { status: 409 },
        ),
      ),
    )
    const { user } = await openTokens()
    await table()
    await user.click(screen.getByRole('button', { name: 'Crear token' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo token de API' })
    await user.type(within(dialog).getByLabelText('Nombre'), 'Otro')
    await user.type(within(dialog).getByLabelText('Tu contraseña actual'), smarteam.password)
    await user.click(within(dialog).getByRole('button', { name: 'Crear token' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Ya tienes 5 tokens activos. Revoca uno para crear otro.',
    )
  })

  it('estado vacío y error al cargar', async () => {
    getDb().apiTokens = []
    const { unmount } = await openTokens()
    expect(await screen.findByText('Todavía no tienes tokens')).toBeInTheDocument()
    unmount()

    server.use(http.get('/api/account/api-tokens', () => HttpResponse.json({}, { status: 500 })))
    await openTokens()
    expect(await screen.findByText('No pudimos cargar la información')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
