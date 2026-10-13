# Plan 4d: contenedor y despliegue del panel (Docker + nginx)

- **Estado:** borrador, pendiente de aprobación. No se toca código hasta que se apruebe.
- **Spec:** `docs/specs/2026-10-12-panel-soporte-design.md`, §Arquitectura general, §Stack ("Contenedor") y §Cambios fuera del panel (red compartida, dominio, HTTPS).
- **Base:** planes 4a, 4b y 4c. El build ya sale limpio (`npm run build` + `check-build`) y las llamadas van a `/api` del mismo origen.
- **Repo:** `smartHubPanel`, rama `main`. El commit y el push los hace el usuario. **Nada se despliega desde este chat:** el plan deja los archivos y una guía; el despliegue en el VPS lo haces tú (o se pide aparte).
- **Depende de:** nada para construir y probar el contenedor. Para que el panel funcione en producción hacen falta los planes 1 a 3 del backend y su cambio de red (§5).

## Qué queda funcionando al terminar

1. **Imagen Docker multietapa**: `node` compila (con `npm ci` y el `check-build`), y un nginx **sin root** sirve `dist/`.
2. **nginx del panel**:
   - fallback a `index.html` para las rutas de la app (`/eventos/123`…);
   - proxy de `/api/*` → `http://<api>:3000/panel/api/*` por la red de Docker compartida, con `X-Forwarded-*`;
   - si el backend no responde, `503` en JSON con el formato del contrato (el front muestra su mensaje genérico), y nginx **arranca igual** aunque el backend esté caído;
   - límite de cuerpo para las imágenes (5 × 5 MB + texto);
   - caché: `/assets/*` (con hash) por un año, `index.html` nunca;
   - cabeceras de seguridad (CSP, `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`) y `server_tokens off`;
   - `/healthz` para el healthcheck.
3. **`docker-compose.yml` del panel**, unido a la red externa compartida con el backend y publicado **solo en `127.0.0.1`** del VPS (lo expone el proxy con TLS, nunca directo a internet).
4. **Prueba de humo** (`npm run smoke -- <url>`): revisa una URL del panel (local o producción) y falla si algo de lo anterior no se cumple.
5. **Documentación**: sección "Despliegue" del `README.md`, guía paso a paso para Hostinger (`docs/despliegue/hostinger.md`) y `docs/contrato-backend/04-despliegue.md` con lo que le toca al backend.

## Fuera de alcance

- CI/CD (GitHub Actions, build automático al hacer push).
- Certificados y configuración del proxy con TLS del VPS: la guía dice qué agregar según lo que haya, pero no se toca el servidor desde aquí.
- Cambios en el backend: se documentan en `04-despliegue.md` para su chat.
- `trustProxy` de Fastify y el límite de intentos por IP (decisión de despliegue del backend, ya anotada en el spec).

---

## 1. Lo que hay hoy en el VPS (y lo que falta confirmar)

De lo que se sabe del backend y de tu servidor (Hostinger, Debian, Docker Compose con varias integraciones, MongoDB y Redis):

- El `docker-compose.yml` del backend publica `api` en `${PORT:-3000}:3000` y lo une a la red externa `mongodb-4-kfyz_default` (la de Mongo).
- Hay un **proxy con TLS delante** que sirve `smartsap.smarteamcr.com` (el spec lo menciona por los 502 cuando falla la red de Mongo).
- **No pude revisar el VPS**: la conexión con la API de Hostinger respondió "no autenticado". Por eso el plan no supone qué proxy es.

**A confirmar al desplegar (§6, paso 4 de la guía):**

| # | Pregunta | Cómo se ve |
|---|---|---|
| V1 | ¿Qué termina el TLS? nginx/Caddy del sistema, un contenedor (Traefik, Nginx Proxy Manager, Caddy) u otro. | `ss -tlnp \| grep -E ':(80\|443)\b'` y `docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'` |
| V2 | ¿El puerto 3000 de `api` es accesible desde internet? (riesgo ya anotado en el spec) | Desde fuera: `curl -m 5 http://<ip del VPS>:3000/` debe fallar. |
| V3 | ¿El DNS del subdominio del panel ya apunta al VPS? | `dig +short panel.smarteamcr.com` |

