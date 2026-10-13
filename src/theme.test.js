import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Verifica el contraste (WCAG 2.x) de los colores del tema que vive en src/index.css.
// Si alguien cambia un color y rompe la legibilidad, este test falla.
const css = readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8')

function readVar(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!match) throw new Error(`No encontré --${name} con un color hex en index.css`)
  return match[1]
}

function readAlpha(utility) {
  const block = css.match(new RegExp(`@utility ${utility} \\{([^}]*)\\}`))
  if (!block) throw new Error(`No encontré @utility ${utility}`)
  const rgb = block[1].match(/background-color:\s*rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/)
  return { rgb: rgb.slice(1, 4).map(Number), alpha: Number(rgb[4]) }
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const channel = (c) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const mix = (fg, alpha, bg) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)))

const brand = (name) => hexToRgb(readVar(`color-brand-${name}`))
const theme = (name) => hexToRgb(readVar(name))
const WHITE = [255, 255, 255]
const AA = 4.5

describe('contraste del tema (WCAG AA, texto normal)', () => {
  const pairs = [
    ['primary-foreground sobre primary', theme('primary-foreground'), theme('primary')],
    ['blanco sobre el hover del primario', WHITE, theme('primary-hover')],
    ['blanco sobre accent-strong (botón naranja)', WHITE, brand('accent-strong')],
    ['accent-deep sobre blanco (insignia)', brand('accent-deep'), WHITE],
    ['foreground sobre background', theme('foreground'), theme('background')],
    ['muted-foreground sobre blanco', theme('muted-foreground'), WHITE],
    ['muted-foreground sobre background', theme('muted-foreground'), theme('background')],
    ['muted-foreground sobre muted', theme('muted-foreground'), theme('muted')],
    ['secondary-foreground sobre secondary', theme('secondary-foreground'), theme('secondary')],
    ['primary como enlace sobre background', theme('primary'), theme('background')],
    ['navy sobre blue-pale (ítem activo)', brand('navy'), brand('blue-pale')],
    [
      'insignia "Esperando cliente"',
      hexToRgb(readVar('color-status-waiting-fg')),
      hexToRgb(readVar('color-status-waiting-bg')),
    ],
    [
      'insignia "Resuelto" / "Activo"',
      hexToRgb(readVar('color-status-done-fg')),
      hexToRgb(readVar('color-status-done-bg')),
    ],
    [
      'insignia "Inactivo"',
      hexToRgb(readVar('color-status-muted-fg')),
      hexToRgb(readVar('color-status-muted-bg')),
    ],
    ['insignia "Abierto" (blanco sobre royal)', WHITE, brand('royal')],
    [
      'insignia "Con error" (eventos y syncs)',
      hexToRgb(readVar('color-status-error-fg')),
      hexToRgb(readVar('color-status-error-bg')),
    ],
    [
      'texto de error sobre blanco (contador "Fallidos")',
      hexToRgb(readVar('color-status-error-fg')),
      WHITE,
    ],
  ]

  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA)
  })

  it('el naranja base (#e8481c) NO alcanza AA con blanco: por eso los botones usan accent-strong', () => {
    expect(contrast(WHITE, brand('accent'))).toBeLessThan(AA)
  })
})

describe('contraste sobre vidrio, en el peor caso', () => {
  const background = theme('background')
  // Peor caso: una mancha del fondo al 25 % detrás del vidrio.
  const blobs = { royal: brand('royal'), accent: brand('accent'), blue: brand('blue') }

  it.each(Object.entries(blobs))('texto sobre glass con mancha %s', (_name, blob) => {
    const glass = readAlpha('glass')
    const behind = mix(blob, 0.25, background)
    const surface = mix(glass.rgb, glass.alpha, behind)
    expect(contrast(theme('foreground'), surface)).toBeGreaterThanOrEqual(AA)
    expect(contrast(theme('muted-foreground'), surface)).toBeGreaterThanOrEqual(AA)
  })

  it('texto sobre glass-strong en el login (fondo oscuro de la marca detrás)', () => {
    const strong = readAlpha('glass-strong')
    for (const behind of [brand('navy-deep'), brand('navy'), brand('royal')]) {
      const surface = mix(strong.rgb, strong.alpha, behind)
      expect(contrast(theme('foreground'), surface)).toBeGreaterThanOrEqual(AA)
      expect(contrast(theme('muted-foreground'), surface)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('glass (60 %) NO alcanza AA sobre el fondo oscuro: por eso el login usa glass-strong', () => {
    const glass = readAlpha('glass')
    const surface = mix(glass.rgb, glass.alpha, brand('navy-deep'))
    expect(contrast(theme('muted-foreground'), surface)).toBeLessThan(AA)
  })

  it('texto blanco sobre glass-dark (menú) con el azul de marca detrás', () => {
    const dark = readAlpha('glass-dark')
    const surface = mix(dark.rgb, dark.alpha, brand('royal'))
    expect(contrast(WHITE, surface)).toBeGreaterThanOrEqual(AA)
    expect(contrast(brand('blue-pale'), surface)).toBeGreaterThanOrEqual(AA)
  })
})

describe('respaldo sólido del vidrio', () => {
  it.each(['glass', 'glass-strong', 'glass-dark'])('%s tiene respaldo', (utility) => {
    const supports = css.match(/@supports not \(backdrop-filter: blur\(1px\)\) \{([\s\S]*?)\n\}/)
    const reduced = css.match(/@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/)
    expect(supports?.[1]).toContain(`.${utility} {`)
    expect(reduced?.[1]).toContain(`.${utility} {`)
  })
})
