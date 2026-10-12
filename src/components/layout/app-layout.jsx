import { LogOutIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { AppBackground } from '@/components/brand/app-background'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { usePermissions } from '@/features/auth/permissions'
import { useLogout, useSession } from '@/features/auth/session'
import { cn } from '@/lib/utils'

import { visibleNavItems } from './nav'

function NavList({ items, onNavigate }) {
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-1 text-sm">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-white/90 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const { data: session } = useSession()
  const { can } = usePermissions()
  const logout = useLogout()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const user = session?.user
  const items = visibleNavItems(can)

  async function handleLogout() {
    try {
      await logout.mutateAsync()
    } catch {
      // La sesión local se limpia igual (onSettled).
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh">
      <AppBackground />

      <aside className="glass-dark sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-8 p-5 md:flex">
        <Logo tone="light" />
        <NavList items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <header className="glass flex items-center justify-between gap-4 rounded-xl px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="glass-dark w-64 gap-8 border-0 p-5">
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <SheetDescription className="sr-only">Secciones del panel</SheetDescription>
                <Logo tone="light" />
                <NavList items={items} onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.companyName ?? 'Smarteam'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            <LogOutIcon aria-hidden="true" />
            Cerrar sesión
          </Button>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
