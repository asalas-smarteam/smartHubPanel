// Revisa dist/ después de `vite build`: el build de producción no debe llevar
// los mocks de MSW, la llave interna del backend ni nombres de sistemas concretos.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const rules = [
  { name: 'worker de MSW', pattern: /mockServiceWorker|setupWorker/ },
  { name: 'llave interna', pattern: /x-internal-key|INTERNAL_KEY/i },
  { name: 'nombre de sistema (hub' + 'spot)', pattern: new RegExp('hub' + 'spot', 'i') },
  { name: 'nombre de sistema (s' + 'ap)', pattern: new RegExp('\\bs' + 'ap\\b', 'i') },
]

const textExtensions = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.map'])

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

let files
try {
  files = listFiles(distDir)
} catch {
  console.error(`check-build: no existe ${distDir}. Corre primero "vite build".`)
  process.exit(1)
}

const problems = []
for (const file of files) {
  const relative = path.relative(distDir, file)
  if (/mockServiceWorker/.test(relative)) {
    problems.push(`${relative}: archivo del worker de MSW`)
    continue
  }
  if (!textExtensions.has(path.extname(file))) continue
  const content = readFileSync(file, 'utf8')
  for (const rule of rules) {
    const match = content.match(rule.pattern)
    if (match) {
      const start = Math.max(0, match.index - 40)
      const context = content.slice(start, match.index + match[0].length + 40).replace(/\s+/g, ' ')
      problems.push(`${relative}: ${rule.name} → "…${context}…"`)
    }
  }
}

if (problems.length > 0) {
  console.error('check-build: dist/ contiene cosas que no deben publicarse:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`check-build: OK (${files.length} archivos revisados en dist/)`)
