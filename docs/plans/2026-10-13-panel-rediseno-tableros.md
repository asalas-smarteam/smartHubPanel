# Plan 4e: rediseño en vidrio (oscuro y claro) + Inicio del cliente + Métricas de soporte

- **Estado:** aprobado (13-10-2026), terminado (15-10-2026). Paso 7: revisión visual hecha (hallazgos en el plan 4o, `2026-10-15-panel-revision-visual.md`), datos de prueba alineados con G7, README actualizado y verificación completa en verde.
- **Origen:** pedido del 2026-10-13 ("nada está a nivel de diseño glassmorphism", gráficos de tickets resueltos y en cuánto tiempo, tablero del cliente como la Bitácora de cotizaciones). Respuestas del usuario: métricas para **Smarteam y cliente**; tablero como **nueva página de inicio**; **las dos direcciones visuales del lienzo** "Panel Smarteam — rediseño glass y tableros", con selector: **A, vidrio sobre azul marino** (fila superior, tema por defecto) y **B, vidrio sobre fondo claro** (fila inferior).
- **Spec:** `docs/specs/2026-10-12-panel-soporte-design.md`. Este plan **adelanta** S13 (métricas de calidad, Fase 2) y la parte de "portada de estado" de E5, y cambia dos decisiones del spec: dos temas con selector (el spec decía "solo claro en la Fase 1") y gráficos propios en vez de Recharts (§3.4).
- **Base:** planes 4a, 4b y 4c. **Repo:** `smartHubPanel`, rama `main`. El commit y el push los hace el usuario.
- **Depende de:** nada para empezar (API simulada). El backend necesita dos endpoints nuevos de resumen (§2), que se documentan en `docs/contrato-backend/05-tableros-y-metricas.md`.

## Qué queda funcionando al terminar

1. **Todo el panel en vidrio, en dos temas**: **oscuro** (A: fondo azul marino, paneles translúcidos, texto claro) y **claro** (B: fondo claro con manchas de marca más vivas, paneles blancos translúcidos, texto azul marino). Ambos con desenfoque y borde de luz en login, menú, tablas, formularios, diálogos, menús desplegables, avisos, insignias, visor JSON, gráficos y estados vacíos/error. Contraste AA verificado por tests **en los dos temas**, con respaldo sólido sin `backdrop-filter` o con "reducir transparencia".
2. **Selector de tema** (Oscuro / Claro) en la barra superior, junto a "Cerrar sesión" y también en el login. Se recuerda en el navegador; la primera vez se usa **oscuro**. Se aplica antes de pintar la página (sin parpadeo).
3. **Inicio** (`/inicio`, permiso `events.read`): "Estado de la integración" como en el lienzo — porcentaje de documentos creados, 6 indicadores, actividad por día, errores por causa y por grupo de causa, negocios con más de un intento, y (si tiene `tickets.read`) el bloque "Tu soporte". Período 7 / 30 / 90 días en la URL. Smarteam lo ve eligiendo la empresa.
4. **Métricas de soporte** (`/metricas`, permiso `tickets.read` **o** `staff.tickets`): resueltos por semana con la mediana de resolución, "¿en cuánto tiempo se resuelven?" por rangos, por categoría y, solo Smarteam, por empresa. Período 30 / 90 días / 12 meses. Smarteam filtra por empresa y categoría; el cliente ve solo su empresa.
5. **Componentes de gráficos propios** (barras horizontales, apiladas por día, columnas por semana, barra de proporción, indicador), accesibles y probados.
6. Mocks que **calculan** los resúmenes desde los datos simulados (eventos y tickets), tests y el contrato `05-tableros-y-metricas.md` para el backend.

## Fuera de alcance

- Guardar el tema elegido en el servidor (por usuario): se guarda solo en el navegador. Seguir automáticamente el tema del sistema operativo.
- Métricas por persona de Smarteam (S13 completo): el backend no guarda quién resolvió de forma consultable. Se anota como supuesto futuro.
- "Negocios sin documento ya cubiertos por otro" (la Bitácora lo calculó a mano cruzando cliente e importe): queda fuera de la v1.
- Exportar a PDF/CSV, alertas, notificaciones.

---

## 1. Sistema visual: dos temas de vidrio

