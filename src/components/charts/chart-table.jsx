/**
 * Tabla con los datos de un gráfico, solo para lectores de pantalla.
 * La primera celda de cada fila es su encabezado.
 * `sr-only` va en un div: una tabla no se achica a 1 px y desbordaría la página en móvil.
 * @param {{ caption: string, headers: string[], rows: Array<{ key: string, cells: import('react').ReactNode[] }> }} props
 */
export function ChartTable({ caption, headers, rows }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, cells: [first, ...rest] }) => (
            <tr key={key}>
              <th scope="row">{first}</th>
              {rest.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
