# smartHubPanel

Panel de soporte y operación de la integración. Frontend en Vite + React (JavaScript), Tailwind CSS v4 y shadcn/ui. Habla solo con la API del panel en `/api`.

## Desarrollo

Requisitos: Node 22.22 o superior (recomendado 24 LTS, ver `.nvmrc`) y npm 11 o superior (Node 24 ya lo trae). Con npm 10, `npm install` falla al resolver las dependencias de Vitest (error `edgesOut`).

```bash
npm ci              # instala exactamente lo de package-lock.json
npm run dev:mock    # panel con la API simulada (MSW), sin backend
npm run dev         # panel contra el backend real: /api -> http://localhost:3000/panel/api
```

El destino del proxy se cambia con `PANEL_API_TARGET` en un `.env.local` (ver `.env.example`).

### Cuentas de prueba (solo `dev:mock`)

| Correo                | Contraseña      | Cuenta                                              |
| --------------------- | --------------- | --------------------------------------------------- |
| `smarteam@panel.test` | `Smarteam-2026` | Smarteam                                            |
| `admin@acme.test`     | `Temporal-123`  | Cliente admin, con cambio de contraseña obligatorio |
| `usuario@acme.test`   | `Usuario-2026`  | Cliente usuario                                     |

Qué se puede probar con cada una:

- **Smarteam**: la **Bandeja** con los tickets de las tres empresas de ejemplo (contadores, filtros, responder, "Esperando cliente", "Resolver" con resolución interna). Abrir un ticket "Abierto" lo pasa solo a "En progreso". También **Métricas** de soporte, **Usuarios**, e **Inicio**, **Eventos**, **Syncs**, **Tareas programadas** y **Mapeo de campos** eligiendo la empresa, y **Cambiar contraseña** desde la barra superior (Initech está suspendida y también se puede consultar). En el detalle de un evento se ven el **Intercambio** completo y la **Auditoría**.
- **Cliente** (cualquiera de las dos de ACME): **Inicio** con el estado de la integración, **Soporte** con los tickets de su empresa (crear con imágenes o Ctrl+V, responder, "Sigue fallando"), **Eventos** y **Syncs** de su empresa con filtros, duración promedio y exportación a Excel, las **Tareas programadas** y el **Mapeo de campos** (solo lectura).
- **Reportar problema**: como cliente, abre un evento "Con error" (p. ej. el primero de la lista) o la sync con 60 fallidos, toca **Reportar problema** y crea el ticket: queda enlazado y Smarteam lo ve en la Bandeja con su contexto.
- Para ver el ida y vuelta, abre Smarteam en una pestaña y el cliente en otra.
- Tema oscuro (por defecto) o claro con el botón de la barra superior.

Los datos simulados se guardan en el navegador. Las imágenes que subas en este modo se pierden al recargar (las de los tickets de ejemplo siempre están). Para volver a los datos de ejemplo, borra la clave `panel-mock-db` del `localStorage` (DevTools → Application → Local Storage) y recarga.

### Lo que calcula el front

El backend entrega los datos tal cual; estas reglas viven en el front:

- **Corregido** (`src/features/events/corrections*.js`): un evento con error se marca "Corregido" si después llegó otro de la misma referencia y el mismo tipo que salió bien (completado o creado en destino). Los filtros "Con error" y "Corregido" revisan hasta los 1.000 errores más recientes del filtro y avisan si hay más. Inicio cuenta los corregidos como creados en el porcentaje de éxito.
- **Duración promedio** (`src/lib/durations.js`): en Syncs, fin menos inicio de las corridas terminadas, por tarea; en Eventos, desde que llega el evento hasta su último cambio (con la espera en cola), por tipo. Sigue los filtros de la página y usa hasta las 1.000 más recientes.
- **Exportar a Excel** (`src/features/events/export.js`, `src/lib/xlsx/`): los 500 eventos más recientes del filtro, una hoja por tipo, con lo recibido, lo enviado y la respuesta de cada uno. El archivo se arma en el navegador.
- **"En progreso" al abrir** (`src/features/inbox/staff-ticket-page.jsx`): Smarteam abre un ticket "Abierto" y el front pide el cambio de estado una sola vez. Si la API lo rechaza, no muestra error y responder lo sigue pasando a "En progreso".

### Contrato con el backend

`docs/contrato-backend/` tiene los acuerdos de forma de datos, campos y errores que este front ya implementa y que el backend debe respetar en `/panel/api`.

### Calidad

```bash
npm test            # Vitest + Testing Library
npm run test:coverage
npm run lint
npm run format:check
npm run build       # build de producción + revisión de dist/
```

La suite completa tarda varios minutos; para correrla por partes: `npx vitest run --shard=1/4` (y 2/4, 3/4, 4/4).

Los planes de cada cambio están en `docs/plans/` y el diseño general en `docs/specs/`.
