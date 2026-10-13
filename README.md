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

- **Smarteam**: la **Bandeja** con los tickets de las tres empresas de ejemplo (contadores, filtros, responder, "Esperando cliente", "Resolver" con resolución interna), **Usuarios**, y **Eventos** y **Syncs** eligiendo la empresa (Initech está suspendida y también se puede consultar). En el detalle de un evento se ven el **Payload** y la **Auditoría**.
- **Cliente** (cualquiera de las dos de ACME): **Soporte** con los tickets de su empresa (crear con imágenes o Ctrl+V, responder, "Sigue fallando"), y **Eventos** y **Syncs** de su empresa con filtros por estado, tipo, referencia, tarea y fechas.
- **Reportar problema**: como cliente, abre un evento "Con error" (p. ej. el primero de la lista) o la sync con 60 fallidos, toca **Reportar problema** y crea el ticket: queda enlazado y Smarteam lo ve en la Bandeja con su contexto.
- Para ver el ida y vuelta, abre Smarteam en una pestaña y el cliente en otra.

Los datos simulados se guardan en el navegador. Las imágenes que subas en este modo se pierden al recargar (las de los tickets de ejemplo siempre están). Para volver a los datos de ejemplo, borra la clave `panel-mock-db` del `localStorage` (DevTools → Application → Local Storage) y recarga.

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
