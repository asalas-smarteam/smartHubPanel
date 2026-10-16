import { cn } from '@/lib/utils'

/**
 * Fondo fijo de la app: color base del tema y manchas difusas con los colores de la marca.
 * La intensidad de cada mancha sale del tema (`--blob-*` en src/index.css). Estático y sin eventos.
 * `hero` (login): degradado azul de la marca en los dos temas.
 * @param {{ variant?: 'app' | 'hero', className?: string }} props
 */
export function AppBackground({ variant = 'app', className }) {
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
          'radial-gradient(760px 560px at 92% -4%, var(--blob-royal), transparent 70%)',
          'radial-gradient(620px 520px at 18% 30%, var(--blob-blue), transparent 70%)',
          'radial-gradient(560px 460px at 78% 62%, var(--blob-accent), transparent 70%)',
          'radial-gradient(520px 420px at 10% 92%, var(--blob-mint), transparent 70%)',
        ].join(', '),
      }}
    />
  )
}