Los dos temas comparten nombres de tokens (los de shadcn más unos pocos nuevos): cada componente usa el token y el tema decide el valor. El atributo `data-theme="dark" | "light"` en `<html>` elige el juego de valores. Nada en los componentes pregunta por el tema, salvo el selector.

### 1.1 Tokens del tema oscuro (A, por defecto)

Valores de `:root[data-theme="dark"]` (y de `:root` sin atributo):

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#040b22` | Fondo base (debajo de las manchas) |
| `--foreground` | `#f3f6fc` | Texto principal |
| `--muted-foreground` | `#bfcae2` | Texto secundario |
| `--subtle-foreground` (nuevo) | `#94a3c6` | Etiquetas, metadatos |
| `--card` | `rgb(255 255 255 / 0.07)` | Panel de vidrio |
| `--popover` | `rgb(10 22 56 / 0.92)` | Menús desplegables y diálogos (más opacos: van sobre contenido) |
| `--primary` | `#5aa5ff` (acción) / texto `#051849` | Botón principal claro sobre oscuro |
| `--border` | `rgb(255 255 255 / 0.13)` | Bordes de vidrio y separadores |
| `--input` | `rgb(4 11 34 / 0.45)` + borde `rgb(255 255 255 / 0.16)` | Campos |
| `--ring` | `#5aa5ff` | Foco |
| Estado ok / error / espera / info / aviso | `#34d39b` / `#ff6b57` / `#7aa7ff` / `#5aa5ff` / `#ff8a4c` | Barras y puntos de gráficos |
| Insignias (fondo / texto) | ok `rgb(52 211 155 / .16)` / `#6ff0c0`; error `rgb(255 107 87 / .18)` / `#ff9d91`; info `rgb(90 165 255 / .18)` / `#a9cdff`; aviso `rgb(255 138 76 / .18)` / `#ffb08a`; neutro `rgb(255 255 255 / .10)` / `#d5ddee` | `Badge` |
| Grupos de causa | datos `#ff8a4c`, fiscales `#5aa5ff`, maestro `#f5c04a`, validación `#34d39b`, conectividad `#f27fb2`, otros `#94a3c6` | Gráfico de causas |

- El naranja de marca sigue en el botón de llamada a la acción (`brand`) y en el punto del logo; el botón usa `accent-strong` con texto blanco (ya pasa AA).
- Fuentes: Plus Jakarta Sans (ya instalada) y **JetBrains Mono** para etiquetas en mayúsculas y cifras de gráficos (`@fontsource-variable/jetbrains-mono`, versión exacta verificada en npm al ejecutar).

### 1.1 bis Tokens del tema claro (B)

Valores de `:root[data-theme="light"]`, tomados de la fila inferior del lienzo:

| Token | Valor |
|---|---|
| `--background` | `#e6edf9` con manchas royal `.42`, celeste `.30`, naranja `.26`, menta `.30` |
| `--foreground` / `--muted-foreground` / `--subtle-foreground` | `#0a1638` / `#30406a` / `#4a5a80` |
| `--card` | `rgb(255 255 255 / 0.52)`, borde `rgb(255 255 255 / 0.75)`, brillo interior blanco, sombra azulada |
| `--popover` | `rgb(255 255 255 / 0.94)` |
| `--primary` | `#0b58d3` con texto blanco |
| `--border` / `--input` | `rgb(5 24 73 / 0.12)` / fondo `rgb(255 255 255 / 0.75)` y borde `rgb(5 24 73 / 0.16)` |
| Estados (ok / error / espera / info / aviso) | `#0f9d6c` / `#d6402a` / `#5b8de8` / `#0b58d3` / `#d9541a` |
| Insignias | las actuales (`status-*`), que ya pasan AA |
| Grupos de causa | datos `#d9541a`, fiscales `#0b58d3`, maestro `#b07d06`, validación `#0f9d6c`, conectividad `#c23d7a`, otros `#4a5a80` |
| Menú lateral | vidrio azul marino `rgb(5 24 73 / 0.86)` con texto blanco (igual que en el oscuro) |

### 1.1 ter Selector de tema

