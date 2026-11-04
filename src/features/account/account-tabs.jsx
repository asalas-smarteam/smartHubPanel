import { NavLink } from 'react-router'

import { usePermissions } from '@/features/auth/permissions'
import { cn } from '@/lib/utils'

import { ACCOUNT_LINKS } from './account-links'

/**
 * Pestañas de "Mi cuenta" (plan 4z): links entre sus páginas (no pestañas de ARIA: cada una es
 * una ruta).
 */
export function AccountTabs() {
  const { can } = usePermissions()
  const tabs = ACCOUNT_LINKS.filter((tab) => can(tab.permission))
  return (
    <nav aria-label="Mi cuenta" className="glass flex w-fit gap-1 rounded-lg p-1 text-sm">
      {tabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
