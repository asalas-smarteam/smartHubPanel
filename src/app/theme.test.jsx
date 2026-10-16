import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from '@/components/theme-toggle'

import { getTheme, readStoredTheme, setTheme, THEME_STORAGE_KEY } from './theme'

afterEach(() => {
  delete document.documentElement.dataset.theme
  window.localStorage.clear()
})

describe('tema', () => {
  it('por defecto es oscuro', () => {
    expect(getTheme()).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('setTheme aplica data-theme y lo recuerda', () => {
    setTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(readStoredTheme()).toBe('light')
  })

  it('un valor desconocido vuelve al oscuro', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(readStoredTheme()).toBe('dark')
  })

  it('sin almacenamiento disponible, el tema se aplica igual', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    setTheme('light')
    expect(getTheme()).toBe('light')
    spy.mockRestore()
  })

  it('el botón cambia entre oscuro y claro', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }))
    expect(getTheme()).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Cambiar a tema oscuro' }))
    expect(getTheme()).toBe('dark')
  })

  it('index.html aplica el tema guardado antes de cargar la app', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toMatch(/localStorage\.getItem\('panel-theme'\)/)
    expect(html.indexOf('panel-theme')).toBeLessThan(html.indexOf('/src/main.jsx'))
  })
})
