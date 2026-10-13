import 'react-json-view-lite/dist/index.css'

import { defaultStyles, JsonView } from 'react-json-view-lite'

import { cn } from '@/lib/utils'

// Colores del tema del panel sobre la base de la librería (que da el plegado y los íconos).
const panelStyles = {
  ...defaultStyles,
  container: 'font-mono text-xs leading-relaxed',
  label: 'mr-1 font-semibold text-brand-navy',
  clickableLabel: 'mr-1 cursor-pointer font-semibold text-brand-navy',
  stringValue: 'text-emerald-800',
  numberValue: 'text-brand-royal',
  booleanValue: 'text-brand-accent-deep',
  nullValue: 'text-brand-ink-soft',
  undefinedValue: 'text-brand-ink-soft',
  otherValue: 'text-brand-ink-soft',
  punctuation: 'text-brand-ink-soft',
  collapsedContent: `${defaultStyles.collapsedContent} text-brand-ink-soft`,
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
    <div
      className={cn('max-h-96 overflow-auto rounded-md border bg-white/90 px-3 py-2', className)}
    >
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
