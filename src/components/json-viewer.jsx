import 'react-json-view-lite/dist/index.css'

import { defaultStyles, JsonView } from 'react-json-view-lite'

import { cn } from '@/lib/utils'

// Colores del tema del panel sobre la base de la librería (que da el plegado y los íconos).
const panelStyles = {
  ...defaultStyles,
  container: 'font-mono text-xs leading-relaxed',
  label: 'mr-1 font-semibold text-[var(--json-key)]',
  clickableLabel: 'mr-1 cursor-pointer font-semibold text-[var(--json-key)]',
  stringValue: 'text-[var(--json-string)]',
  numberValue: 'text-[var(--json-number)]',
  booleanValue: 'text-[var(--json-boolean)]',
  nullValue: 'text-[var(--json-muted)]',
  undefinedValue: 'text-[var(--json-muted)]',
  otherValue: 'text-[var(--json-muted)]',
  punctuation: 'text-[var(--json-muted)]',
  collapsedContent: `${defaultStyles.collapsedContent} text-[var(--json-muted)]`,
  ariaLables: { collapseJson: 'Plegar', expandJson: 'Desplegar' },
}

/** Primer nivel abierto, el resto plegado. */
const expandFirstLevel = (level) => level < 1

/**
 * Visor JSON formateado y plegable (para `snapshot`, `payload`, `audit`, `errors`…).
 * @param {{ data: unknown, label?: string, className?: string, expandAll?: boolean }} props
 */
export function JsonViewer({ data, label = 'Datos JSON', className, expandAll = false }) {
  const isStructured = data !== null && typeof data === 'object'
  return (
    <div className={cn('max-h-96 overflow-auto rounded-md border bg-surface px-3 py-2', className)}>
      {isStructured ? (
        <JsonView
          data={data}
          style={panelStyles}
          shouldExpandNode={expandAll ? () => true : expandFirstLevel}
          aria-label={label}
        />
      ) : (
        <pre className="font-mono text-xs whitespace-pre-wrap">{String(data ?? '—')}</pre>
      )}
    </div>
  )
}