La guía cubre los dos casos de V1 (§4).

## 2. Archivos nuevos

```
smartHubPanel/
├─ Dockerfile
├─ .dockerignore
├─ docker-compose.yml
├─ deploy/
│  └─ nginx/
│     └─ default.conf.template      # nginx del panel (variables con envsubst al arrancar)
├─ scripts/
│  └─ smoke-test.mjs                # npm run smoke -- <url>
└─ docs/
   ├─ despliegue/hostinger.md       # guía paso a paso
   └─ contrato-backend/04-despliegue.md
```

Se modifican: `package.json` (script `smoke`), `.env.example` (variables del despliegue), `README.md` (sección Despliegue) y `docs/contrato-backend/README.md` (enlace al 04).

## 3. Decisiones técnicas

### 3.1 Imagen

| Etapa | Imagen | Qué hace |
|---|---|---|
| `build` | `node:24-alpine` (como `.nvmrc`; trae npm 11, sin el bug de `edgesOut`) | `npm ci` con `package-lock.json`, `npm run build` (incluye `check-build`: sin MSW, sin llave interna, sin nombres prohibidos). |
| `runtime` | `nginxinc/nginx-unprivileged:<versión estable>-alpine` | Sirve `dist/` en el puerto **8080** como usuario sin privilegios. Solo copia `dist/` y la plantilla: nada de Node ni del código fuente. |

- Las **versiones exactas** de ambas imágenes se fijan en el paso 1, verificadas en Docker Hub (con etiqueta de versión, no `latest`).
- `HEALTHCHECK` contra `http://127.0.0.1:8080/healthz`.
- La URL del backend **no** se compila dentro de la imagen: el front siempre llama a `/api` y es nginx quien sabe a dónde reenviar. La misma imagen sirve para cualquier entorno.

### 3.2 nginx (`deploy/nginx/default.conf.template`)

La imagen oficial aplica `envsubst` a `/etc/nginx/templates/*.template` al arrancar. Variables:

| Variable | Por defecto | Para qué |
|---|---|---|
| `PANEL_API_UPSTREAM` | `http://api:3000` | Dónde está el backend dentro de la red compartida. |
| `PANEL_RESOLVER` | `127.0.0.11` | DNS interno de Docker, para resolver el backend en cada request. |

Comportamiento:

- **`/api/`**: `rewrite ^/api/(.*)$ /panel/api/$1` y `proxy_pass` con el upstream **en una variable** + `resolver`. Así nginx arranca aunque el backend no exista todavía y lo encuentra cuando aparece. Pasa `Host`, `X-Real-IP`, `X-Forwarded-For` y `X-Forwarded-Proto` (el que le llegó del proxy con TLS). `client_max_body_size 30m` (5 imágenes de 5 MB + texto; el backend sigue validando). Sin caché (`Cache-Control: no-store` lo pone el backend; nginx no guarda nada).
- **Backend caído** (`502/503/504` o sin conexión): `503` con `{"error":"service_unavailable","message":"El servicio no está disponible. Inténtalo en un momento."}`. El front ya muestra el mensaje de 5xx.
- **`/assets/`**: `Cache-Control: public, max-age=31536000, immutable`. Si el archivo no existe, `404` (nunca `index.html`, para no cachear HTML con nombre de JS).
- **Resto**: `try_files $uri /index.html` con `Cache-Control: no-cache` para el HTML.
- **`/healthz`**: `200 ok`, sin log.
- **`/mockServiceWorker.js`**: `404` explícito (además de que `check-build` impide que exista en `dist/`).
- **Compresión** `gzip` para JS, CSS, SVG y JSON.
- **Cabeceras de seguridad** (en todas las respuestas del panel):

