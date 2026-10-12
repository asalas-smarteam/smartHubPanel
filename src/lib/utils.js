import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases de Tailwind resolviendo conflictos (helper estándar de shadcn/ui). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
