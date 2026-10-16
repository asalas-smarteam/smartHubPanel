# Plan 4f: ajustes del front por el plan 5 del backend (G1 a G6)

- **Estado:** aprobado (14-10-2026), ejecutado y revisado en vivo contra el backend real con la cuenta cliente (14-10-2026): todo el checklist del plan 5 pasa.
- **Origen:** `docs/contrato-backend/06-ajustes-plan-5.md` (G1 a G6), que responde a los hallazgos
  del 13-10-2026 (`2026-10-13-panel-ajustes-backend-real.md`).
- **Después de este plan:** sigue el plan 4e, paso 6 (página de Métricas) y paso 7 (cierre).

## Qué cambia en el front

| # | Del backend | Ajuste en el front |
|---|---|---|
| G1 | Corridas de la cola de webhooks con `task: { id: "event_queue", name: "Cola de eventos", type: "event_queue" }`; `/sync-tasks` la agrega al final; `?taskId=event_queue` filtra. | `task.type` acepta `event_queue` (etiqueta "Cola de eventos"); el filtro de tarea acepta `event_queue` además de ids de 24 hex (hoy el front lo descartaría); `task: null` se sigue tolerando. |
| G2 | `GET /syncs?hideEmpty=true` oculta corridas con 0 procesados. | Interruptor **"Ocultar corridas sin cambios"** en Syncs, **activado por defecto** (Printer tiene ~55 000 corridas vacías). Se apaga con `?vacias=1` en la URL. Cliente y Smarteam. |
| G3 | Eventos con `cause: { key, label, group } \| null`; `lastError` saneado para cliente. | Esquema acepta `cause`. Lista de Eventos: en "Último error" se muestra primero la **causa** (punto de color del grupo + etiqueta) y debajo el texto. Detalle: fila "Causa" con su grupo. Colores y nombres de grupo compartidos con el Inicio. |
| G4 | Cliente: `errorMessage` texto, `{ summary }` o `null`; `errors.items` como `{ record, message }`. Staff: crudo. | Cliente: `{ summary }` se muestra como texto, no como JSON. Errores con forma `{ record, message }` se muestran en tabla de dos columnas ("Registro", "Mensaje"). Staff: sin cambios (JSON desplegable). |
| G5 | Snapshot de tickets nuevos con la vista de cliente (incluye `cause`). | El resumen del registro enlazado (nuevo ticket y detalle) muestra la causa si existe. |
| G6 | Tableros y métricas (F1 a F9) implementados; 400 legibles por período, por más de 20 000 eventos o por tiempo; `warnings` en métricas de staff. | Sin cambios de código previstos: los 400 de `validation_error` ya muestran el mensaje del servidor y los esquemas ya siguen F2/F8. **Se verifica en vivo** el Inicio con Printer. `warnings` de métricas se mostrará en la página de Métricas (plan 4e, paso 6). |

Mocks alineados: tarea `event_queue` y corridas de la cola (vacías y con error en objeto), `hideEmpty`
(400 si el valor no es `true`/`false`), `cause` en eventos con el catálogo de `mocks/error-causes.js`,
y la vista de cliente de G4.

Docs: fila de `06-ajustes-plan-5.md` en `docs/contrato-backend/README.md`.

## Pasos

1. Tests primero (`src/app/real-backend.test.jsx` y tests de cada pantalla), luego código.
2. G1 y G2 (Syncs), G3 y G5 (Eventos y contexto), G4 (detalle de corrida).
3. Verificación completa: lint, formato, tests con cobertura, build y `check-build`.
4. Revisión en vivo contra el backend local con la cuenta cliente de Printer y con Smarteam:
   Syncs (cola, interruptor), Eventos (causas), detalle de corrida, Inicio.
5. Sincronización a tu carpeta y resumen con pasos de prueba.

## Decisión por defecto (cambiable antes de aprobar)

- "Ocultar corridas sin cambios" **activado por defecto** para cliente y Smarteam.
