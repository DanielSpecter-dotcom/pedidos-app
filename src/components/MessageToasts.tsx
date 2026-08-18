import { useNotifications } from '../contexts/NotificationContext'
import { IconCheckCircle, IconClose, IconWarning } from './icons'

export function MessageToasts() {
  const { mensajes, descartarMensaje } = useNotifications()

  return (
    <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
      {mensajes.map((m) => (
        <div
          key={m.id}
          role="status"
          className={`fade-animate pointer-events-auto flex items-center gap-3 rounded-2xl shadow-2xl border px-4 py-3 ${
            m.tipo === 'error' ? 'bg-red-600 border-red-400/30 text-white' : 'bg-slate-900 border-white/10 text-white'
          }`}
        >
          {m.tipo === 'error' ? (
            <IconWarning className="w-5 h-5 shrink-0" />
          ) : (
            <IconCheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          )}
          <p className="flex-1 min-w-0 text-sm font-bold leading-tight">{m.texto}</p>
          <button
            onClick={() => descartarMensaje(m.id)}
            aria-label="Cerrar aviso"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
