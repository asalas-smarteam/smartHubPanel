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

Los datos simulados se guardan en el navegador. Para volver a los datos de ejemplo, borra la clave `panel-mock-db` del `localStorage` (DevTools → Application → Local Storage) y recarga.

### Calidad

```bash
npm test            # Vitest + Testing Library
npm run test:coverage
npm run lint
npm run format:check
npm run build       # build de producción + revisión de dist/
```