| Cabecera | Valor | Por qué |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | `blob:` para las miniaturas de imágenes antes de enviar; `'unsafe-inline'` en estilos porque las librerías de avisos y menús insertan estilos (se verifica en el paso 3 que no haga falta más). Sin scripts externos. |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `same-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | |
| `X-Frame-Options` | `DENY` | Respaldo de `frame-ancestors` para navegadores viejos. |

- **HSTS** (`Strict-Transport-Security`) lo pone el proxy con TLS, no este nginx (que habla HTTP dentro del servidor). La guía lo indica.

### 3.3 `docker-compose.yml` del panel

```yaml
services:
  panel:
    build: .
    image: smarthubpanel:${PANEL_TAG:-latest}
    restart: unless-stopped
    ports:
      - "127.0.0.1:${PANEL_PORT:-8081}:8080"   # solo local: lo expone el proxy con TLS
    environment:
      PANEL_API_UPSTREAM: ${PANEL_API_UPSTREAM:-http://api:3000}
    networks: [panel]

networks:
  panel:
    external: true
    name: ${PANEL_NETWORK:-smartconnect-panel}
```

- Si el proxy con TLS es un **contenedor** (V1), se le une también a esa red y el `ports:` se puede quitar (la guía muestra las dos variantes).
- `8081` porque `3000` ya lo usa `api`; se puede cambiar en `.env`.

### 3.4 Nombre del backend en la red

Con una red externa propia (`smartconnect-panel`), el servicio `api` del backend se resuelve por su nombre. Para que no dependa de que se llame `api`, el contrato pide un **alias fijo** en esa red: `panel-api` (§5), y el panel usaría `PANEL_API_UPSTREAM=http://panel-api:3000`. Mientras el backend no lo agregue, `http://api:3000` funciona igual.

### 3.5 Prueba de humo (`scripts/smoke-test.mjs`)

Node puro (sin dependencias), contra una URL base:

1. `GET /healthz` → 200.
2. `GET /` → 200, HTML, `Cache-Control: no-cache`, y las cabeceras de seguridad de §3.2.
3. `GET /eventos/no-existe` → 200 y el mismo HTML (fallback de la SPA).
4. Un `/assets/*.js` sacado del HTML → 200, `immutable`. Un asset inventado → 404.
5. `GET /mockServiceWorker.js` → 404.
6. `GET /api/auth/me` → **no** devuelve HTML (prueba que `/api` va al backend): 401 si el backend está arriba, 503 en JSON si no.

Uso: `npm run smoke -- http://127.0.0.1:8081` en el VPS, o `npm run smoke -- https://panel.smarteamcr.com` después de publicar.

## 4. Guía de Hostinger (`docs/despliegue/hostinger.md`)

Pasos en orden, con los comandos:

1. **Red compartida** (una vez): `docker network create smartconnect-panel`.
2. **Backend**: aplicar el cambio de `04-despliegue.md` (unir `api` a la red con el alias `panel-api`) y reiniciarlo. Lo hace el chat del backend.
3. **Panel**: clonar el repo en el VPS, crear `.env` desde `.env.example`, `docker compose up -d --build`. Prueba de humo local: `npm run smoke -- http://127.0.0.1:8081` (o con `curl`, si el VPS no tiene Node).
4. **Verificar V1 a V3** (§1).
5. **Subdominio con TLS**, según V1:
   - **A. Proxy en el sistema (nginx/Caddy del VPS):** bloque `server` para el subdominio con TLS (Certbot o el que ya use el servidor) que hace `proxy_pass http://127.0.0.1:8081`, con `X-Forwarded-Proto https`, `client_max_body_size 30m` y HSTS. Se da el bloque listo para copiar.
   - **B. Proxy en contenedor (Traefik / Nginx Proxy Manager / Caddy):** unir ese contenedor a `smartconnect-panel` y apuntar el subdominio a `panel:8080` (con las etiquetas o la pantalla de ese proxy). Se dan los dos ejemplos más comunes.
6. **DNS**: registro `A` del subdominio a la IP del VPS (si no existe).
7. **Prueba de humo pública**: `npm run smoke -- https://panel.smarteamcr.com`, y entrar con la cuenta de Smarteam creada con `scripts/create-panel-staff.js` del backend.
8. **Actualizar** una versión nueva: `git pull && docker compose up -d --build`. **Volver atrás**: `git checkout <commit anterior> && docker compose up -d --build`.

Si usas el **Docker Manager de Hostinger** en vez de SSH, la guía indica qué cargar en su pantalla (repo, compose, variables) y que la red externa tiene que existir antes.

## 5. Lo que le toca al backend (`docs/contrato-backend/04-despliegue.md`)

- Unir `api` a la red externa `smartconnect-panel` con el alias `panel-api` (además de `default` y `mongo`).
- No hace falta CORS: el navegador ve todo en el dominio del panel.
- La cookie `panel_session` va con `Secure` y `Path=/api`: el panel **solo** funciona por HTTPS.
- Recibe `X-Forwarded-For` y `X-Forwarded-Proto` del nginx del panel; usarlos o no (`trustProxy`) es su decisión, ya anotada en el spec.
- Que el puerto 3000 publicado no quede abierto a internet (V2). Si nadie más lo usa desde fuera, publicarlo como `127.0.0.1:3000:3000`.
- `PANEL_JWT_SECRET` en su `.env` (sin ella no registra `/panel/api`).
- Límite de cuerpo de `@fastify/multipart` coherente con el de nginx (30 MB por request, 5 MB por archivo).

## 6. Pasos

Mismo método que los planes anteriores (copia de trabajo, sincronización a tu carpeta al final de cada paso, mensaje por paso, sin `git add`/`commit`/`push`).

### Paso 1. Imagen
`Dockerfile` y `.dockerignore` (fuera: `node_modules`, `dist`, `coverage`, `.git`, `docs`, `Claude outputs`, `.env*` salvo `.env.example`, `test-output.txt`). Versiones de las imágenes verificadas en Docker Hub.

### Paso 2. nginx y compose
`deploy/nginx/default.conf.template`, `docker-compose.yml` y las variables nuevas de `.env.example`.

### Paso 3. Prueba de humo y verificación
`scripts/smoke-test.mjs` y `npm run smoke`. Verificación en mi entorno:
- si hay Docker: build de la imagen, contenedor con un backend simulado en la misma red, y la prueba de humo completa (incluido backend caído → 503);
- si no hay Docker: el mismo nginx con la plantilla procesada, sirviendo el `dist/` real y un backend simulado; se comprueba `nginx -t`, la prueba de humo y la CSP abriendo el panel en un navegador (sin errores de CSP en la consola).

### Paso 4. Documentación
`docs/despliegue/hostinger.md`, `docs/contrato-backend/04-despliegue.md` (+ enlace en su README) y sección "Despliegue" del `README.md`.

### Paso 5. Cierre
Lint, formato, tests, build, prueba de humo, y resumen para el chat del backend.

## 7. Verificación final

```
npm run lint
npm run format:check
npm test
npm run build
docker build -t smarthubpanel:prueba .          # si tienes Docker en tu máquina
npm run smoke -- http://127.0.0.1:8081           # con el contenedor corriendo
```

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| No se sabe qué termina el TLS en el VPS (V1). | La guía trae las dos variantes y los comandos para saberlo antes de tocar nada. |
| El nombre `api` choca con otro servicio en la red. | Red propia del panel + alias fijo `panel-api` (§3.4). |
| El backend no está arriba cuando arranca el panel. | `resolver` + upstream en variable: nginx arranca igual y responde 503 en JSON. |
| La CSP rompe algo (estilos de librerías, imágenes `blob:`). | Se prueba en navegador en el paso 3; la CSP está en un solo lugar. |
| Se abre el panel por HTTP y la cookie `Secure` no se guarda. | El proxy con TLS redirige HTTP → HTTPS (en la guía) y HSTS. |
| El puerto 3000 del backend queda público. | Verificación V2 en la guía y recomendación en `04-despliegue.md`. |
| Subir imágenes grandes da 413 de nginx antes que el error del backend. | `client_max_body_size 30m`, por encima del máximo permitido (5 × 5 MB). |

## 9. Decisiones por defecto (cambiables antes de aprobar)

1. `nginx-unprivileged` (sin root, puerto 8080) en vez de `nginx:alpine`.
2. Red compartida `smartconnect-panel` y alias `panel-api` para el backend.
3. Panel publicado en `127.0.0.1:8081` del VPS, nunca directo a internet.
4. CSP estricta sin scripts externos, con `'unsafe-inline'` solo en estilos.
5. Subdominio supuesto `panel.smarteamcr.com` (se cambia con una variable; nada del código depende del dominio).
6. Despliegue con `git pull` + `docker compose up -d --build` en el VPS (sin registro de imágenes ni CI por ahora).
