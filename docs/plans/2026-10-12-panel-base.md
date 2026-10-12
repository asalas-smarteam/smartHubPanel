# Plan 4a: base del panel, sistema visual, acceso y usuarios (frontend)

- **Estado:** borrador, pendiente de aprobación. No se toca código hasta que se apruebe.
- **Spec:** `docs/specs/2026-10-12-panel-soporte-design.md`, con los cambios del 2026-10-12: **JavaScript** (no TypeScript) y **glassmorphism con los colores de Smarteam**.
- **Repo:** `smartHubPanel`, rama `main`, sin ramas ni worktrees. El commit y el push los hace el usuario.
- **Depende de:** nada para empezar. La API se simula con MSW siguiendo el contrato del spec. Cuando el backend termine el plan 1 (Acceso), se trabaja contra la API real con `npm run dev`; MSW queda para `npm run dev:mock` y los tests.

## Qué queda funcionando al terminar

1. Proyecto Vite + React en **JavaScript** con el stack del spec y versiones exactas.
2. **Sistema visual** de Smarteam: paleta como variables del tema, fuente de la marca, fondo con degradados, clases de vidrio reutilizables y componentes de shadcn/ui adaptados. Las pantallas lo usan; no definen colores propios.
3. `npm run dev:mock`: el panel contra la API simulada (MSW en el navegador).
4. `npm run dev`: el mismo panel contra el backend real por el proxy de Vite (`/api` → `http://localhost:3000/panel/api`).
5. Login, cambio de contraseña obligatorio en el primer ingreso, cierre de sesión y expiración de sesión.
6. Layout con menú armado según `permissions` de `GET /api/auth/me`.
7. Pantalla **Usuarios** (permiso `staff.users`): lista paginada por el servidor, filtro por empresa, crear (contraseña temporal mostrada una sola vez), cambiar rol, desactivar/reactivar y restablecer contraseña.
8. Tests con Vitest + Testing Library + MSW: login, cambio de contraseña, paginación, visibilidad por permiso, acciones de usuarios, contraste de los colores y una regla que bloquea nombres prohibidos.
9. `npm run build` deja un `dist/` sin MSW, sin worker de mocks y sin nombres prohibidos.

## Fuera de alcance (planes siguientes)

- Soporte, bandeja, eventos y syncs (plan 4b y siguientes). El visor JSON se **elige e instala** aquí; su componente se crea cuando se use.
- `Dockerfile`, nginx y `docker-compose.yml` (plan aparte).
- Modo oscuro.
- Cambio de contraseña voluntario (el spec solo pide el obligatorio).
- Login con HubSpot (Fase 1b del spec).
- Gráficos (Fase 2).

---

## 1. Versiones exactas

**Regla de selección:** la última versión estable publicada **al menos 7 días antes** de hoy (2026-10-12), para no tomar algo publicado el mismo día. Consultado contra npm el 2026-10-12. Se instalan **sin `^`** (archivo `.npmrc` con `save-exact=true`).

### Dependencias

| Paquete | Versión | Nota |
|---|---|---|
| `react`, `react-dom` | 19.3.0 | |
| `react-router` | 8.4.0 | Modo datos (`createBrowserRouter`). Pide Node ≥ 22.22. |
| `@tanstack/react-query` | 5.104.1 | |
| `@tanstack/react-table` | 9.2.6 | Major v9: API `useTable` + `tableFeatures`. Ver §5.6. |
| `react-hook-form` | 7.89.0 | |
| `@hookform/resolvers` | 5.9.1 | Compatible con Zod 4. |
| `zod` | 4.6.5 | Valida formularios **y las respuestas de la API** (reemplaza lo que daba TypeScript, §5.2). |
| `date-fns` | 4.4.0 | Locale `es`. |
| `react-json-view-lite` | 2.5.0 | **Visor JSON elegido.** Sin dependencias, plegable, compatible con React 19. Se usa en el plan 4b. |
| `@fontsource-variable/plus-jakarta-sans` | 5.3.0 | Fuente de la marca, servida desde el propio build (sin pedirla a Google). |
| `lucide-react` | 1.52.0 | Lo instala shadcn; se fija esta versión. |
| `radix-ui` | 1.6.7 | Lo instala shadcn. |
| `class-variance-authority` | 0.7.1 | Lo instala shadcn. |
| `clsx` | 2.1.1 | Lo instala shadcn. |
| `tailwind-merge` | 3.7.0 | Lo instala shadcn. |
| `sonner` | 2.0.8 | Avisos (toasts), vía shadcn. |

### Dependencias de desarrollo

| Paquete | Versión | Nota |
|---|---|---|
| `vite` | 8.3.2 | |
| `@vitejs/plugin-react` | 6.1.1 | Pide `vite ^8`. |
| `@types/react`, `@types/react-dom` | 19.3.0 | Las trae la plantilla JavaScript de Vite: solo dan autocompletado en el editor, no hay compilación de tipos. |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | |
| `tw-animate-css` | 1.4.0 | Lo instala shadcn. |
| `shadcn` (CLI, vía `npx`) | 4.21.1 | No queda en `package.json`. |
| `msw` | 3.0.2 | Major nueva (2026-09-28). Se usa su API estable (`http`, `HttpResponse`, `setupWorker`, `setupServer`) y su plugin de Vite solo para servir el worker. Respaldo: `msw@2.15.0` con `npx msw init public` (ver Riesgos). |
| `vitest`, `@vitest/coverage-v8` | 5.0.3 | |
| `jsdom` | 30.1.2 | |
| `@testing-library/react` | 16.3.3 | |
| `@testing-library/dom` | 10.4.2 | |
| `@testing-library/user-event` | 14.6.7 | |
| `@testing-library/jest-dom` | 7.0.1 | Se importa `@testing-library/jest-dom/vitest`. |
| `@tanstack/react-query-devtools` | 5.104.1 | Solo en desarrollo, cargado de forma diferida. |
| `eslint` | 10.12.0 | El spec pide ESLint + Prettier; la plantilla de Vite trae `oxlint` y se reemplaza. |
| `@eslint/js` | 10.0.1 | |
| `eslint-plugin-react-hooks` | 7.1.1 | |
| `eslint-plugin-react-refresh` | 0.5.7 | |
| `globals` | 17.13.0 | |
| `prettier` | 3.9.9 | |

Sin `typescript`, `typescript-eslint` ni `tsconfig`. `package.json` declara `"engines": { "node": ">=22.22.0" }` y se agrega `.nvmrc` con `24` (LTS). Si alguna versión no resuelve al instalar, se detiene el trabajo y se informa antes de cambiarla.

## 2. Cómo se ejecuta el trabajo

