# Plan 4p: vista "Mapeo de campos"

Fecha: 2026-10-16. Estado: aprobado e implementado en el front contra los mocks (2026-10-16). Falta el endpoint del backend (contrato 08) para probar en vivo.

Pedido: que los clientes vean sus mapeos de campos. Decisiones de Deiver: **solo lectura** en
esta fase; la ven **admin y usuario del cliente y Smarteam**; los indicadores técnicos
(`includeInServiceLayerSelect`, `userField`) se muestran **a todos**, con nombres genéricos.

## Backend (pedido)

Contrato `docs/contrato-backend/08-mapeo-campos.md`:
- `GET /field-mappings` y `GET /staff/tenants/:tenantKey/field-mappings`, sin paginar,
  `{ items: [...] }` con todos los mapeos (activos e inactivos).
- Cada mapeo: `id`, `sourceField`, `targetField`, `objectType`, `sourceContext`, `isActive`,
  `editable`, `includeInSourceQuery` (nombre genérico de `includeInServiceLayerSelect`),
  `userField`. Sin `clientConfigId` ni `hubspotCredentialId`.
- Permiso nuevo `mappings.read` para admin, usuario y Smarteam.
- Pregunta I4: si una empresa puede tener mapeos de más de una conexión al CRM.

## Front

1. **Ruta y menú:** `/mapeos`, "Mapeo de campos", con el permiso `mappings.read`. Smarteam elige
   la empresa con el mismo selector de Eventos y Syncs (`?empresa=`).
2. **Datos:** `src/features/mappings/` con `api.js` (`useFieldMappings`, una sola llamada),
   `schemas.js` (Zod; campos de texto pueden venir `null`) y `constants.js` (nombres en
   español de objetos y contextos; uno desconocido se muestra tal cual).
3. **Pantalla:**
   - Filtros: Objeto, Contexto, Estado (Todos / Activos / Inactivos) y búsqueda por campo del
     ERP o propiedad del CRM. Quedan en la URL; se filtra y pagina en el navegador.
   - Resumen arriba: total de mapeos, activos, inactivos y editables.
   - Tabla: Objeto · Contexto · Campo en el ERP → Propiedad en el CRM (monoespaciado) · Estado
     (Activo / Inactivo) · Se pide al ERP (Sí / No) · Es un usuario (Sí / No) · Editable
     (Sí / No, con candado si no).
   - Vacío: "Tu empresa todavía no tiene mapeos de campos" / "Ningún mapeo coincide con los
     filtros".
4. **Nombres propuestos:**
   - Objetos: product → Productos, contact → Contactos, company → Empresas, deal → Negocios,
     invoice → Facturas, address → Direcciones, addressExtension → Direcciones del documento.
   - Contextos: businessPartner → Socio de negocio, contactEmployee → Persona de contacto,
     bpAddress → Dirección del socio, product → Producto, ItemWarehouseInfoCollection →
     Inventario por bodega, orders-quotations → Pedidos y cotizaciones,
     inventory-transfer-request → Traslado de inventario, purchase-quotations → Cotizaciones de
     compra, addressExtension → Dirección del documento.
5. **Mocks:** handler de los dos endpoints y mapeos de ejemplo para ACME, Globex e Initech
   (activos, inactivos, no editables, un campo de usuario).
6. **Tests:** cliente ve su lista; filtros y búsqueda (y en la URL); Smarteam elige empresa;
   sin permiso no hay menú ni ruta; tipo o contexto desconocido se ve tal cual; vacíos.

## Verificación

Tests completos, lint, formato, build; capturas oscuro/claro, escritorio y celular. En vivo
cuando el backend publique el endpoint (solo lectura, no toca datos).

## Implementación (2026-10-16)

- Permiso `mappings.read` (`src/features/auth/permissions.js`, mocks), menú "Mapeo de campos" y
  ruta `/mapeos`.
- `src/features/mappings/`: `constants.js` (nombres), `schemas.js`, `filters.js` (filtrar,
  ordenar, opciones, resumen), `api.js` (`useFieldMappings`) y `mappings-page.jsx`.
- Mocks: `src/mocks/seed-mappings.js` (ACME con 22 mapeos, Globex con 5, Initech sin mapeos) y
  `src/mocks/handlers/mappings.js`.
- Tests: `filters.test.js`, `mappings-page.test.jsx` y `nav.test.js` actualizado.

## Plan 4q: direccionalidad (2026-10-20, aprobado)

Pedido de Deiver: un icono que diga el sentido de cada mapeo.

- Columna nueva **Direccionalidad**, solo con el icono: `→` (unidireccional, del CRM al ERP) si
  `includeInSourceQuery` es `false`; `⇄` (en los dos sentidos) si es `true`. Nunca es solo del
  ERP al CRM.
- Orden de columnas: Propiedad en el CRM · Direccionalidad · Campo en el ERP, para que `→` se lea
  "del CRM al ERP".
- Se quita la columna "Se pide al ERP" (la direccionalidad ya lo dice).
- Color: token `--direction`, naranja en oscuro (`#ff8a4c`) y azul en claro (`#0b58d3`); el
  texto del sentido va en `title` y en texto oculto para lectores de pantalla.
