import { lazy, Suspense } from 'react'

import { LoadingState } from '@/components/page-states'

/**
 * Página cargada bajo demanda (cada sección en su propio archivo del build).
 * @param {() => Promise<Record<string, unknown>>} loader import() del módulo
 * @param {string} exportName nombre del componente exportado
 */
export function lazyPage(loader, exportName) {
  const Page = lazy(() => loader().then((module) => ({ default: module[exportName] })))
  return function LazyPage() {
    return (
      <Suspense fallback={<LoadingState />}>
        <Page />
      </Suspense>
    )
  }
}
