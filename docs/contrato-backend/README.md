# Contrato del panel con el backend

Decisiones que el **frontend del panel (`smartHubPanel`) ya implementa** y que el backend debe respetar en `/panel/api`. Completan lo que el spec (`docs/specs/2026-10-12-panel-soporte-design.md`) no define con exactitud: forma de las respuestas, nombres de campos y códigos de error.

El front hoy funciona contra una API simulada (MSW) que responde exactamente así. Si el backend necesita cambiar algo, se acuerda **antes** de implementarlo y se ajustan el front y los mocks.

## Archivos

| Archivo | Plan del backend | Contenido |
|---|---|---|
| [`00-reglas-generales.md`](00-reglas-generales.md) | Todos | Rutas, sesión, header CSRF, formato de errores, paginación, nombres genéricos. |
| [`01-acceso-y-usuarios.md`](01-acceso-y-usuarios.md) | Plan 1 (Acceso) | Supuestos **C1 a C9**: login, `/auth/me`, cambio de contraseña, usuarios y el endpoint nuevo de empresas. |
| [`02-soporte.md`](02-soporte.md) | Plan 2 (Soporte) | Supuestos **D1 a D12**: tickets, mensajes, imágenes, bandeja y resumen. |
| [`03-eventos-y-syncs.md`](03-eventos-y-syncs.md) | Plan 3 (Eventos y syncs) | Supuestos **E1 a E10**: estados y tipos genéricos, filtros, errores paginados y el endpoint nuevo de tareas. |
| [`05-tableros-y-metricas.md`](05-tableros-y-metricas.md) | Después de los planes 1 a 3 | Supuestos **F1 a F9**: resumen de integración del Inicio y métricas de soporte (endpoints nuevos). |
| [`06-ajustes-plan-5.md`](06-ajustes-plan-5.md) | Plan 5 del backend | **G1 a G6**: cola de eventos como tarea, ocultar corridas vacías, causa y errores saneados para cuentas cliente, snapshot de tickets e implementación de F1 a F9. Escrito por el backend; el front lo aplica en el plan 4f. |
| [`07-intercambio-evento.md`](07-intercambio-evento.md) | Plan 4i del panel | **H1**: campo `exchange` (recibido, enviado y respuesta) en el detalle del evento, saneado para cuentas cliente. Implementado en el plan 5c del backend (nota al final del archivo). |
| [`08-mapeo-campos.md`](08-mapeo-campos.md) | Plan 4p del panel | **I1 a I4**: lista de mapeos de campos de la empresa (solo lectura), permiso `mappings.read` y nombres genéricos. |
| [`09-tareas-programadas.md`](09-tareas-programadas.md) | Plan 4r del panel | **J1 a J5**: tareas programadas de la empresa (solo lectura), nombres genéricos, campos que nunca salen y permiso `tasks.read`. |
| [`10-aviso-slack.md`](10-aviso-slack.md) | Plan 4v del panel (**en pausa**) | **K1 a K6**: mensaje en Slack cuando un cliente crea un ticket (empresa, código, título y enlace), configuración por `.env` y que nunca afecte la creación. |

## Planes del backend preparados desde el front

| Archivo | Para |
|---|---|
| [`planes/2026-10-13-panel-acceso-backend.md`](planes/2026-10-13-panel-acceso-backend.md) | Borrador del **plan 1 (Acceso)**. El chat del backend lo revisa contra el código y lo copia a `docs/superpowers/plans/`. |

## Cómo usarlo

1. Antes de escribir el plan de cada parte del backend, leer `00-reglas-generales.md` y el archivo de esa parte.
2. Cada punto tiene un identificador (C1, D6, …). Si el backend decide algo distinto, anotarlo con ese identificador para que el front lo ajuste.
3. Los tests del backend pueden tomar los ejemplos JSON de estos archivos como casos esperados.

## Origen

- Plan 4a del panel: `docs/plans/2026-10-12-panel-base.md`, §3.2 (C1 a C9).
- Plan 4b del panel: `docs/plans/2026-10-12-panel-soporte.md`, §1.2 (D1 a D12).
- Plan 4c del panel: `docs/plans/2026-10-13-panel-eventos-syncs.md`, §1.2 (E1 a E10).
- Plan 4e del panel: `docs/plans/2026-10-13-panel-rediseno-tableros.md`, §2 (F1 a F9).
- Plan 4p del panel: `docs/plans/2026-10-16-panel-mapeo-campos.md` (I1 a I4).
- Plan 4r del panel: `docs/plans/2026-10-20-panel-tareas-programadas.md` (J1 a J5).
- Implementación de referencia (mocks): `src/mocks/handlers/` del repo del panel.
