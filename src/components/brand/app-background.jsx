import { cn } from '@/lib/utils'

/**
 * Fondo fijo de la app: color base claro y manchas difusas con los colores de la marca.
 * Es estático (sin animaciones) y no recibe eventos.
 * @param {{ variant?: 'light' | 'hero', className?: string }} props
 */
export function AppBackground({ variant = 'light', className }) {
  if (variant === 'hero') {
    return (
      <div
        aria-hidden="true"
        className={cn('pointer-events-none fixed inset-0 -z-10', className)}
        style={{
          backgroundImage: [
            'radial-gradient(600px 440px at 92% 70%, rgb(232 72 28 / 0.35), transparent 62%)',
            'radial-gradient(900px 700px at 10% 10%, rgb(30 143 246 / 0.25), transparent 70%)',
            'linear-gradient(150deg, #0b58d3, #051849 60%, #03102f)',
          ].join(', '),
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10 bg-background', className)}
      style={{
        backgroundImage: [
          'radial-gradient(900px 600px at 100% 0%, rgb(11 88 211 / 0.25), transparent 70%)',
          'radial-gradient(700px 500px at 0% 100%, rgb(30 143 246 / 0.22), transparent 70%)',
          'radial-gradient(500px 380px at 85% 95%, rgb(232 72 28 / 0.18), transparent 65%)',
        ].join(', '),
      }}
    />
  )
}