- Los archivos se escriben **directamente en la carpeta del repo** en tu PC.
- `npm install`, los tests y el build los corro en una **copia de trabajo dentro de la VM Linux** (fuera de tu carpeta), para no dejar en tu `node_modules` binarios de Linux (Vite 8, Tailwind y Vitest traen binarios nativos por plataforma). El `package-lock.json` que sale de ahí es multiplataforma y se copia al repo.
- La verificación final la corres tú en Windows: `npm ci`, `npm test`, `npm run build`, `npm run dev:mock` (§8).
- **Prerrequisito en tu PC:** Node ≥ 22.22 (recomendado 24 LTS). Paso 0: `node -v`.
- Al terminar cada paso, escribo en el chat qué cambió, en qué archivos y por qué. No hago `git add`, `commit` ni `push`.
- `README.md` y `.gitignore` existentes **se conservan**: solo se les agrega contenido (paso 1).

## 3. Contrato de API que usa este plan

El front llama siempre a `/api/*`. En desarrollo, Vite reenvía `/api/*` a `http://localhost:3000/panel/api/*`; en producción lo hará el nginx del contenedor (plan aparte). La sesión es la cookie `HttpOnly` `panel_session` (`Path=/api`): **el front nunca la lee ni guarda tokens**. Toda mutación (`POST`, `PUT`, `PATCH`, `DELETE`) lleva `X-Panel-Request: 1`. Nunca se usa `INTERNAL_KEY` ni `x-internal-key`.

### 3.1 Lo que el spec ya define

| Endpoint | Uso en el front |
|---|---|
| `POST /api/auth/login` `{ email, password }` | Login. |
| `POST /api/auth/logout` | Cerrar sesión. |
| `GET /api/auth/me` → `{ name, email, accountType, role, tenantKey, companyName, permissions, mustChangePassword }` | Estado de sesión, menú y botones. |
| `POST /api/auth/change-password` | Cambio obligatorio. |
| `GET /api/staff/users?tenantKey=&page=&pageSize=` → `{ items, page, pageSize, total }` | Lista de usuarios. |
| `POST /api/staff/users` `{ email, name, accountType, tenantKey?, role? }` → `{ user, temporaryPassword }` | Crear. |
| `POST /api/staff/users/:id/reset-password` → `{ temporaryPassword }` | Restablecer. |
| `PATCH /api/staff/users/:id` `{ name?, role?, active? }` | Cambiar rol, desactivar, reactivar. |
| `403 { error: 'password_change_required' }` | Con cambio pendiente, todo menos `change-password` y `logout`. |

Reglas del spec que el front y los mocks respetan: `page` empieza en 1 y `pageSize` máximo 100; contraseña mínima de 10 caracteres y distinta de la temporal; 5 logins fallidos por email cada 15 min; el mismo error para "no existe" y "contraseña incorrecta".

### 3.2 Lo que el spec no define y este plan **asume** (a confirmar en el plan 1 del backend)

Los mocks implementan exactamente esto. Si el plan 1 decide distinto, se ajustan los mocks y, en su caso, el front.

| # | Tema | Supuesto | Por qué |
|---|---|---|---|
| C1 | `GET /auth/me` con cambio pendiente | Responde **200** con `mustChangePassword: true` (no 403). | El front necesita saber quién es el usuario y por qué no puede pasar. **El front funciona igual si responde 403 `password_change_required`**: lo trata como "cambio pendiente". |
| C2 | Cuerpo de `change-password` | `{ currentPassword, newPassword }`. Actual incorrecta → **400** `invalid_current_password` (no 401). | Pedir la actual es lo estándar. Con 401 el front lo confundiría con una sesión vencida y sacaría al usuario. |
| C3 | Sesión después de cambiar la contraseña | La respuesta **emite una cookie nueva** con el `tokenVersion` nuevo y `pwdChange: false`. | Si no, al subir `tokenVersion` la sesión actual queda inválida y el usuario es expulsado justo después de cambiarla. **El front lo tolera**: si el siguiente `me` da 401, manda a login con el aviso "Contraseña cambiada. Vuelve a entrar". |
| C4 | Respuesta de `login` | 200 con el mismo cuerpo que `me`. | El front **no depende** del cuerpo: después del login vuelve a pedir `me`. |
| C5 | Forma de los errores | `{ error: '<código>', message?: string }`. Códigos: `invalid_credentials` (401), `unauthorized` (401), `too_many_attempts` (429), `password_change_required` (403), `invalid_current_password` (400), `forbidden` (403), `missing_panel_header` (403), `validation_error` (400), `email_taken` (409), `not_found` (404). | El front muestra textos propios por código y, si no lo reconoce, uno genérico por status. También lee `message` del formato actual del backend (`{ ok: false, message }`) y del formato por defecto de Fastify (`{ statusCode, error, message }`). |
| C6 | Ítem de la lista de usuarios (y `user` al crear) | `{ id, email, name, accountType, tenantKey, companyName, role, active, mustChangePassword, lastLoginAt, createdAt }`. `tenantKey`, `companyName` y `role` son `null` para Smarteam. | Lo que necesita la tabla. |
| C7 | **Endpoint nuevo** `GET /api/staff/tenants` (permiso `staff.users`) → `{ items: [{ tenantKey, companyName, status }] }`, sin paginar. | Elegir la empresa al crear un usuario y filtrar la lista. No es una tabla, es la fuente de un selector; también lo usará el filtro de la bandeja (plan 4b). Alternativa si no se quiere: escribir el `tenantKey` a mano. |
| C8 | Orden de la lista de usuarios | `createdAt` descendente. | El spec no lo dice. |
| C9 | Desactivarse a sí mismo | El front oculta las acciones sobre la fila propia (compara `email` con `me.email`). El backend debería rechazarlo igual. | Evita que Smarteam se quede sin acceso por error. |

Estos puntos se los paso al chat del plan 1 cuando apruebes este plan; no los escribo en el repo `SAP`.

## 4. Estructura de carpetas

