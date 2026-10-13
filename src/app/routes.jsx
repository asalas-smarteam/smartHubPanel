import { AppLayout } from '@/components/layout/app-layout'
import { NotFoundPage, RouteErrorPage } from '@/components/page-states'
import { ChangePasswordPage } from '@/features/auth/change-password-page'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequirePasswordChange,
  RequirePermission,
} from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/login-page'
import { PERMISSIONS } from '@/features/auth/permissions'
import { HomePage } from '@/features/home/home-page'

import { lazyPage } from './lazy-page'

// Cada sección se descarga recién cuando se abre.
const SupportListPage = lazyPage(
  () => import('@/features/support/support-list-page'),
  'SupportListPage',
)
const NewTicketPage = lazyPage(() => import('@/features/support/new-ticket-page'), 'NewTicketPage')
const TicketPage = lazyPage(() => import('@/features/support/ticket-page'), 'TicketPage')
const InboxPage = lazyPage(() => import('@/features/inbox/inbox-page'), 'InboxPage')
const StaffTicketPage = lazyPage(
  () => import('@/features/inbox/staff-ticket-page'),
  'StaffTicketPage',
)
const EventsPage = lazyPage(() => import('@/features/events/events-page'), 'EventsPage')
const EventPage = lazyPage(() => import('@/features/events/event-page'), 'EventPage')
const SyncsPage = lazyPage(() => import('@/features/syncs/syncs-page'), 'SyncsPage')
const SyncPage = lazyPage(() => import('@/features/syncs/sync-page'), 'SyncPage')
const UsersPage = lazyPage(() => import('@/features/users/users-page'), 'UsersPage')

const withPermission = (permission, Page) => ({
  element: <RequirePermission permission={permission} />,
  children: [{ index: true, element: <Page /> }],
})

/** Tabla de rutas de la app (la usan el router del navegador y los tests). */
export const routes = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/login',
        element: <RedirectIfAuthenticated />,
        children: [{ index: true, element: <LoginPage /> }],
      },
      {
        path: '/cambiar-contrasena',
        element: <RequirePasswordChange />,
        children: [{ index: true, element: <ChangePasswordPage /> }],
      },
      {
        path: '/',
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <HomePage /> },
              { path: 'soporte', ...withPermission(PERMISSIONS.TICKETS_READ, SupportListPage) },
              {
                path: 'soporte/nuevo',
                ...withPermission(PERMISSIONS.TICKETS_CREATE, NewTicketPage),
              },
              { path: 'soporte/:id', ...withPermission(PERMISSIONS.TICKETS_READ, TicketPage) },
              { path: 'bandeja', ...withPermission(PERMISSIONS.STAFF_TICKETS, InboxPage) },
              {
                path: 'bandeja/:tenantKey/:id',
                ...withPermission(PERMISSIONS.STAFF_TICKETS, StaffTicketPage),
              },
              { path: 'eventos', ...withPermission(PERMISSIONS.EVENTS_READ, EventsPage) },
              { path: 'eventos/:id', ...withPermission(PERMISSIONS.EVENTS_READ, EventPage) },
              { path: 'syncs', ...withPermission(PERMISSIONS.SYNCS_READ, SyncsPage) },
              { path: 'syncs/:id', ...withPermission(PERMISSIONS.SYNCS_READ, SyncPage) },
              { path: 'usuarios', ...withPermission(PERMISSIONS.STAFF_USERS, UsersPage) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