- `src/app/theme.js`: `getTheme()`, `setTheme(theme)` (guarda en `localStorage` con `try/catch`; si falla, queda en memoria) y `useTheme()`.
- `index.html`: un script en línea mínimo antes de los estilos pone `data-theme` desde `localStorage` (por defecto `dark`) para que no haya parpadeo al cargar. Es el único script en línea: la CSP del plan 4d (aún no aprobado) lo permitirá con su hash.
- `components/theme-toggle.jsx`: botón con ícono sol/luna y texto accesible ("Cambiar a tema claro"), en la barra superior del panel y en la esquina del login. `aria-pressed` y foco visible.
- `Toaster` y el visor JSON leen el tema (`theme={theme}`; paleta del visor por tokens).
- El login conserva su fondo de marca oscuro en los dos temas (es la portada); solo su tarjeta sigue el tema.

### 1.2 Vidrio

| Utilidad | Definición |
|---|---|
| `glass` | fondo `rgb(255 255 255 / 0.07)`, `backdrop-filter: blur(22px) saturate(160%)`, borde `rgb(255 255 255 / 0.13)`, sombra `inset 0 1px 0 rgb(255 255 255 / .10), 0 24px 60px -30px rgb(0 0 0 / .6)` |
| `glass-strong` | degradado `rgb(255 255 255 / .12)` → `.05`, `blur(28px) saturate(170%)`, borde `.18`, brillo interior más fuerte (héroes, tarjeta del login) |
| `glass-dark` | menú lateral: `rgb(4 11 34 / 0.55)` con desenfoque |
| Respaldo (`@supports not (backdrop-filter)` y `prefers-reduced-transparency`) | colores sólidos equivalentes por tema (oscuro `#101a3c`, `#16224a`, `#061033`; claro `#f4f7fd`, `#ffffff`, `#051849`) |

Las utilidades se definen una vez con variables (`--glass-bg`, `--glass-border`, `--glass-shadow`…) que cada tema llena; la tabla muestra los valores del oscuro, y los del claro son los del §1.1 bis.

`AppBackground`: color base del tema con 4 manchas radiales (royal arriba a la derecha, celeste a la izquierda, naranja al centro-derecha, menta abajo a la izquierda), fijas y sin animación; la intensidad de cada mancha sale del tema.

### 1.3 Componentes que cambian

- `ui/*` (button, input, select, dialog, alert-dialog, dropdown-menu, sheet, table, card, badge, textarea, skeleton, sonner → `theme="dark"`): solo clases, sin cambiar su API.
- Se reemplazan los colores fijos de tema claro (`bg-white/90`, `bg-brand-paper-tint`, `text-brand-ink-soft`, `text-brand-navy`, `text-emerald-800`, `border-brand-blue-pale`, `bg-status-*`…, unas 40 apariciones) por tokens semánticos.
- `JsonViewer`: paleta oscura (claves `#a9cdff`, cadenas `#6ff0c0`, números `#ffb08a`).
- Menú lateral y fila activa como en el lienzo (activo: fondo `#cfe2fa`, texto `#051849`).

### 1.4 Tests de contraste (`src/theme.test.js`)

Se reescriben y corren **una vez por tema** (`describe.each(['dark', 'light'])`), leyendo los valores de cada bloque de `index.css`: texto principal, secundario y sutil sobre `glass` en el **peor caso** (mancha más clara detrás al 60 %), insignias, texto del botón principal y del `brand`, foco visible, y el respaldo sólido. Mínimo AA 4.5:1 (3:1 para texto ≥ 24 px y barras de gráficos contra el panel).

## 2. Contrato nuevo (supuestos F1 a F9, para el backend)

Se escriben en `docs/contrato-backend/05-tableros-y-metricas.md` en el paso 1.

