import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Regla del spec: el frontend es genérico. Ningún archivo nombra sistemas concretos
// ni usa la llave interna del backend. Los patrones se arman por partes para que
// este archivo no se encuentre a sí mismo.
const rules = [
  { name: 'hub' + 'spot', pattern: new RegExp('hub' + 'spot', 'i') },
  { name: 's' + 'ap', pattern: new RegExp('\\bs' + 'ap\\b', 'i') },
  { name: 'internal' + '-key', pattern: new RegExp('internal' + '[-_ ]?key', 'i') },
]

const root = process.cwd()
const thisFile = path.join(root, 'src', 'forbidden-names.test.js')

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

const files = [
  ...listFiles(path.join(root, 'src')),
  ...listFiles(path.join(root, 'public')),
  path.join(root, 'index.html'),
].filter((file) => file !== thisFile && /\.(jsx?|mjs|css|html|svg|json)$/.test(file))

describe('nombres prohibidos', () => {
  it('revisa al menos los archivos de src, public e index.html', () => {
    expect(files.length).toBeGreaterThan(3)
  })

  it.each(rules)('ningún archivo menciona "$name"', ({ pattern }) => {
    const offenders = files
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(root, file))
    expect(offenders).toEqual([])
  })
})
