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

export function AppProviders({ queryClient, children, devtools = true }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {devtools && ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