| # | Tema | Supuesto |
|---|---|---|
| F1 | **Resumen de integración** | `GET /panel/api/dashboard/integration?from=&to=&tz=` (cliente, `events.read`) y `GET /panel/api/staff/tenants/:tenantKey/dashboard/integration?…` (Smarteam). Sin paginar. |
| F2 | Cuerpo de F1 | `{ period: { from, to, tz }, totals: { documents, created, errored, pending, references, referencesWithoutDocument, avgDurationSeconds, avgDurationCreatedSeconds, oldestPendingAt }, byDay: [{ date: "YYYY-MM-DD", created, errored, pending }], causes: [{ key, label, group, count }], groups: [{ key, count }], multiAttempt: { total, items: [...] } }`. |
| F3 | Qué cuenta como "creado" | `created` = `completed` + `destination_created` + `destination_created_origin_error` (el documento existe en destino); `errored` = `errored`; `pending` = `waiting` + `in_process`. Reportes de calidad excluidos. Duración = `updatedAt − createdAt`. |
| F4 | Días en la zona del usuario | `tz` es IANA (`America/Costa_Rica`); `byDay` agrupa por día local, con todos los días del período (los vacíos en 0). `from`/`to` como en E3. Período máximo 366 días. |
| F5 | **Causas de error** | El backend clasifica `lastError` con un **catálogo de reglas** propio (patrón → `key`, `label` genérico en español, `group`). Grupos fijos: `deal_data`, `fiscal_data`, `destination_validation`, `master_blocked`, `connectivity`, `other`. Lo que no calza va a `other` ("Otro error"). `label` **sin nombres de sistemas**. El front no clasifica nada. |
| F6 | Negocios con más de un intento | `multiAttempt.items` (máx. 10, los de más intentos primero): `{ reference, title, attempts, resolvedAfterSeconds \| null, steps: [{ at, status, summary, documentNumber \| null }] }`. `title` = nombre del negocio; `summary` = causa (`label`) o "Documento creado". |
| F7 | **Métricas de tickets** | `GET /panel/api/tickets/metrics?from=&to=&tz=` (cliente, `tickets.read`, su empresa) y `GET /panel/api/staff/tickets/metrics?from=&to=&tz=&tenantKey=&category=` (Smarteam, `staff.tickets`). |
| F8 | Cuerpo de F7 | `{ period, totals: { resolved, resolvedPreviousPeriod, reopened, open, openWithoutFirstResponse, medianFirstResponseSeconds, medianResolutionSeconds }, byWeek: [{ weekStart, resolved, reopened, medianResolutionSeconds }], buckets: [{ key: "lt4h" \| "4h_24h" \| "1d_3d" \| "gt3d", count }], byCategory: [{ category, resolved, medianResolutionSeconds }], byTenant?: [{ tenantKey, companyName, resolved, medianFirstResponseSeconds, medianResolutionSeconds, reopened, open }] }`. `byTenant` **solo** en la ruta de Smarteam. |
| F9 | Cómo se miden los tiempos | Tiempo corrido (no horario hábil). Resolución = de `openedAt` a la **última** resolución, para los tickets resueltos dentro del período. Primera respuesta = `firstResponseAt − openedAt`. Medianas en segundos, `null` sin datos. Semanas desde el lunes, en `tz`. |

## 3. Pantallas

### 3.1 Inicio (`/inicio`)

Igual al lienzo (artboard "Inicio del cliente · vidrio oscuro"):

- Encabezado: empresa · período, título "Estado de la integración", rango de fechas, selector **7 / 30 / 90 días** (`?periodo=30`, por defecto 30).
- Smarteam: selector de empresa como en Eventos (`?empresa=`), con la misma tarjeta "Elige una empresa" (§2 del plan 4c).
- Héroe: porcentaje `created / documents` + barra de proporción creados / con error / en cola.
- 6 indicadores: Documentos, Creados, Con error, Negocios sin documento, Tiempo medio (y "cuando sale bien"), En cola ahora (y el más antiguo).
- Actividad por día (barras apiladas creados/error; con ≤ 31 días una fila por día, con 90 días agrupa por semana).
- Errores por causa (barras horizontales coloreadas por grupo) + leyenda + por grupo.
- Negocios con más de un intento (línea de pasos con punto verde/rojo). Cada uno enlaza a Eventos filtrado por esa referencia.
- **Tu soporte** (si tiene `tickets.read`): resueltos, mediana de resolución, primera respuesta, abiertos y resueltos por semana; enlace a Métricas.
- Las frases de resumen bajo cada título se **arman en el front** a partir de los números (p. ej. "El martes 6 fue el peor: 9 de 31 con error"), con reglas simples y probadas; si no aplican, no se muestran.
- Sin datos en el período: estado vacío "Todavía no hay documentos en este período".

### 3.2 Métricas de soporte (`/metricas`)

Igual al lienzo ("Métricas de soporte · vidrio oscuro"):

- Filtros: período **30 / 90 días / 12 meses**; Smarteam además Empresa (Todas) y Categoría.
- 5 indicadores: Resueltos (vs período anterior), Primera respuesta (mediana), Resolución (mediana), Reabiertos (% y cantidad), Abiertos ahora (y sin primera respuesta).
- Columnas por semana (resueltos + reabiertos) con la mediana de horas debajo; con 12 meses agrupa por mes.
- Rangos de tiempo de resolución; por categoría (cantidad + mediana).
- Por empresa (tabla), solo con `staff.tickets`.

