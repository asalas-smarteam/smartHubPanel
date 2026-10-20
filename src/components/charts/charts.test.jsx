import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BarList } from './bar-list'
import { ChartCard } from './chart-card'
import { ColumnChart } from './column-chart'
import { RatioBar } from './ratio-bar'
import { StackedBars } from './stacked-bars'
import { StatTile } from './stat-tile'

const bars = (container) => [...container.querySelectorAll('[data-slot="bar"]')]

describe('ChartCard', () => {
  it('es una región con título, nota y acción', () => {
    render(
      <ChartCard title="Errores por causa" description="Las 8 causas" action={<a href="/x">Ver</a>}>
        <p>contenido</p>
      </ChartCard>,
    )
    const region = screen.getByRole('region', { name: 'Errores por causa' })
    expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent('Errores por causa')
    expect(within(region).getByText('Las 8 causas')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'Ver' })).toBeInTheDocument()
    expect(within(region).getByText('contenido')).toBeInTheDocument()
  })

  it('la superficie fuerte usa el vidrio destacado', () => {
    render(<ChartCard title="Resueltos" surface="strong" />)
    expect(screen.getByRole('region', { name: 'Resueltos' })).toHaveClass('glass-strong')
  })
})

describe('StatTile', () => {
  it('muestra etiqueta, valor y nota como un grupo con nombre', () => {
    render(<StatTile label="Documentos" value="471" note="del período" />)
    const tile = screen.getByRole('group', { name: 'Documentos' })
    expect(within(tile).getByText('471')).toBeInTheDocument()
    expect(within(tile).getByText('del período')).toBeInTheDocument()
  })

  it.each([
    ['negative', 'text-destructive'],
    ['positive', 'text-positive'],
  ])('tono %s colorea el valor', (tone, className) => {
    render(<StatTile label="Con error" value="46" tone={tone} />)
    expect(screen.getByText('46')).toHaveClass(className)
  })
})

