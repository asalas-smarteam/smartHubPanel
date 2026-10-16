import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Contraste (WCAG 2.x) de los DOS temas de src/index.css, en el peor caso: vidrio con la mancha
// de color más intensa del fondo detrás. Si alguien cambia un color y rompe la legibilidad,
// este test falla.
const css = readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8')

const BLOCKS = {
  dark: /:root\[data-theme='dark'\] \{([\s\S]*?)\n\}/,
  light: /:root\[data-theme='light'\] \{([\s\S]*?)\n\}/,
}

function readVar(theme, name) {
  const block = css.match(BLOCKS[theme])?.[1]
  if (!block) throw new Error(`No encontré el bloque del tema ${theme}`)
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`No encontré --${name} en el tema ${theme}`)
  return parseColor(match[1].trim())
}

/** `#rrggbb` o `rgb(r g b / a)` → { rgb, a }. */
function parseColor(value) {
  if (value.startsWith('#'))
    return { rgb: [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)), a: 1 }
  const m = value.match(/rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)/)
  if (!m) throw new Error(`Color no soportado por el test: ${value}`)
  return { rgb: m.slice(1, 4).map(Number), a: m[4] === undefined ? 1 : Number(m[4]) }
}

const channel = (c) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** Color translúcido sobre un fondo opaco. */
const over = ({ rgb, a }, bg) => rgb.map((v, i) => Math.round(v * a + bg[i] * (1 - a)))

const WHITE = [255, 255, 255]
const AA = 4.5
const NON_TEXT = 3 // barras de gráficos, íconos

describe.each(['dark', 'light'])('tema %s', (theme) => {
  const v = (name) => readVar(theme, name)
  const background = v('background').rgb
  // Fondos posibles detrás de un panel: el color base solo y con cada mancha de la marca.
  const behinds = [
    background,
    ...['royal', 'blue', 'accent', 'mint'].map((b) => over(v(`blob-${b}`), background)),
  ]
  const glassSurfaces = behinds.map((behind) => over(v('glass-bg'), behind))
  const raisedSurfaces = behinds.map((behind) => over(v('glass-raised-to'), behind))
  const minContrast = (fg, surfaces) =>
    Math.min(...surfaces.map((surface) => contrast(fg, surface)))

  it.each([
    'foreground',
    'muted-foreground',
    'subtle-foreground',
    'link',
    'destructive',
    'positive',
  ])('%s sobre vidrio (peor caso)', (name) => {
    expect(minContrast(v(name).rgb, glassSurfaces)).toBeGreaterThanOrEqual(AA)
  })

  it.each(['foreground', 'muted-foreground', 'subtle-foreground'])(
    '%s sobre vidrio destacado',
    (name) => {
      expect(minContrast(v(name).rgb, raisedSurfaces)).toBeGreaterThanOrEqual(AA)
    },
  )

  it('vidrio fuerte (login, diálogos) sobre el degradado de la marca y sobre la app', () => {
    const hero = [
      [11, 88, 211],
      [5, 24, 73],
    ]
    const surfaces = [...hero, ...glassSurfaces].map((behind) => over(v('glass-strong-to'), behind))
    for (const name of ['popover-foreground', 'muted-foreground']) {
      expect(minContrast(v(name).rgb, surfaces)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('texto del aviso informativo sobre vidrio', () => {
    const surfaces = glassSurfaces.map((surface) => over(v('notice'), surface))
    expect(minContrast(v('foreground').rgb, surfaces)).toBeGreaterThanOrEqual(AA)
  })

  it.each(['done', 'waiting', 'muted', 'error', 'info', 'corrected'])('insignia %s', (name) => {
    expect(contrast(v(`status-${name}-fg`).rgb, v(`status-${name}-bg`).rgb)).toBeGreaterThanOrEqual(
      AA,
    )
  })

  it('botones: principal, de marca y destructivo', () => {
    expect(contrast(v('primary-foreground').rgb, v('primary').rgb)).toBeGreaterThanOrEqual(AA)
    expect(contrast(WHITE, [214, 62, 20])).toBeGreaterThanOrEqual(AA) // brand-accent-strong
    expect(contrast(WHITE, v('destructive-solid').rgb)).toBeGreaterThanOrEqual(AA)
  })

  it.each([
    'chart-ok',
    'chart-bad',
    'chart-wait',
    'chart-1',
    'chart-2',
    'chart-warn',
    'icon',
    'cause-deal',
    'cause-fiscal',
    'cause-master',
    'cause-validation',
    'cause-connectivity',
    'cause-other',
  ])('%s se distingue del vidrio (3:1)', (name) => {
    expect(minContrast(v(name).rgb, glassSurfaces)).toBeGreaterThanOrEqual(NON_TEXT)
  })

  it('visor JSON sobre su superficie', () => {
    const surfaces = glassSurfaces.map((surface) => over(v('surface'), surface))
    for (const name of ['json-key', 'json-string', 'json-number', 'json-boolean', 'json-muted']) {
      expect(minContrast(v(name).rgb, surfaces)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('menú lateral: texto blanco y el ítem activo', () => {
    const surfaces = behinds.map((behind) => over(v('side-bg'), behind))
    expect(minContrast(WHITE, surfaces)).toBeGreaterThanOrEqual(AA)
    expect(contrast([5, 24, 73], [207, 226, 250])).toBeGreaterThanOrEqual(AA) // navy sobre blue-pale
  })
})

describe('respaldo sólido del vidrio', () => {
  it.each(['glass', 'glass-raised', 'glass-strong', 'glass-dark'])(
    '%s tiene respaldo',
    (utility) => {
      const supports = css.match(/@supports not \(backdrop-filter: blur\(1px\)\) \{([\s\S]*?)\n\}/)
      const reduced = css.match(/@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/)
      expect(supports?.[1]).toContain(`.${utility} {`)
      expect(reduced?.[1]).toContain(`.${utility} {`)
    },
  )
})

// Los componentes usan tokens, nunca colores sueltos de un tema (se colarían en el otro).
// El menú lateral (components/layout) y el degradado de las pantallas de acceso
// (auth-shell) son oscuros en los dos temas: quedan fuera.
describe('sin colores fijos de tema en los componentes', () => {
  const root = path.join(process.cwd(), 'src')
  const list = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      return statSync(full).isDirectory() ? list(full) : [full]
    })
  const files = list(root).filter(
    (file) =>
      /\.jsx?$/.test(file) &&
      !/\.test\.jsx?$/.test(file) &&
      !file.includes(`${path.sep}mocks${path.sep}`) &&
      !file.includes(`${path.sep}layout${path.sep}`) &&
      !file.endsWith(path.join('auth', 'auth-shell.jsx')),
  )
  const banned =
    /\b(bg-white(\/\d+)?|text-brand-navy|text-brand-royal|brand-ink-soft|brand-paper-tint|text-emerald-\d+|bg-brand-navy\/\d+|shadow-card)\b/

  it('ningún archivo usa clases de un solo tema', () => {
    const offenders = files
      .filter((file) => banned.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(root, file))
    expect(offenders).toEqual([])
  })
})