### 3.3 Menú y rutas

| Ruta | Permiso |
|---|---|
| `/inicio` | `events.read` |
| `/metricas` | `tickets.read` **o** `staff.tickets` (los ítems del menú y `RequirePermission` aceptan una lista "cualquiera de") |

Orden: **Bandeja, Inicio, Soporte, Métricas, Eventos, Syncs, Usuarios**. Así el cliente entra a Inicio (su primer ítem) y Smarteam sigue entrando a la Bandeja.

### 3.4 Gráficos propios en vez de Recharts

El spec preveía Recharts. Todos los gráficos del lienzo son barras (horizontales, apiladas, columnas) y una barra de proporción: con HTML/CSS quedan nítidos, livianos (sin ~100 KB de librería), se prueban en jsdom sin trucos y son accesibles con texto real. Cada gráfico lleva `role="img"` con un `aria-label` que resume los datos y una tabla equivalente solo para lectores de pantalla. Si más adelante hace falta una línea de tiempo o un área, se evalúa Recharts en ese plan.

## 4. Estructura nueva

```
src/
├─ components/charts/
│  ├─ bar-list.jsx           # barras horizontales con etiqueta y valor (causas, grupos, categorías, rangos)
│  ├─ stacked-bars.jsx       # una fila por día con segmentos (creados / error)
│  ├─ column-chart.jsx       # columnas por semana o mes, con serie secundaria y rótulo inferior
│  ├─ ratio-bar.jsx          # barra de proporción del héroe + leyenda
│  ├─ stat-tile.jsx          # indicador: etiqueta, valor, nota, tono
│  └─ chart-card.jsx         # tarjeta de vidrio con título en mayúsculas mono y nota
├─ lib/format.js             # duraciones ("1 h 20", "52 min"), porcentajes y números en español
├─ features/dashboard/       # Inicio: api.js, schemas.js, summaries.js (frases), dashboard-page.jsx, support-card.jsx
├─ features/metrics/         # Métricas: api.js, schemas.js, metrics-page.jsx
└─ mocks/handlers/{dashboard,metrics}.js + mocks/error-causes.js (catálogo de ejemplo, como lo hará el backend)
```

## 5. Pasos

Mismo método que los planes anteriores (copia de trabajo, sincronización a tu carpeta al final de cada paso, test primero donde hay lógica, mensaje por paso, sin `git add`/`commit`/`push`).

### Paso 1. Contrato
`docs/contrato-backend/05-tableros-y-metricas.md` con F1 a F9 y ejemplos JSON; enlace en su `README.md`.

### Paso 2. Dos temas, vidrio y selector
Tokens de los dos temas, utilidades de vidrio con variables y respaldo, `AppBackground`, fuentes, `ui/*`, reemplazo de colores fijos, `JsonViewer`, `Toaster`, login, menú, `theme.js`, script de `index.html` y `ThemeToggle` (con tests: cambia `data-theme`, recuerda la elección, funciona sin `localStorage`). `theme.test.js` reescrito para los dos temas. **Todas las pantallas existentes** se revisan con capturas en **los dos temas** (cliente y Smarteam, escritorio y móvil) antes de seguir.

### Paso 3. Gráficos (TDD)
`components/charts/*` y `lib/format.js` con sus tests (escalas, ceros, rótulos, accesibilidad).

### Paso 4. Mocks
Catálogo de causas de ejemplo, `handlers/dashboard.js` y `handlers/metrics.js` calculando desde el seed; se enriquecen los mensajes de error del seed para que haya varias causas y grupos, y los tickets del seed para tener resueltos repartidos en 12 meses. Tests de handlers: totales y F3, días vacíos en 0 y zona horaria (F4), clasificación y `other` (F5), F6, medianas y rangos (F8, F9), `byTenant` solo para Smarteam, aislamiento por empresa, 404 de empresa inexistente.

### Paso 5. Inicio (TDD)
`features/dashboard/*`, ruta, menú y frases de resumen.

### Paso 6. Métricas (TDD)
`features/metrics/*`, ruta con permiso "cualquiera de", menú.

