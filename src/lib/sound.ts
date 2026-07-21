// Sonido de aviso generado con Web Audio API (sin archivos de audio externos).
// Los navegadores bloquean el audio hasta que hay una interacción real del
// usuario en la página — habilitarSonido() se llama una sola vez en el primer
// click/tap para "desbloquear" el AudioContext antes de que llegue un aviso.

let audioCtx: AudioContext | null = null

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  return audioCtx
}

export function habilitarSonido() {
  const ctx = obtenerContexto()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
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
