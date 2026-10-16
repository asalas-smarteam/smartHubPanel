import { cn } from '@/lib/utils'

/**
 * Nombre de la marca en texto. Se reemplaza por el logo oficial en SVG cuando esté disponible.
 * @param {{ tone?: 'dark' | 'light', className?: string }} props
 */
export function Logo({ tone = 'dark', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 text-xl font-extrabold tracking-tight',
        tone === 'light' ? 'text-white' : 'text-foreground',
        className,
      )}
    >
      Smarteam
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          tone === 'light' ? 'bg-brand-accent' : 'bg-brand-accent-strong',
        )}
      />
    </span>
  )
}
