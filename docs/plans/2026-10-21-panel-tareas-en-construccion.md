# Plan 4t — Tareas programadas "En construcción" para el cliente

Aprobado el 21-10-2026.

## Qué

Por ahora solo Smarteam ve la vista real de Tareas programadas. El cliente sigue viendo
"Tareas programadas" en el menú, pero en `/tareas` y `/tareas/:id` le aparece una página de
"En construcción".

## Cómo

- `src/components/under-construction.jsx`: `UnderConstructionPage` (título + caja "En
  construcción") y `StaffPreview`, que muestra la vista real solo con `staff.tickets`.
- `src/app/routes.jsx`: las rutas de tareas envuelven la página en `StaffPreview`. El cliente no
  descarga la vista ni pide `/scheduled-tasks`.
- Es solo UI: el backend sigue respondiendo a quien tenga `tasks.read`.

## Para liberarla

En `routes.jsx`, volver a `withPermission(PERMISSIONS.TASKS_READ, TasksPage)` y `TaskPage`, y
borrar `TASKS_PREVIEW`/`tasksPreview`. Los tests de `tasks-page.test.jsx` corren con Smarteam y
ACME elegida; el primero comprueba la página de construcción del cliente.
