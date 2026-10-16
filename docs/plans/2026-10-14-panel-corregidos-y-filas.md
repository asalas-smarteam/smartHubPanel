# Plan 4k (y 4k-bis): errores corregidos, filas clicables y menú de filas por página

- **Estado:** aprobado y ejecutado (15-10-2026). **4k-bis:** "Corregido" lo calcula el **front**
  con los datos que la API ya entrega; el backend no cambia (se retiró el pedido I1).

## "Corregido"

**Regla:** un evento con error es corregido si hay otro evento **posterior** con la **misma
referencia** (id del negocio) y el **mismo tipo** que terminó bien (`completed`,
`destination_created` o `destination_created_origin_error`). Código: `src/features/events/corrections.js`
(reglas) y `corrections-api.js` (pedidos).

| Dónde | Cómo |
|---|---|
| Lista de Eventos (sin filtro de estado o con otro estado) | La página de la API; para sus errores se buscan los eventos del mismo negocio (`?reference=`, uno por negocio, hasta 40; con más, los eventos buenos en bloque desde el error más antiguo) y se marcan. |
| Filtros "Con error" y "Corregido" | Se traen los errores del filtro (hasta **1.000**, los más recientes), se separan y se pagina en el navegador. Si hay más, aviso para acotar fechas. "Corregido" nunca se manda a la API. |
| Detalle | Si es un error: se buscan los eventos de su negocio. "Se corrigió en un reintento el … · Ver el evento que lo corrigió"; sin "Reportar problema". |
| Inicio | Tras F2, se traen los errores del período (hasta 1.000) y se corrigen totales (`corrected` aparte, `errored` sin ellos), días, causas, grupos y los pasos de "más de un intento". El porcentaje cuenta creados + corregidos. Si falla, aviso y se muestran los números de la API. |
| Excel | Mismo cálculo: los corregidos salen como "Corregido". |

## Además

- Filas clicables en **Soporte**, **Bandeja** y errores de una corrida (si traen su evento).
- "Filas por página" ya no corta el "100".