```
smartHubPanel/
├─ .nvmrc  .npmrc  .prettierrc.json  .prettierignore  .env.example
├─ eslint.config.js  components.json  jsconfig.json  index.html  vite.config.js
├─ scripts/check-build.mjs          # revisa dist/ después del build
└─ src/
   ├─ main.jsx                      # arranque; activa MSW solo en modo "mock"
   ├─ index.css                     # Tailwind v4, tema de Smarteam, utilidades de vidrio
   ├─ theme.test.js                 # contraste de los pares de colores del tema
   ├─ app/
   │  ├─ routes.jsx                 # tabla de rutas (la usan la app y los tests)
   │  ├─ router.jsx                 # createBrowserRouter(routes)
   │  ├─ providers.jsx              # QueryClientProvider, Toaster, devtools (dev)
   │  └─ query-client.js            # createQueryClient(): reintentos y manejo global de 401/403
   ├─ components/
   │  ├─ ui/                        # generados por shadcn (JS); ajustes de vidrio mínimos (§5.9)
   │  ├─ brand/app-background.jsx   # fondo con degradados de la marca
   │  ├─ brand/logo.jsx             # nombre "Smarteam" en texto con la fuente de la marca
   │  ├─ layout/app-layout.jsx      # encabezado + menú lateral + <Outlet/>
   │  ├─ layout/nav.js              # ítems del menú con su permiso
   │  ├─ data-table/data-table.jsx  # tabla genérica con paginación del servidor
   │  ├─ data-table/data-table-pagination.jsx
   │  └─ page-states.jsx            # cargando, error, vacío, sin acceso, no encontrada
   ├─ features/
   │  ├─ auth/
   │  │  ├─ api.js                  # login, logout, me, changePassword + esquemas de respuesta
   │  │  ├─ session.js              # useSession(): anonymous | password_change_required | authenticated
   │  │  ├─ permissions.js          # PERMISSIONS, can(), usePermissions(), <Can>
   │  │  ├─ guards.jsx              # RequireAuth, RequirePermission, RedirectIfAuthenticated
   │  │  ├─ schemas.js              # Zod: login y cambio de contraseña
   │  │  ├─ login-page.jsx
   │  │  └─ change-password-page.jsx
   │  ├─ tenants/api.js             # useTenants() para selectores
   │  ├─ users/
   │  │  ├─ api.js  schemas.js
   │  │  ├─ users-page.jsx          # filtros + DataTable + acciones
   │  │  ├─ users-columns.jsx
   │  │  ├─ user-row-actions.jsx    # menú por fila
   │  │  ├─ create-user-dialog.jsx
   │  │  ├─ change-role-dialog.jsx
   │  │  └─ temporary-password-dialog.jsx
   │  └─ home/home-page.jsx
   ├─ lib/
   │  ├─ api/client.js              # apiFetch()
   │  ├─ api/errors.js              # ApiError y textos por código
   │  ├─ pagination.js              # paginatedSchema(), usePaginationParams()
   │  ├─ dates.js                   # formatos con date-fns/locale es
   │  └─ utils.js                   # cn() de shadcn
   ├─ mocks/
   │  ├─ browser.js  server.js
   │  ├─ db.js                      # estado simulado (usuarios, empresas, sesiones, intentos)
   │  ├─ seed.js                    # datos de ejemplo
   │  ├─ permissions.js             # matriz de permisos del spec (Fase 1)
   │  └─ handlers/{index,auth,staff-users,staff-tenants}.js
   └─ test/
      ├─ setup.js                   # jest-dom, servidor MSW, limpieza
      └─ render.jsx                 # renderApp({ route, session }) con router en memoria
```

Los tests van junto al archivo que prueban (`*.test.js[x]`). Las rutas y los textos de la UI van en español y son genéricos. El logo de la web no se copia: el panel muestra "Smarteam" como texto hasta que se entregue el logo en SVG.

## 5. Decisiones técnicas

### 5.1 Cliente HTTP (`src/lib/api/client.js`)

- `apiFetch(path, { method, json, formData, query, signal, schema })`, documentado con JSDoc.
- URL: `new URL('/api' + path, window.location.origin)`, con `query` como search params (se omiten vacíos). La URL absoluta hace que funcione igual en el navegador y en jsdom.
- `credentials: 'same-origin'` explícito (mismo origen; la cookie la manda el navegador).
- Headers: `Accept: application/json`; `Content-Type: application/json` solo con `json`; con `FormData` no se pone (lo usará el plan 4b); `X-Panel-Request: 1` en todo método que no sea `GET`/`HEAD`.
- Respuesta 204 o sin cuerpo → `undefined`. Error → lanza `ApiError { status, code, message }`, con `code` sacado de `error` o `code` del cuerpo y `message` de `message` (§3.2 C5).
- Si se pasa `schema` (Zod), la respuesta se valida con `schema.parse`. Si no coincide, lanza `ApiError` con código `invalid_response` y, en desarrollo, deja el detalle en la consola. Así un cambio de contrato del backend se detecta en el punto de entrada y no como un `undefined` en una pantalla.
- `apiFetch` **no navega ni toca la caché**: solo lanza errores. Las reacciones globales viven en el `QueryClient` (5.3).

### 5.2 JavaScript sin TypeScript

- Cada `features/*/api.js` declara con Zod la forma de lo que recibe (`meSchema`, `userSchema`, `paginatedSchema(userSchema)`, `tenantSchema`) y se lo pasa a `apiFetch`. Esos esquemas son la referencia del contrato dentro del front.
- JSDoc en lo compartido: `apiFetch`, `ApiError`, `usePaginationParams`, `can`/`usePermissions`, `DataTable`. No se activa `checkJs`.
- `jsconfig.json` declara el alias `@/*` → `./src/*` para el editor y para shadcn; Vite lo repite en `resolve.alias`.
- Los permisos se escriben como constantes (`PERMISSIONS.STAFF_USERS = 'staff.users'`) para que un error de tipeo falle al importar y no en silencio.

### 5.3 Sesión (`src/features/auth/session.js`)

- Una sola query, clave `['auth', 'me']`, con `staleTime` de 5 min y `retry: false`.
- Su `queryFn` traduce la respuesta a un estado:
  - 401 → `{ status: 'anonymous' }`
  - 200 con `mustChangePassword: true`, o 403 `password_change_required` → `{ status: 'password_change_required', user? }`
  - 200 → `{ status: 'authenticated', user }`
- Así el estado de sesión nunca es un "error" de la query: los guards solo leen ese estado.

### 5.4 Reacciones globales (`src/app/query-client.js`)

En `QueryCache.onError` y `MutationCache.onError`:

| Error | Reacción |
|---|---|
| 401 (en cualquier query o mutación que no sea el login) | `setQueryData(['auth','me'], { status: 'anonymous' })` y aviso "Tu sesión expiró. Vuelve a entrar". El guard redirige solo a `/login`, guardando la ruta de origen. |
| 403 `password_change_required` | Invalida `['auth','me']`; el guard redirige a `/cambiar-contrasena`. |
| 403 otro | Aviso "No tienes permiso para esta acción". |
| 5xx, red o `invalid_response` | Aviso genérico; la pantalla muestra su estado de error con "Reintentar". |

Reintentos: las queries reintentan hasta 2 veces solo errores de red o 5xx, nunca 4xx; las mutaciones no reintentan.

### 5.5 Rutas, guards y permisos

| Ruta | Guard | Pantalla |
|---|---|---|
| `/login` | `RedirectIfAuthenticated` | Login |
| `/cambiar-contrasena` | sesión con cambio pendiente; sin sesión → `/login`; sin cambio pendiente → `/` | Cambio obligatorio |
| `/` (layout) | `RequireAuth` | `AppLayout` |
| `/` (índice) | | Redirige al primer ítem del menú permitido; si no hay ninguno, inicio con "Hola, {nombre}" |
| `/usuarios` | `RequirePermission(PERMISSIONS.STAFF_USERS)` | Usuarios |
| `*` | | No encontrada |

