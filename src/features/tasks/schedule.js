// Horario de una tarea en texto (plan 4r): "Cada 2 min, de 08:00 a 18:00" o
// "07:00, 12:00 y 15:00 · lun a sáb".

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** "a", "a y b", "a, b y c". */
export function joinList(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

/** "Cada 2 min", "Cada hora", "Cada 6 h", "Cada 90 min". */
export function intervalText(minutes) {
  if (minutes === 60) return 'Cada hora'
  if (minutes > 60 && minutes % 60 === 0) return `Cada ${minutes / 60} h`
  return `Cada ${minutes} min`
}

/**
 * Días en texto: vacío o los siete → "todos los días"; seguidos → "lun a sáb"; si no, la lista.
 * Días que no se reconocen se agregan tal cual al final.
 */
export function daysText(days = []) {
  const known = WEEK.filter((day) => days.includes(day))
  const unknown = days.filter((day) => !WEEK.includes(day))
  if (unknown.length === 0 && (known.length === 0 || known.length === 7)) return 'todos los días'
  const indexes = known.map((day) => WEEK.indexOf(day))
  const consecutive =
    indexes.length >= 3 && indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1)
  const parts = consecutive
    ? [`${SHORT[indexes[0]]} a ${SHORT[indexes.at(-1)]}`]
    : indexes.map((index) => SHORT[index])
  return joinList([...parts, ...unknown])
}

/**
 * Cuándo corre la tarea. `when`: horas o intervalo; `days`: días; `null` si no tiene programación.
 * @param {{ intervalMinutes?: number | null, times?: string[], days?: string[],
 *   startTime?: string | null, endTime?: string | null }} schedule
 * @returns {{ when: string, days: string } | null}
 */
export function describeSchedule(schedule) {
  const { intervalMinutes, times = [], days = [], startTime, endTime } = schedule ?? {}
  let when = null
  if (intervalMinutes) {
    const window = startTime && endTime ? `, de ${startTime} a ${endTime}` : ''
    when = `${intervalText(intervalMinutes)}${window}`
  } else if (times.length > 0) {
    when = joinList([...times].sort())
  }
  if (!when) return null
  return { when, days: daysText(days) }
}

/** Una línea: "07:00, 12:00 y 15:00 · lun a sáb" o "Sin programación". */
export function scheduleText(schedule) {
  const described = describeSchedule(schedule)
  if (!described) return 'Sin programación'
  return described.days === 'todos los días'
    ? `${described.when} · todos los días`
    : `${described.when} · ${described.days}`
}
