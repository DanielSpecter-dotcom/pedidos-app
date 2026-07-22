// Sonido de aviso generado con Web Audio API (sin archivos de audio externos).
// Los navegadores bloquean el audio hasta que hay una interacción real del
// usuario en la página — habilitarSonido() se llama en el primer gesto para
// "desbloquear" el AudioContext antes de que llegue un aviso.
//
// iOS Safari es más estricto que Chrome/Android: no basta con resume(), hay
// que reproducir un buffer de verdad (aunque sea silencioso) dentro del mismo
// gesto de toque, o el contexto queda mudo aunque su estado reporte "running".
// Si el celular tiene la perilla de silencio física activada, iOS igual
// silencia el Web Audio API — eso no se puede evitar desde el código.

let audioCtx: AudioContext | null = null
let desbloqueado = false

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

export function habilitarSonido() {
  if (desbloqueado) return
  const ctx = obtenerContexto()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  // Truco estándar para iOS: un buffer de 1 frame, silencioso, disparado de
  // forma síncrona dentro del gesto — esto es lo que de verdad desbloquea el
  // audio en Safari, resume() por sí solo no alcanza ahí.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    desbloqueado = true
  } catch {
    // Si falla, se reintenta en el próximo gesto del usuario.
  }
}

export function reproducirSonidoAviso() {
  const ctx = obtenerContexto()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  function tocarNota(frecuencia: number, inicio: number, duracion: number) {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = frecuencia
    gain.gain.setValueAtTime(0, ctx!.currentTime + inicio)
    gain.gain.linearRampToValueAtTime(0.25, ctx!.currentTime + inicio + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + inicio + duracion)
    osc.connect(gain)
    gain.connect(ctx!.destination)
    osc.start(ctx!.currentTime + inicio)
    osc.stop(ctx!.currentTime + inicio + duracion + 0.05)
  }

  try {
    tocarNota(880, 0, 0.18)
    tocarNota(1174.66, 0.16, 0.24)
  } catch (err) {
    console.error('No se pudo reproducir el sonido de aviso:', err)
  }
}