- `RequireAuth`: mientras carga `me` muestra "Cargando…"; `anonymous` → `<Navigate to="/login" state={{ from }} />`; `password_change_required` → `/cambiar-contrasena`.
- `RequirePermission`: sin el permiso muestra "No tienes acceso a esta sección". **Es solo UI**: la regla real la aplica la API.
- Después del login: va a `from` si existe; si no, a `/`.
- Permisos de la Fase 1 del spec: `tickets.read`, `tickets.create`, `tickets.reply`, `tickets.reopen`, `events.read`, `syncs.read`, `staff.tickets`, `staff.users`, `staff.events.raw`. Un permiso desconocido que llegue de la API se ignora sin romper.
- `usePermissions()` → `{ can(permission) }`, y `<Can permission={…}>` para envolver botones.
- **Ninguna decisión de UI mira `accountType` ni `role`**: menú, rutas y botones se deciden solo con `permissions`. `accountType` y `role` solo se muestran como texto.
- El menú (`nav.js`) es una lista `{ to, label, icon, permission }`. En este plan: `Usuarios` (`staff.users`). Los planes siguientes agregan ítems a la misma lista.

### 5.6 Tablas con paginación del servidor

- `paginatedSchema(itemSchema)` valida `{ items, page, pageSize, total }`.
- `usePaginationParams()` lee y escribe `page` y `pageSize` en la URL (`?page=2&pageSize=25`), validados (`page` entero ≥ 1; `pageSize` ∈ {10, 25, 50, 100}; por defecto 25). Recargar o compartir el link mantiene la página. Cambiar un filtro o el tamaño vuelve a la página 1.
- La query incluye página, tamaño y filtros en su clave (`['staff','users', { page, pageSize, tenantKey }]`) y usa `placeholderData: keepPreviousData` para que la tabla no parpadee al cambiar de página.
- `DataTable` usa TanStack Table v9: `useTable` con `tableFeatures({ rowPaginationFeature })`, `manualPagination: true`, `rowCount: total` y la paginación controlada (`state.pagination` + `onPaginationChange`), convirtiendo entre `pageIndex` (base 0) y `page` (base 1). Se sigue la guía que trae el paquete (`skills/getting-started/references/with-tanstack-query.md`).
- Controles: "N resultados", "Página X de Y", primera/anterior/siguiente/última (deshabilitadas en los bordes) y selector de tamaño. Estados: cargando (filas `skeleton`), error con "Reintentar" y vacío.

### 5.7 Formularios

- React Hook Form + `zodResolver`, con los componentes de formulario de shadcn (`field`; si la versión del registro aún ofrece solo `form`, se usa ese).
- Validación en el cliente antes de llamar a la API; los errores de la API se muestran en el campo cuando aplica (`email_taken` → correo, `invalid_current_password` → contraseña actual) y si no, arriba del formulario.
- Botón de enviar deshabilitado y con "Guardando…" mientras la mutación está en curso.
- Campos de contraseña con `autocomplete` correcto (`current-password`, `new-password`).

### 5.8 Pantallas

**Login:** correo y contraseña. Errores: `invalid_credentials` → "Correo o contraseña incorrectos"; `too_many_attempts` → "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo".

**Cambio de contraseña obligatorio:** contraseña actual (la temporal), nueva y confirmación. Zod: nueva de 10 caracteres o más, confirmación igual, nueva distinta de la actual. Botón "Cerrar sesión" disponible. Al terminar vuelve a pedir `me` y entra a `/`; si `me` da 401 (§3.2 C3), va a `/login` con el aviso "Contraseña cambiada. Vuelve a entrar".

**Layout:** menú lateral con los ítems permitidos; encabezado con nombre, empresa (`companyName`, o "Smarteam" si no tiene) y "Cerrar sesión". Cerrar sesión: `POST /auth/logout`, `queryClient.clear()`, sesión `anonymous`, a `/login`. En pantallas angostas el menú se abre como panel lateral (`sheet`).

**Usuarios** (`staff.users`):
- Filtro "Empresa" (selector de `GET /staff/tenants` con opción "Todas").
- Columnas: Nombre, Correo, Tipo (Smarteam / Cliente), Empresa, Rol (Admin / Usuario / —), Estado (Activo / Inactivo, y "Debe cambiar contraseña"), Último ingreso (fecha en español o "Nunca"), Acciones.
- **Nuevo usuario** (diálogo): correo, nombre, tipo de cuenta; si es "Cliente", además empresa y rol, obligatorios (esquema Zod con unión discriminada por `accountType`). Al crear se abre el diálogo de contraseña temporal.
- **Diálogo de contraseña temporal:** muestra la contraseña, botón "Copiar" y el aviso "Esta contraseña se muestra una sola vez. Pásala al usuario por el canal habitual". Al cerrarlo se descarta: no queda en estado, ni en la caché de queries (`mutation.reset()`), ni en la URL, ni en almacenamiento.
- Acciones por fila (menú): "Cambiar rol" (solo usuarios de cliente), "Restablecer contraseña" (confirmación → diálogo de temporal), "Desactivar" (confirmación: "Su sesión dejará de funcionar de inmediato") o "Reactivar" si está inactivo. Sin acciones en la fila propia (§3.2 C9).
- Después de cada mutación se invalida `['staff','users']` y se muestra un aviso de éxito.

### 5.9 Sistema visual: glassmorphism con los colores de Smarteam

**Fuente de los valores:** variables CSS que publica hoy https://smarteamcr.com/, leídas el 2026-10-12 desde el navegador. Son los colores que el sitio ya usa, no una interpretación.

**Paleta de la marca** (se declara tal cual en `index.css`, dentro de `@theme`, con prefijo `brand-`):

| Token | Valor | Uso en el sitio | Uso en el panel |
|---|---|---|---|
| `navy` | `#051849` | Texto principal y fondos oscuros | Texto, menú lateral |
| `navy-deep` | `#03102f` | Fondos oscuros | Degradado de login y del menú |
| `royal` | `#0b58d3` | Azul de marca | Color primario (botones, enlaces, selección) |
| `royal-deep` | `#07429a` | | Hover del primario |
| `blue` | `#1e8ff6` | Azul claro | Anillo de foco, detalles. **No para texto sobre blanco** |
| `blue-pale` | `#cfe2fa` | | Fondos suaves, ítem activo del menú, `secondary` |
| `accent` | `#e8481c` | Naranja de los botones de acción | Degradados, indicadores ("nuevo"), íconos destacados |
| `accent-strong` | `#d63e14` | | Botones naranjas con texto blanco |
| `mint` | `#42e4b3` | Acento verde | Estado "Activo" sobre fondo oscuro |
| `ink-soft` | `#41527a` | Texto secundario | Texto secundario (`muted-foreground`) |
| `paper-tint` | `#eef3fc` | Fondo claro | Fondo base del área de trabajo |
| `line-light` | `#eaeff8` | Líneas | Bordes y separadores |

