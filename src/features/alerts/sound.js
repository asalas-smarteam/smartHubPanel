// Timbre de los avisos (plan 4w), generado con Web Audio: sin archivo de audio.
// El navegador solo deja sonar después de un clic o una tecla en la página; hasta entonces el
// sonido lo pone la notificación del sistema (ver use-ticket-alerts).

let context = null

const AudioContextClass = () =>
  typeof window === 'undefined' ? null : (window.AudioContext ?? window.webkitAudioContext ?? null)

/** ¿El timbre puede sonar ya? */
export function soundReady() {
  return context?.state === 'running'
}

/** Habilita el timbre. Llamarlo dentro de un clic o una tecla. */
export async function unlockSound() {
  const Context = AudioContextClass()
  if (!Context) return false
  try {
    context ??= new Context()
    if (context.state !== 'running') await context.resume()
  } catch {
    return false
  }
  return soundReady()
}

/**
 * Habilita el timbre con el primer clic o tecla en cualquier parte de la página.
 * @param {() => void} [onReady]
 * @returns {() => void} quita los listeners
 */
export function unlockSoundOnGesture(onReady) {
  const events = ['pointerdown', 'keydown']
  const remove = () => events.forEach((name) => window.removeEventListener(name, handle, true))
  async function handle() {
    if (await unlockSound()) {
      remove()
      onReady?.()
    }
  }
  events.forEach((name) => window.addEventListener(name, handle, true))
  return remove
}

/** Dos notas cortas. Devuelve si sonó (false si el navegador todavía no lo deja). */
export function playChime() {
  if (!soundReady()) return false
  try {
    const start = context.currentTime
    ;[
      [880, 0],
      [1320, 0.16],
    ].forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.32)
    })
    return true
  } catch {
    return false
  }
}

/** Solo para tests: vuelve al estado inicial (sin contexto de audio). */
export function resetSoundForTests() {
  context = null
}
