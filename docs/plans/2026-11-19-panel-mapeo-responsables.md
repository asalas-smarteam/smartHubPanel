# Plan 5b — Mapeo de responsables (solo lectura)

Aprobado el 19-11-2026.

## Qué

Vista "Mapeo de responsables" (`/responsables`) para el cliente (admin y usuario) y Smarteam,
con el permiso `mappings.read`: qué vendedor y empleado (digitador) del ERP corresponde a cada
responsable del CRM.

- Resumen: responsables, activos y activos sin vendedor en el ERP (en ámbar si hay).
- Filtros: estado y búsqueda por nombre, correo o código (en la URL).
- Tabla: responsable en el CRM (nombre y correo), ID en el CRM, vendedor en el ERP (código y
  nombre, o "Sin vendedor"), empleado en el ERP (digitador), estado y origen. Activos primero.
- Smarteam elige la empresa, como en las demás vistas.

## Backend

Contrato `docs/contrato-backend/13-mapeo-responsables.md` (N1 a N4): datos tal cual, con
nombres genéricos (`crmOwner*`, `erpOwnerId`, `erpOwnerName`, `erpEmployeeId`).

## Archivos

- `src/features/owners/`: `constants.js`, `schemas.js`, `filters.js`, `api.js`, `owners-page.jsx`
  y sus tests.
- Mocks: `src/mocks/seed-owner-mappings.js`, `src/mocks/handlers/owner-mappings.js`.
- `nav.js` (menú), `routes.jsx` (ruta), `nav.test.js`.