Fuente: **Plus Jakarta Sans** (la del sitio), servida con `@fontsource-variable`.

**Mapeo a las variables de shadcn/ui** (tema claro; no hay modo oscuro en la Fase 1):

| Variable | Valor |
|---|---|
| `--background` / `--foreground` | `paper-tint` / `navy` |
| `--card`, `--popover` | blanco al 70 % y 85 % (translúcidos, para el vidrio) / `navy` |
| `--primary` / `--primary-foreground` | `royal` / blanco |
| `--secondary` / `--secondary-foreground` | `blue-pale` / `navy` |
| `--muted` / `--muted-foreground` | `line-light` / `ink-soft` |
| `--accent` / `--accent-foreground` | `blue-pale` / `navy` (en shadcn, `accent` es el fondo de hover) |
| `--destructive` | rojo de shadcn por defecto. **No se usa el naranja de la marca para "peligro"**, para no confundir acciones normales con destructivas |
| `--border`, `--input` | `line-light` |
| `--ring` | `blue` |
| `--radius` | `0.875rem` |
| `--sidebar*` | fondo `navy` translúcido, texto blanco, activo `blue-pale` |

**Contraste verificado** (WCAG, calculado al escribir este plan; se repite como test, §7.8):

| Par | Contraste | Resultado |
|---|---|---|
| Blanco sobre `royal` (botón primario) | 6.27 | AA |
| Blanco sobre `accent-strong` (botón naranja) | 4.61 | AA |
| Blanco sobre `accent` `#e8481c` | 3.91 | **Solo texto grande o íconos**: por eso los botones naranjas usan `accent-strong` |
| Blanco sobre `blue` `#1e8ff6` | 3.33 | No se usa para texto |
| `navy` sobre `paper-tint` | 15.29 | AA |
| `ink-soft` sobre blanco / `paper-tint` | 7.74 / 6.95 | AA |
| `royal` sobre `paper-tint` (enlaces) | 5.63 | AA |
| `ink-soft` sobre vidrio claro, en el peor caso (blanco 60 % sobre una mancha `royal` al 25 %) | 6.44 | AA |
| Blanco sobre el menú (`navy` 85 % sobre `royal`) | 15.02 | AA |

**Utilidades de vidrio** (Tailwind v4, `@utility` en `index.css`):

- `glass`: fondo blanco al 60 %, `backdrop-blur` de 16 px con saturación 140 %, borde blanco al 50 %, sombra `0 16px 40px -32px rgba(5,24,73,.22)` (la `--shadow-card` del sitio).
- `glass-strong`: igual con blanco al 85 %, para diálogos, menús desplegables y selectores (texto denso encima).
- `glass-dark`: `navy` al 85 % con desenfoque, borde blanco al 10 %, para el menú lateral.
- **Respaldo:** con `@supports not (backdrop-filter: blur(1px))` y con `@media (prefers-reduced-transparency: reduce)` las tres pasan a fondo sólido (blanco o `navy`).

**Fondo** (`components/brand/app-background.jsx`): capa fija detrás de todo, con `paper-tint` y dos o tres manchas difusas (`radial-gradient`) en `royal`, `blue` y `accent` a baja opacidad, como los degradados del sitio. Es estático: sin animaciones.

**Dónde va cada superficie:**

| Elemento | Superficie |
|---|---|
| Menú lateral | `glass-dark` |
| Encabezado | `glass` |
| Tarjetas, filtros, contenedor de tablas | `glass` |
| Filas de tablas | casi opacas (blanco al 90 %), sin desenfoque propio: se leen bien y el navegador no recalcula el desenfoque en cada fila |
| Diálogos, menús desplegables, selectores, avisos | `glass-strong`; el fondo del diálogo, `navy` al 40 % con desenfoque leve |
| Login y cambio de contraseña | Fondo de pantalla completa con el degradado del sitio (`linear-gradient(150deg, royal, navy)` y un brillo `accent`) y la tarjeta del formulario en `glass` |

**Componentes de shadcn:** se generan en JavaScript y se ajustan **lo mínimo**, solo para aplicar las utilidades de vidrio en `card`, `dialog`, `alert-dialog`, `dropdown-menu`, `select`, `sheet` y `sonner`. Cada archivo de `components/ui/` que se toque se lista en el resumen del paso. Botones, inputs y badges solo cambian por las variables del tema.

**Estados de usuario** (insignias): Activo con fondo verde suave y texto oscuro, Inactivo en gris, "Debe cambiar contraseña" en naranja suave con texto `accent-deep` (`#c2400f`, 5.21 sobre blanco).

### 5.10 MSW

- **Modo `mock` de Vite:** `npm run dev:mock` = `vite --mode mock`. `main.jsx` hace `if (import.meta.env.MODE === 'mock') { … import('./mocks/browser') … worker.start({ onUnhandledRequest: 'bypass' }) }` antes de montar React. En el build de producción (`MODE === 'production'`) esa rama se elimina y el chunk de mocks no se genera. No hace falta archivo `.env` para activarlo.
- **Worker:** el plugin `msw/vite` en modo `worker-only`, cargado **solo** con `command === 'serve' && mode === 'mock'`, sirve `/mockServiceWorker.js`. No se commitea el worker en `public/` y no llega a `dist/`.
- **Sesión simulada:** MSW no puede crear cookies `HttpOnly`, así que la sesión del mock vive en `mocks/db.js`, que imita al backend: usuarios con `tokenVersion`, sesiones `{ sessionId → userId, tv, pwdChange }` e intentos fallidos. En el navegador, `db` se guarda en `localStorage` (clave `panel-mock-db`, compartida entre pestañas) y el `sessionId` de cada pestaña en `sessionStorage`: así se pueden tener dos usuarios a la vez en dos pestañas y ver que desactivar a uno corta su sesión. Este almacenamiento existe **solo en el código de mocks**, nunca en la app. Para volver a los datos de ejemplo se borra la clave `panel-mock-db` (documentado en el README). En los tests, `db` vive en memoria y se reinicia después de cada test.
- **Los handlers aplican las reglas del spec**, para que un error del front se vea en desarrollo: 401 sin sesión; 403 `password_change_required` con cambio pendiente (salvo `change-password`, `logout` y `me`); 403 `forbidden` sin el permiso; 403 `missing_panel_header` si una mutación no trae `X-Panel-Request: 1`; bloqueo tras 5 intentos fallidos por email; contraseña de 10+ caracteres y distinta de la actual; actual incorrecta → 400 `invalid_current_password`; `pageSize` > 100 → 400; correo duplicado → 409; desactivar o restablecer invalida la sesión de ese usuario.
- **Matriz de permisos** en `mocks/permissions.js`, copiada de la tabla del spec (Fase 1): Smarteam = `events.read`, `syncs.read`, `staff.tickets`, `staff.users`, `staff.events.raw`; cliente `admin` y `usuario` = `tickets.*`, `events.read`, `syncs.read`.
- **Datos de ejemplo** (`seed.js`), todos ficticios: 3 empresas genéricas (ACME, GLOBEX, INITECH; una suspendida) y ~40 usuarios para que haya varias páginas. Cuentas para probar a mano, documentadas en el README:
  - `smarteam@panel.test` / `Smarteam-2026` (Smarteam)
  - `admin@acme.test` / `Temporal-123` (cliente admin, con cambio obligatorio)
  - `usuario@acme.test` / `Usuario-2026` (cliente usuario)