describe('RatioBar', () => {
  const segments = [
    { key: 'ok', label: 'Creados', value: 412, color: 'var(--chart-ok)' },
    { key: 'bad', label: 'Con error', value: 46, color: 'var(--chart-bad)' },
    { key: 'wait', label: 'En cola', value: 0, color: 'var(--chart-wait)' },
  ]

  it('cada segmento crece en proporción a su valor; los ceros no se dibujan', () => {
    const { container } = render(<RatioBar label="Documentos del período" segments={segments} />)
    const drawn = bars(container)
    expect(drawn).toHaveLength(2)
    expect(drawn[0].style.flexGrow).toBe('412')
    expect(drawn[1].style.flexGrow).toBe('46')
    expect(drawn[0].style.backgroundColor).toBe('var(--chart-ok)')
  })

  it('resume los datos para lectores de pantalla y tiene tabla equivalente', () => {
    render(<RatioBar label="Documentos del período" segments={segments} />)
    expect(
      screen.getByRole('img', {
        name: 'Documentos del período: Creados 412, Con error 46, En cola 0 (total 458)',
      }),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Documentos del período' })
    const row = within(table).getByRole('row', { name: /Con error/ })
    expect(row).toHaveTextContent('46')
    expect(row).toHaveTextContent('10 %')
  })

  it('muestra la leyenda con los valores', () => {
    render(<RatioBar label="Documentos" segments={segments} />)
    expect(screen.getByText('Creados — 412', { ignore: 'td, th, caption' })).toBeInTheDocument()
  })

  it('sin datos no dibuja segmentos', () => {
    const { container } = render(
      <RatioBar label="Documentos" segments={segments.map((s) => ({ ...s, value: 0 }))} />,
    )
    expect(bars(container)).toHaveLength(0)
    expect(screen.getByRole('img', { name: 'Documentos: sin datos' })).toBeInTheDocument()
  })
})

describe('BarList', () => {
  const items = [
    {
      key: 'a',
      label: 'Identificación fiscal incompleta',
      value: 10,
      color: 'var(--cause-fiscal)',
    },
    { key: 'b', label: 'Cliente inactivo', value: 5 },
    { key: 'c', label: 'Sin líneas', value: 0 },
  ]

  it('escala al máximo (85 % del ancho) y no dibuja barra para cero, pero muestra su valor', () => {
    const { container } = render(<BarList label="Causas" items={items} />)
    const drawn = bars(container)
    expect(drawn).toHaveLength(2)
    expect(drawn[0].style.width).toBe('85%')
    expect(drawn[1].style.width).toBe('42.5%')
    expect(drawn[0].style.backgroundColor).toBe('var(--cause-fiscal)')
    expect(drawn[1].style.backgroundColor).toBe('var(--chart-1)')
    const visual = screen.getByRole('img', { name: /^Causas:/ })
    expect(visual).toHaveAccessibleName(
      'Causas: Identificación fiscal incompleta 10, Cliente inactivo 5, Sin líneas 0',
    )
  })

  it('respeta un máximo dado y un formato de valor', () => {
    const { container } = render(
      <BarList
        label="Rangos"
        items={[{ key: 'x', label: 'X', value: 2 }]}
        max={4}
        formatValue={(v) => `${v} u`}
      />,
    )
    expect(bars(container)[0].style.width).toBe('42.5%')
    expect(screen.getByText('2 u', { ignore: 'td' })).toBeInTheDocument()
  })

  it('con notas agrega su columna en la tabla accesible', () => {
    render(
      <BarList
        label="Por categoría"
        labelHeader="Categoría"
        valueHeader="Resueltos"
        noteHeader="Mediana"
        items={[{ key: 'sync', label: 'Sincronización', value: 12, note: '14 h' }]}
      />,
    )
    const table = screen.getByRole('table', { name: 'Por categoría' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Categoría', 'Resueltos', 'Mediana'])
    expect(within(table).getByRole('row', { name: /Sincronización/ })).toHaveTextContent('14 h')
  })

  it('la tabla accesible va dentro de un contenedor sr-only (una tabla sola desborda en móvil)', () => {
    render(<BarList label="Causas" items={items} />)
    const table = screen.getByRole('table', { name: 'Causas' })
    expect(table).not.toHaveClass('sr-only')
    expect(table.parentElement).toHaveClass('sr-only')
  })

  it('sin elementos muestra un texto vacío', () => {
    render(<BarList label="Causas" items={[]} empty="Sin errores en el período" />)
    expect(screen.getByText('Sin errores en el período')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('StackedBars', () => {
  const series = [
    { key: 'created', label: 'Creados', color: 'var(--chart-ok)' },
    { key: 'errored', label: 'Con error', color: 'var(--chart-bad)' },
  ]
  const rows = [
    { key: 'd1', label: 'lun 5', values: { created: 20, errored: 2 } },
    { key: 'd2', label: 'mar 6', values: { created: 22, errored: 9 } },
    { key: 'd3', label: 'dom 11', values: { created: 0, errored: 0 } },
  ]

  it('el largo de cada fila es su total sobre el mayor; los segmentos crecen por valor', () => {
    const { container } = render(
      <StackedBars label="Actividad por día" series={series} rows={rows} />,
    )
    const tracks = [...container.querySelectorAll('[data-slot="stack"]')]
    expect(tracks.map((t) => t.style.width)).toEqual(['70.97%', '100%', '0%'])
    const second = tracks[1].querySelectorAll('[data-slot="bar"]')
    expect([...second].map((b) => b.style.flexGrow)).toEqual(['22', '9'])
    expect(tracks[2].querySelectorAll('[data-slot="bar"]')).toHaveLength(0)
  })

  it('muestra "primera serie / total" y una tabla con todas las series', () => {
    render(<StackedBars label="Actividad por día" labelHeader="Día" series={series} rows={rows} />)
    expect(screen.getByText('22', { selector: 'b' }).parentElement).toHaveTextContent('22/31')
    const table = screen.getByRole('table', { name: 'Actividad por día' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Día', 'Creados', 'Con error', 'Total'])
    expect(within(table).getByRole('row', { name: /mar 6/ })).toHaveTextContent('mar 622931')
    expect(
      screen.getByRole('img', { name: 'Actividad por día: Creados 42, Con error 11' }),
    ).toBeInTheDocument()
  })
})

describe('ColumnChart', () => {
  const columns = [
    { key: 'w1', label: '13 jul', value: 4, secondary: 0, note: '11 h' },
    { key: 'w2', label: '20 jul', value: 8, secondary: 1, note: '9 h' },
    { key: 'w3', label: '27 jul', value: 0, secondary: 0, note: '—' },
  ]
  const primary = { label: 'Resueltos', color: 'var(--chart-1)' }
  const secondary = { label: 'Reabiertos', color: 'var(--chart-2)' }

  it('altura de columnas proporcional al mayor (sumando la serie secundaria)', () => {
    const { container } = render(
      <ColumnChart label="Por semana" columns={columns} primary={primary} secondary={secondary} />,
    )
    const drawn = bars(container)
    expect(drawn.map((b) => b.style.height)).toEqual(['44.44%', '88.89%', '11.11%'])
    expect(drawn[2].style.backgroundColor).toBe('var(--chart-2)')
  })

  it('muestra valores, rótulos, notas, leyenda y tabla accesible', () => {
    render(
      <ColumnChart
        label="Por semana"
        labelHeader="Semana"
        noteHeader="Mediana de resolución"
        columns={columns}
        primary={primary}
        secondary={secondary}
      />,
    )
    const visual = screen.getByRole('img', { name: 'Por semana: Resueltos 12, Reabiertos 1' })
    expect(within(visual).getByText('20 jul')).toBeInTheDocument()
    expect(within(visual).getByText('9 h')).toBeInTheDocument()
    expect(within(visual).getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Reabiertos', { ignore: 'th' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Por semana' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Semana', 'Resueltos', 'Reabiertos', 'Mediana de resolución'])
  })

  it('sin serie secundaria no muestra leyenda ni columna extra', () => {
    render(
      <ColumnChart label="Resueltos por semana" columns={columns} primary={primary} size="sm" />,
    )
    const table = screen.getByRole('table', { name: 'Resueltos por semana' })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.queryByText('Reabiertos')).not.toBeInTheDocument()
  })

  describe('con más columnas que espacio (plan 4o)', () => {
    afterEach(() => vi.restoreAllMocks())

    it('arranca mostrando las más recientes y marca el borde con más columnas', () => {
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900)
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
      const { container } = render(
        <ColumnChart label="Por semana" columns={columns} primary={primary} />,
      )
      const scroller = container.querySelector('.overflow-x-auto')
      expect(scroller.scrollLeft).toBe(900)
      expect(scroller).toHaveAttribute('data-fade', 'true')
      expect(scroller.style.maskImage).toContain('to right')
    })

    it('si todo entra, no hay degradado', () => {
      const { container } = render(
        <ColumnChart label="Por semana" columns={columns} primary={primary} />,
      )
      expect(container.querySelector('.overflow-x-auto')).not.toHaveAttribute('data-fade')
    })
  })

  it('todo en cero no dibuja columnas', () => {
    const { container } = render(
      <ColumnChart
        label="Vacío"
        columns={columns.map((c) => ({ ...c, value: 0, secondary: 0 }))}
        primary={primary}
      />,
    )
    expect(bars(container)).toHaveLength(0)
  })
})
