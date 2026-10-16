import { MoonIcon, SunIcon } from 'lucide-react'

import { useTheme } from '@/app/theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Botón para cambiar entre el tema oscuro y el claro. */
export function ThemeToggle({ className, variant = 'outline' }) {
  const { theme, toggle } = useTheme()
  const toLight = theme === 'dark'
  const label = toLight ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn('gap-1.5', className)}
    >
      {toLight ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      <span className="hidden sm:inline">{toLight ? 'Claro' : 'Oscuro'}</span>
    </Button>
  )
}