- Tiempos de respuesta: `delay()` corto en el navegador para ver los estados de carga; sin demora en tests.

### 5.11 Calidad

- ESLint (configuración plana) para JS/JSX: `@eslint/js` recomendado, `react-hooks` recomendado y `react-refresh` (`only-export-components`), con `globals.browser` (y `globals.node` en `vite.config.js`, `scripts/` y tests). Se ignoran `dist/`, `coverage/` y `src/components/ui/`.
- Prettier: `{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`, el estilo de la plantilla de Vite. `.prettierignore` con `dist`, `coverage` y `package-lock.json`.
- Fechas: `src/lib/dates.js` con `format(fecha, "d MMM yyyy, HH:mm", { locale: es })`; zona horaria la del navegador.

### 5.12 Scripts de `package.json`

| Script | Comando |
|---|---|
| `dev` | `vite` (contra el backend real por el proxy) |
| `dev:mock` | `vite --mode mock` |
| `build` | `vite build && node scripts/check-build.mjs` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:coverage` | `vitest run --coverage` (solo reporte, sin umbral obligatorio en este plan) |
| `lint` | `eslint .` |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` |

`scripts/check-build.mjs` recorre `dist/` y falla el build, indicando archivo y coincidencia, si encuentra rastros de MSW (`mockServiceWorker`, `setupWorker`), `x-internal-key`, `INTERNAL_KEY`, `hubspot` o `sap` como palabra suelta (sin distinguir mayúsculas).

## 6. Pasos

Cada paso termina con su verificación y con un mensaje en el chat (qué cambió, archivos y por qué). Donde hay lógica, primero el test (rojo) y luego el código (verde).

### Paso 0. Entorno
- Tú: `node -v` en tu PC (≥ 22.22; recomendado 24 LTS).
- Yo: confirmar que las versiones de §1 siguen resolviendo en npm.

### Paso 1. Scaffold base (JavaScript)
1. Generar la plantilla `create-vite@9.2.1 --template react` (JavaScript) en una carpeta temporal **fuera del repo** y copiar al repo: `index.html`, `vite.config.js`, `src/main.jsx`, `src/index.css`, `public/favicon.svg`. No se copian `README.md`, `_gitignore`, `_oxlintrc.json` ni el demo (`App.jsx`, `App.css`, `assets/`, `public/icons.svg`).
2. `package.json` propio (nombre `smarthubpanel`, `private`, `type: module`, `engines`, scripts de §5.12) e instalar las versiones de §1. `.npmrc` con `save-exact=true`; `.nvmrc` con `24`.
3. `jsconfig.json` con el alias `@/*`; `resolve.alias` en `vite.config.js`.
4. `index.html`: `lang="es"` y título "Panel de soporte · Smarteam".
5. `.gitignore` existente: **se agregan al final** solo las líneas de la plantilla que faltan (`dist-ssr`, `*.local`, `pnpm-debug.log*`, `.vscode/*`, `!.vscode/extensions.json`, `.idea`, `.DS_Store`, `*.suo`, `*.ntvs*`, `*.njsproj`, `*.sln`, `*.sw?`). Ya cubre `node_modules`, `dist`, `coverage` y `.env*` con `!.env.example`.
6. `README.md` existente: se conserva la primera línea y se agrega una sección "Desarrollo" (requisitos, `npm ci`, `dev` vs `dev:mock`, cuentas de prueba del mock y cómo reiniciarlo, tests, build).
7. `.env.example` con `PANEL_API_TARGET=http://localhost:3000` (opcional; destino del proxy).
- **Verificación:** `npm run build` pasa con una página mínima.

### Paso 2. Tailwind v4 y shadcn/ui en JavaScript
1. `@tailwindcss/vite` en `vite.config.js`; `src/index.css` con `@import "tailwindcss";`.
2. `npx shadcn@4.21.1 init`: Radix como base, `tsx: false` en `components.json`, alias `@/components`, `@/lib`. Genera `src/lib/utils.js` y las variables del tema en `index.css`.
3. `npx shadcn@4.21.1 add button input label card table dialog alert-dialog dropdown-menu select badge sonner field skeleton separator sheet`.
4. Fijar a versión exacta lo que shadcn agregue con `^` (tabla §1).
- **Verificación:** build pasa; `src/components/ui/` contiene los componentes en `.jsx`.

### Paso 3. Calidad: ESLint y Prettier
1. `eslint.config.js`, `.prettierrc.json`, `.prettierignore` (§5.11).
2. `prettier --write .` sobre lo generado.
- **Verificación:** `npm run lint` y `npm run format:check` sin errores.

### Paso 4. Vitest, Testing Library y reglas automáticas
1. Bloque `test` en `vite.config.js`: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.js']`, `css: false`, `restoreMocks: true`.
2. `src/test/setup.js`: `@testing-library/jest-dom/vitest`; servidor MSW (`listen({ onUnhandledRequest: 'error' })`, `resetHandlers()` y reinicio de `db` tras cada test, `close()` al final).
3. Test `src/forbidden-names.test.js`: recorre `src/`, `index.html` y `public/` y falla si aparece `sap` como palabra suelta, `hubspot`, `internal-key`/`internal_key` (sin distinguir mayúsculas). El test arma los patrones por partes para no encontrarse a sí mismo.
- **Verificación:** `npm test` pasa.

