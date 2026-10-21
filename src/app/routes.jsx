import { AppLayout } from '@/components/layout/app-layout'
import { NotFoundPage, RouteErrorPage } from '@/components/page-states'
import { StaffPreview } from '@/components/under-construction'
import { AccountPasswordPage } from '@/features/auth/account-password-page'
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
const DashboardPage = lazyPage(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage')
const MetricsPage = lazyPage(() => import('@/features/metrics/metrics-page'), 'MetricsPage')
const EventsPage = lazyPage(() => import('@/features/events/events-page'), 'EventsPage')
const EventPage = lazyPage(() => import('@/features/events/event-page'), 'EventPage')
const SyncsPage = lazyPage(() => import('@/features/syncs/syncs-page'), 'SyncsPage')
const SyncPage = lazyPage(() => import('@/features/syncs/sync-page'), 'SyncPage')
const TasksPage = lazyPage(() => import('@/features/tasks/tasks-page'), 'TasksPage')
const TaskPage = lazyPage(() => import('@/features/tasks/task-page'), 'TaskPage')
const MappingsPage = lazyPage(() => import('@/features/mappings/mappings-page'), 'MappingsPage')
const UsersPage = lazyPage(() => import('@/features/users/users-page'), 'UsersPage')

// Tareas programadas: solo Smarteam por ahora (21-10-2026); el cliente ve "En construcción"
// (plan 4t). Para liberarla, volver a usar TasksPage y TaskPage directo en las rutas.
const TASKS_PREVIEW = {
  title: 'Tareas programadas',
  description:
    'Estamos preparando esta sección. Pronto vas a poder ver aquí las tareas programadas de tu empresa.',
}
const tasksPreview = (page) => <StaffPreview {...TASKS_PREVIEW}>{page}</StaffPreview>

const permissionRoute = (permission, element) => ({
  element: <RequirePermission permission={permission} />,
  children: [{ index: true, element }],
})
const withPermission = (permission, Page) => permissionRoute(permission, <Page />)

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
              { path: 'inicio', ...withPermission(PERMISSIONS.EVENTS_READ, DashboardPage) },
              { path: 'soporte', ...withPermission(PERMISSIONS.TICKETS_READ, SupportListPage) },
              {
                path: 'soporte/nuevo',
                ...withPermission(PERMISSIONS.TICKETS_CREATE, NewTicketPage),
              },
              { path: 'soporte/:id', ...withPermission(PERMISSIONS.TICKETS_READ, TicketPage) },
              {
                path: 'metricas',
                // Solo Smarteam por ahora (14-10-2026); para el cliente se agrega TICKETS_READ.
                ...withPermission(PERMISSIONS.STAFF_TICKETS, MetricsPage),
              },
              { path: 'bandeja', ...withPermission(PERMISSIONS.STAFF_TICKETS, InboxPage) },
              {
                path: 'bandeja/:tenantKey/:id',
                ...withPermission(PERMISSIONS.STAFF_TICKETS, StaffTicketPage),
              },
              { path: 'eventos', ...withPermission(PERMISSIONS.EVENTS_READ, EventsPage) },
              { path: 'eventos/:id', ...withPermission(PERMISSIONS.EVENTS_READ, EventPage) },
              { path: 'syncs', ...withPermission(PERMISSIONS.SYNCS_READ, SyncsPage) },
              { path: 'syncs/:id', ...withPermission(PERMISSIONS.SYNCS_READ, SyncPage) },
              {
                path: 'tareas',
                ...permissionRoute(PERMISSIONS.TASKS_READ, tasksPreview(<TasksPage />)),
              },
              {
                path: 'tareas/:id',
                ...permissionRoute(PERMISSIONS.TASKS_READ, tasksPreview(<TaskPage />)),
              },
              { path: 'mapeos', ...withPermission(PERMISSIONS.MAPPINGS_READ, MappingsPage) },
              { path: 'usuarios', ...withPermission(PERMISSIONS.STAFF_USERS, UsersPage) },
              // Cambio voluntario de contraseña, solo Smarteam (plan 4s).
              {
                path: 'cuenta/contrasena',
                ...withPermission(PERMISSIONS.STAFF_USERS, AccountPasswordPage),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