**Hecho (14-10-2026):** `/metricas` con períodos 30 / 90 días / 12 meses (por defecto 90, `?periodo=`), filtros de Smarteam `?empresa=` y `?categoria=` (valores desconocidos se ignoran), 5 indicadores, columnas por semana con la mediana (por mes con 12 meses, sin mediana por mes: no se puede sumar), rangos, categorías, tabla por empresa (solo Smarteam) y aviso de `warnings` (G6). `PeriodPicker` compartido con el Inicio y token `--chart-warn` para el rango "1 a 3 días". Capturas en `Claude outputs/4e/metricas/`.

**Cambio (14-10-2026, pedido del usuario):** por ahora las métricas de soporte son **solo para Smarteam**. `/metricas` y su ítem del menú piden `staff.tickets` (el cliente ve "No tienes acceso"), y la tarjeta "Tu soporte" del Inicio del cliente queda apagada (`CLIENT_TICKET_METRICS = false` en `features/dashboard/constants.js`). Para reactivarlas: esa constante en `true` y `TICKETS_READ` de nuevo en la ruta y el menú. La página conserva la vista de cliente.

### Paso 7. Revisión visual y cierre
Capturas de todo el panel en los dos temas, comparación con el lienzo, README, verificación completa (lint, formato, tests, cobertura, build, `check-build`) y resumen F1–F9 para el chat del backend.

## 6. Tests (además de los existentes, que deben seguir en verde)

1. Contraste de los dos temas (§1.4) y selector de tema (cambia, recuerda, sin `localStorage` no rompe, sin parpadeo).
2. Gráficos: escala proporcional al máximo, ceros sin barra, valores y etiquetas visibles, `aria-label` y tabla accesible.
3. Formato: duraciones, porcentajes con coma decimal, números con separador de miles.
4. Inicio: período en la URL y en la API (`from`/`to`/`tz`); Smarteam elige empresa; héroe e indicadores con los totales; causas ordenadas; enlace de un negocio a Eventos filtrado; "Tu soporte" solo con `tickets.read`; estado vacío.
5. Métricas: cliente sin tabla por empresa ni filtro de empresa; Smarteam con filtros que llegan a la API; agrupación por mes con 12 meses.
6. Menú y rutas: cliente entra a Inicio; Smarteam a Bandeja; `/metricas` accesible con cualquiera de los dos permisos.
7. `forbidden-names.test.js` y `check-build` en verde (las etiquetas de causas no nombran sistemas).

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| El backend no puede clasificar errores al principio. | F5 permite que todo caiga en `other`: el tablero funciona igual y el catálogo crece después sin tocar el front. |
| Consultas de resumen pesadas en tenants grandes. | Período máximo 366 días (F4); índices por `createdAt` ya pedidos en el plan 3; el backend puede cachear. |
| Texto sobre vidrio con poco contraste en algunas zonas del fondo. | Tests sobre el peor caso en cada tema; `--muted-foreground` y `--subtle-foreground` ajustados para pasar AA sobre la mancha más clara. |
| Un color fijo de un tema se cuela en el otro. | Regla en los tests: ningún componente usa colores de tema claro u oscuro sueltos (`bg-white/…`, `text-brand-navy`…), solo tokens; y revisión con capturas en los dos temas. |
| `backdrop-filter` caro en equipos lentos. | Desenfoque solo en paneles (no en filas ni celdas); respaldo sólido con "reducir transparencia". |
| Diferencias con los mocks cuando llegue la API real. | Esquemas Zod de F2/F8: cualquier diferencia se ve como `invalid_response` y se ajusta con el contrato. |

## 8. Decisiones por defecto (cambiables antes de aprobar)

1. Dos temas con selector; por defecto **oscuro**; la elección se guarda en el navegador (no por usuario en el servidor).
2. Gráficos propios en HTML/CSS en vez de Recharts (§3.4).
3. Rutas `/inicio` y `/metricas`; orden del menú Bandeja, Inicio, Soporte, Métricas, Eventos, Syncs, Usuarios.
4. Períodos: Inicio 7/30/90 días (por defecto 30); Métricas 30/90 días/12 meses (por defecto 90).
5. Tiempos en tiempo corrido, no horario hábil (F9).
6. La clasificación de causas vive en el backend (F5); el front solo dibuja.
7. JetBrains Mono como segunda fuente para etiquetas y cifras.