### Paso 5. Tema de Smarteam y vidrio
1. Test `src/theme.test.js` (§7.8) en rojo.
2. `index.css`: paleta `brand-*` en `@theme`, variables de shadcn (§5.9), fuente Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans` importado en `main.jsx`), utilidades `glass`, `glass-strong`, `glass-dark` con su respaldo.
3. `components/brand/app-background.jsx` y `components/brand/logo.jsx`.
4. Ajustes de vidrio en los componentes de `components/ui/` listados en §5.9.
5. Página temporal de muestra en modo desarrollo (`/_tema`, solo con `import.meta.env.DEV`) con botones, inputs, tarjeta, tabla, diálogo, menú, selector, insignias y avisos sobre el fondo, para revisar el tema de un vistazo. Se elimina en el paso 11.
- **Verificación:** `theme.test.js` en verde; revisión visual tuya de `/_tema` en `npm run dev:mock` (te aviso para que la mires antes de seguir); revisión con "reducir transparencia" activado en Windows (Configuración → Accesibilidad → Efectos visuales → Efectos de transparencia) para ver el respaldo sólido.

### Paso 6. Cliente HTTP y errores (TDD)
1. Tests de `client.js` (con MSW): `X-Panel-Request: 1` en POST/PATCH y ausente en GET; `credentials: 'same-origin'`; query sin parámetros vacíos; JSON y 204; `ApiError` con `status`, `code` y `message` para los tres formatos de error de §3.2 C5; respuesta que no cumple el `schema` → `invalid_response`.
2. Implementar `client.js` y `errors.js` (textos en español por código y por status).
- **Verificación:** tests verdes.

### Paso 7. Mocks de MSW
1. `db.js`, `seed.js`, `permissions.js` y handlers de `/api/auth/*`, `/api/staff/users*` y `/api/staff/tenants` con las reglas de §5.10.
2. `browser.js` (`setupWorker`) y `server.js` (`setupServer`) con los mismos handlers.
3. Plugin `msw/vite` en `worker-only` solo en `serve` + `mode === 'mock'`; arranque en `main.jsx`.
4. Proxy de Vite: `/api` → `PANEL_API_TARGET` (por defecto `http://localhost:3000`) con `rewrite` a `/panel/api`.
- **Verificación:** tests de los handlers en lo que tiene reglas (permiso, header, `password_change_required`, bloqueo tras 5 intentos, paginación y `pageSize` > 100). `npm run dev:mock` responde `GET /api/auth/me` con 401 sin sesión.

### Paso 8. Sesión, permisos, guards y layout (TDD)
1. Tests de `session.js` (los tres estados, incluido `me` con 403 `password_change_required`), de `permissions.js` (`can`, `<Can>`, permiso desconocido ignorado) y de los guards con `createMemoryRouter`.
2. Implementar `query-client.js`, `session.js`, `permissions.js`, `guards.jsx`, `routes.jsx`, `router.jsx`, `providers.jsx`, `app-layout.jsx`, `nav.js`, `page-states.jsx`, `home-page.jsx`.
3. `src/test/render.jsx`: `renderApp({ route, session })`, que inicia sesión en la `db` del mock con la cuenta indicada y monta la app con un `QueryClient` nuevo (`retry: false`).
- **Verificación:** tests verdes.

### Paso 9. Login y cambio de contraseña (TDD)
1. Tests (§7.1 y §7.2).
2. `schemas.js`, `login-page.jsx`, `change-password-page.jsx`, logout en el layout.
- **Verificación:** tests verdes; a mano en `dev:mock` con las tres cuentas de prueba.

### Paso 10. Tabla genérica, paginación y Usuarios (TDD)
1. Tests de `usePaginationParams` y de `DataTable` (§7.3), luego los de Usuarios (§7.4 y §7.5).
2. `lib/pagination.js`, `components/data-table/*`, `features/tenants/api.js` y todo `features/users/*`.
- **Verificación:** tests verdes; a mano en `dev:mock`: crear, ver la temporal una vez, entrar con ella en otra pestaña y cambiarla, cambiar rol, desactivar (la otra pestaña cae en el siguiente request), reactivar y restablecer.

### Paso 11. Cierre
- Quitar la página `/_tema`.
- Correr todo lo de §8 y entregar el resumen final: archivos, decisiones, componentes de `ui/` ajustados y los puntos C1 a C9 para el chat del plan 1.

## 7. Tests

Herramientas: Vitest + Testing Library + `user-event`, con la API simulada por el mismo MSW (`setupServer`). Las consultas se hacen por rol y etiqueta (`getByRole`, `getByLabelText`), como las usaría una persona. Cada test usa un `QueryClient` nuevo.

### 7.1 Login (`login-page.test.jsx`)
1. Sin datos o con correo inválido muestra los errores de validación y **no** llama a la API.
2. Credenciales incorrectas → "Correo o contraseña incorrectos"; sigue en `/login`.
3. Sexto intento fallido → "Demasiados intentos…" (429 del mock).
4. Cuenta Smarteam correcta → entra y queda en `/usuarios` (primer ítem permitido).
5. Cuenta con cambio pendiente → queda en `/cambiar-contrasena`.
6. Redirección de vuelta: entrar a `/usuarios` sin sesión manda a `/login` y, tras el login, vuelve a `/usuarios`.
7. Con sesión, ir a `/login` redirige a `/`.
8. El login manda `X-Panel-Request: 1` (si no, el mock responde 403 y el test falla).

### 7.2 Cambio de contraseña (`change-password-page.test.jsx`)
1. Con cambio pendiente, ir a `/usuarios` o a `/` redirige a `/cambiar-contrasena`.
2. Validaciones: menos de 10 caracteres, confirmación distinta, nueva igual a la actual; sin llamada a la API.
3. Contraseña actual incorrecta → error en ese campo y la sesión sigue abierta.
4. Éxito → entra a `/`; después ya puede navegar normalmente.
5. Éxito con `me` respondiendo 401 (caso C3) → `/login` con "Contraseña cambiada. Vuelve a entrar".
6. Si `me` responde 403 `password_change_required` en vez de 200 (caso C1), igual muestra la pantalla de cambio.
7. Sin cambio pendiente, ir a `/cambiar-contrasena` redirige a `/`.
8. "Cerrar sesión" desde esta pantalla lleva a `/login`.

### 7.3 Paginación (`pagination.test.js`, `data-table.test.jsx`, `users-page.test.jsx`)
1. `usePaginationParams`: valores por defecto; valores inválidos en la URL (`page=0`, `page=abc`, `pageSize=7`) caen a los de defecto.
2. Lista de usuarios: primera página con 25 filas, "N resultados" y "Página 1 de X" con el total del servidor.
3. "Siguiente" pide `page=2` (verificado en la request que recibe el mock), muestra otras filas y actualiza la URL.
4. Abrir directamente `/usuarios?page=2` muestra la página 2.
5. Cambiar el tamaño a 50 pide `pageSize=50` y vuelve a la página 1.
6. Filtrar por empresa pide `tenantKey=…`, vuelve a la página 1 y el total cambia.
7. "Anterior" y "Primera" deshabilitadas en la página 1; "Siguiente" y "Última" en la última.
8. Lista vacía → estado vacío; error 500 → estado de error y "Reintentar" vuelve a pedir; respuesta con forma inválida → estado de error.

### 7.4 Visibilidad por permiso (`permissions.test.jsx`, `nav.test.jsx`, `users-page.test.jsx`)
Se sobreescribe `GET /api/auth/me` con distintos conjuntos de `permissions` para probar que **todo depende del permiso y no del tipo de cuenta ni del rol**:
1. Con `staff.users`: aparece "Usuarios" en el menú, la pantalla carga y se ve "Nuevo usuario".
2. Sin `staff.users` (cliente `admin` y cliente `usuario`): no aparece en el menú e ir a `/usuarios` muestra "No tienes acceso a esta sección" sin pedir la lista.
3. Una cuenta `cliente` a la que el mock le da `staff.users` sí ve el menú (prueba de que no se usa `accountType`); una `smarteam` sin el permiso no lo ve.
4. `<Can>` muestra u oculta su contenido; un permiso desconocido no rompe.
5. En la fila del propio usuario no hay acciones; "Cambiar rol" solo aparece en usuarios de cliente; "Desactivar" o "Reactivar" según el estado.

### 7.5 Acciones de usuarios (`users-actions.test.jsx`)
1. Crear Smarteam: no pide empresa ni rol.
2. Crear cliente: empresa y rol obligatorios; al crear se ve la contraseña temporal; al cerrar el diálogo ya no está en el documento y volver a abrirlo no la muestra.
3. Correo duplicado → error en el campo correo.
4. Restablecer: pide confirmación y muestra la nueva temporal.
5. Desactivar: confirmación → la fila pasa a "Inactivo"; Reactivar la devuelve a "Activo".
6. Cambiar rol de `usuario` a `admin` → la fila muestra "Admin".
7. Las mutaciones mandan `X-Panel-Request: 1` (el mock lo exige).

### 7.6 Cliente HTTP y sesión
Los del paso 6 y del paso 8: header en mutaciones, formatos de error, validación de respuestas, los tres estados de sesión y la reacción global a 401 (sesión vencida en medio del uso → `/login` con el aviso) y a 403 `password_change_required`.

### 7.7 Regla de nombres
`forbidden-names.test.js` (paso 4) y `scripts/check-build.mjs` sobre `dist/`.

### 7.8 Contraste del tema (`theme.test.js`)
Lee `src/index.css`, toma los valores de la paleta y de las variables del tema, y verifica:
1. Cada par texto/fondo de la tabla de §5.9 cumple 4.5:1 (texto normal).
2. El texto sobre `glass` cumple 4.5:1 en el peor caso: blanco al 60 % compuesto sobre `paper-tint` con una mancha `royal` o `accent` al 25 %.
3. `--primary` con `--primary-foreground` y el botón naranja (`accent-strong` con blanco) cumplen 4.5:1.
4. Las tres utilidades de vidrio tienen su respaldo sólido (`@supports not (backdrop-filter…)` y `prefers-reduced-transparency`).

Si alguien cambia un color y rompe el contraste, falla el test.

## 8. Verificación final

En la VM (yo) y luego en tu PC (tú), desde la raíz del repo:

```
npm ci
npm run lint
npm run format:check
npm test
npm run test:coverage   # solo reporte
npm run build           # incluye check-build sobre dist/
npm run dev:mock        # prueba manual con las cuentas de prueba
```

Además:
- `git status` muestra solo archivos nuevos y los cambios en `README.md` y `.gitignore`, sin `node_modules`, `dist` ni `coverage`.
- Ningún archivo `.ts` ni `.tsx` en el repo.
- Búsqueda en `src/`, `index.html`, `public/` y `dist/` sin `sap` (palabra suelta), `hubspot`, `INTERNAL_KEY` ni `x-internal-key`.
- `dist/` sin `mockServiceWorker.js` y con la fuente Plus Jakarta Sans incluida (no se pide a servidores externos).
- Revisión visual en Chrome y Edge (y Firefox si lo usan): login, cambio de contraseña, Usuarios con diálogos abiertos y menú en pantalla angosta; luego con "reducir transparencia" activado.
- Con el backend real aún sin `/panel/api`, `npm run dev` muestra el login y un error de conexión claro al intentar entrar (no una pantalla en blanco).

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Sin TypeScript, un cambio en el contrato del backend no avisa al compilar. | Zod valida cada respuesta en `api.js` (`invalid_response`), los mocks siguen el contrato y los tests cubren los flujos. |
| MSW 3 es una major de hace dos semanas. | Solo se usa su API estable y el plugin para servir el worker. Si algo falla, se cambia a `msw@2.15.0` + `npx msw init public` sin tocar los handlers; te aviso antes. |
| TanStack Table v9 es reciente y shadcn documenta su tabla con la API v8. | La tabla genérica se arma con la guía que trae el paquete v9. Si aparece un bloqueo serio, alternativa: `@tanstack/react-table@8.21.3`; te consulto antes de cambiar. |
| El CLI de shadcn en modo JavaScript (`tsx: false`) genera algo distinto a lo esperado. | Se revisa lo generado en el paso 2; si un componente sale mal, se convierte a mano y se informa. |
| `backdrop-filter` es costoso en equipos modestos. | Vidrio solo en superficies grandes y pocas (menú, encabezado, tarjetas, diálogos); filas de tablas sin desenfoque; fondo estático. |
| El vidrio baja la legibilidad. | Contraste medido en el peor caso y protegido por test (§7.8); respaldo sólido con "reducir transparencia". |
| Los colores del sitio cambian en el futuro. | La paleta vive en un solo lugar (`index.css`); el test de contraste avisa si un cambio lo rompe. |
| El contrato real del plan 1 difiere de §3.2. | El front aísla el contrato en `features/*/api.js` y `lib/api/*`; los mocks se ajustan al cerrar el plan 1. |
| Node viejo en tu PC (react-router 8 pide ≥ 22.22). | Paso 0. |
| `npm install` en la VM deja binarios de Linux. | Se instala en una copia fuera de tu carpeta; tú corres `npm ci` en Windows. |

## 10. Decisiones por defecto (cambiables antes de aprobar)

1. Versiones según la regla de §1 (≥ 7 días publicadas).
2. ESLint + Prettier (como dice el spec) en lugar del `oxlint` que trae la plantilla.
3. Zod también valida las respuestas de la API; JSDoc solo en lo compartido, sin `checkJs`.
4. Visor JSON: `react-json-view-lite` 2.5.0.
5. Paleta tomada de las variables CSS de smarteamcr.com (§5.9). Primario azul `royal`; naranja para acentos y botones destacados con `accent-strong`; rojo de shadcn para acciones destructivas.
6. Tema claro con vidrio y menú lateral oscuro; sin modo oscuro en la Fase 1.
7. Fuente Plus Jakarta Sans, servida desde el build.
8. "Smarteam" en texto como logo hasta tener el SVG oficial.
9. Rutas en español: `/login`, `/cambiar-contrasena`, `/usuarios`.
10. La página y el tamaño de página viven en la URL; tamaño por defecto 25.
11. Supuestos de contrato C1 a C9 (§3.2), incluido el endpoint nuevo `GET /api/staff/tenants`.
12. "Reactivar" se incluye junto a "Desactivar" (mismo `PATCH`).
13. Sin cambio de contraseña voluntario en esta fase.
14. Prettier sin punto y coma y con comillas simples (estilo de la plantilla de Vite).
15. Cobertura solo como reporte, sin umbral obligatorio.
