import { createContext } from 'react'

/**
 * Hora actual (ms) para la columna SLA de la Bandeja. Las columnas son estables a nivel de
 * módulo (TanStack Table v9), así que la celda lee la hora de aquí: una sola hora para toda la
 * tabla, que la Bandeja actualiza cada minuto con `useNow`. Sin proveedor vale null y la celda
 * usa la hora en que se montó.
 */
export const SlaNowContext = createContext(null)
