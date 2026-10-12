import { Toaster as Sonner } from 'sonner'

// Ajuste Smarteam: tema claro fijo (no hay modo oscuro en la Fase 1) y avisos con `glass-strong`.
function Toaster(props) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'glass-strong !text-foreground',
          description: '!text-muted-foreground',
        },
      }}
      style={{
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
      }}
      {...props}
    />
  )
}

export { Toaster }
