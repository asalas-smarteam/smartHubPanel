# Plan 4j: exportar Eventos a Excel

- **Estado:** aprobado y ejecutado (14-10-2026).
- **Origen:** pedido del usuario: bajar la tabla de Eventos, con los filtros activos, en el mismo
  formato del Excel que hoy se les manda a los clientes (`registros_errores_pendientes_*.xlsx`).

## Decisiones

- **Lo arma el front** (sin backend nuevo): pide la lista con los filtros de la pantalla (páginas de
  100) y el detalle de cada evento (para `exchange`), de a 4 a la vez, y arma el `.xlsx` en el
  navegador. Tope: los **500** eventos más recientes del filtro (si hay más, se avisa).
- **Archivo:** `YYYY-MM-DD HH-MM-SS <Empresa> Events report.xlsx` (hora local, guiones porque
  Windows no admite `:`).
- **Formato** (como el Excel de ejemplo): una hoja por tipo de evento; encabezado en negrita blanca
  sobre azul `#1F4E78`, primera fila fija; anchos 5 / 16 / 12 / 34 / 20 / 60 / 60 / 60.
  Columnas: `#`, `Tipo de evento`, `Estado`, `Error / Motivo`, `Fecha de proceso`,
  `Recibido del CRM`, `Enviado al ERP`, `Respuesta del ERP` y, al final, `Id` (para buscar el
  evento en la base).
- **JSON compacto** (sin sangría). Si aun así pasa el límite de Excel (32 767 caracteres por
  celda), se corta con `… [recortado: ver el evento en el panel]`.
- Sin librerías nuevas: escritor mínimo de `.xlsx` (XML + zip) en `src/lib/xlsx/`.
- Cliente y Smarteam (con la empresa elegida). Al cliente le llega `exchange` ya saneado (H1).
