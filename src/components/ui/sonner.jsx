import { Toaster as Sonner } from 'sonner'

import { useTheme } from '@/app/theme'

// Ajuste Smarteam: sigue el tema del panel y los avisos usan `glass-strong`.
function Toaster(props) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
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
