import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'

import { Toaster } from '@/components/ui/sonner'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null

/**
 * @param {{ queryClient: any, children: any, devtools?: boolean, toastDuration?: number }} props
 *   `toastDuration`: solo para los tests (Infinity), así un aviso no se cierra mientras
 *   la máquina tarda en cargar la página siguiente.
 */
export function AppProviders({ queryClient, children, devtools = true, toastDuration }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster duration={toastDuration} />
      {devtools && ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
