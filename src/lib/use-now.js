import { useEffect, useState } from 'react'

/**
 * Hora actual (ms) que se actualiza sola cada `intervalMs`, para cuentas regresivas como la del
 * SLA (plan 4y). El intervalo se limpia al desmontar.
 * @param {number} [intervalMs]
 * @returns {number}
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
