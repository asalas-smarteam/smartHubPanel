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
import { UsersPage } from '@/features/users/users-page'

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
              {
                path: 'usuarios',
                element: <RequirePermission permission={PERMISSIONS.STAFF_USERS} />,
                children: [{ index: true, element: <UsersPage /> }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
