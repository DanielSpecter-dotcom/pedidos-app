import { useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'

const DURACION_MS = 12000

export function AvisosMeseroToasts() {
  const { avisos, descartarAviso } = useNotifications()

  return (
    <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
      {avisos.map((aviso) => (
        <Toast key={aviso.id} aviso={aviso} onDescartar={() => descartarAviso(aviso.id)} />
      ))}
    </div>
  )
}

function Toast({ aviso, onDescartar }: { aviso: { labelUbicacion: string; clienteNombre: string }; onDescartar: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDescartar, DURACION_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fade-animate pointer-events-auto flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 border border-white/10 px-4 py-3">
      <span className="text-2xl shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black leading-tight">Pedido listo — {aviso.labelUbicacion}</p>
        <p className="text-xs text-slate-300 font-medium truncate">{aviso.clienteNombre}</p>
      </div>
      <button
        onClick={onDescartar}
        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
