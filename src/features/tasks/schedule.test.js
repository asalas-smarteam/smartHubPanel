import { describe, expect, it } from 'vitest'

import { dynamicText, filterValueText } from './format'
import { daysText, describeSchedule, intervalText, joinList, scheduleText } from './schedule'

const WORKWEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

describe('horario en texto', () => {
  it('listas en español', () => {
    expect(joinList(['07:00'])).toBe('07:00')
    expect(joinList(['07:00', '12:00'])).toBe('07:00 y 12:00')
    expect(joinList(['07:00', '12:00', '15:00'])).toBe('07:00, 12:00 y 15:00')
  })

  it('intervalos', () => {
    expect(intervalText(2)).toBe('Cada 2 min')
    expect(intervalText(60)).toBe('Cada hora')
    expect(intervalText(360)).toBe('Cada 6 h')
    expect(intervalText(90)).toBe('Cada 90 min')
  })

  it('días: todos, seguidos, sueltos y desconocidos', () => {
    expect(daysText([])).toBe('todos los días')
    expect(daysText([...WORKWEEK, 'sunday'])).toBe('todos los días')
    expect(daysText(WORKWEEK)).toBe('lun a sáb')
    expect(daysText(['friday', 'monday', 'wednesday'])).toBe('lun, mié y vie')
    expect(daysText(['monday', 'tuesday'])).toBe('lun y mar')
    expect(daysText(['monday', 'feriado'])).toBe('lun y feriado')
  })

  it('por horas o por intervalo, con ventana', () => {
    expect(scheduleText({ times: ['15:00', '07:00', '12:00'], days: WORKWEEK })).toBe(
      '07:00, 12:00 y 15:00 · lun a sáb',
    )
    expect(scheduleText({ intervalMinutes: 2, startTime: '08:00', endTime: '18:00' })).toBe(
      'Cada 2 min, de 08:00 a 18:00 · todos los días',
    )
    expect(describeSchedule({ intervalMinutes: null, times: [] })).toBeNull()
    expect(scheduleText({})).toBe('Sin programación')
  })

  it('valor y tipo de un filtro', () => {
    expect(filterValueText([101, 102])).toBe('101, 102')
    expect(filterValueText('C')).toBe('C')
    expect(filterValueText(null)).toBe('—')
    expect(filterValueText({ a: 1 })).toBe('{"a":1}')
    expect(dynamicText({ isDynamic: false })).toBe('No')
    expect(dynamicText({ isDynamic: true, dynamicType: 'date' })).toBe('Sí · Fecha')
    expect(dynamicText({ isDynamic: true, dynamicType: null })).toBe('Sí')
  })
})
