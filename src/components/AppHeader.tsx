import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAppData } from '../contexts/AppDataContext'
import { useNotifications } from '../contexts/NotificationContext'
import { desuscribirPush, estaSuscripto, iosRequiereInstalar, pushSoportado, suscribirPush } from '../lib/pushNotifications'
import { IconBell, IconBellOff, IconFlame, IconHome, IconLogout } from './icons'

interface AppHeaderProps {
  vista: 'pedidos' | 'cocina'
  onChangeVista: (vista: 'pedidos' | 'cocina') => void
}

export function AppHeader({ vista, onChangeVista }: AppHeaderProps) {
  const { logout } = useAuth()
  const { loading, error } = useAppData()
  const { notificar } = useNotifications()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [suscripto, setSuscripto] = useState(false)
  const [cambiandoSuscripcion, setCambiandoSuscripcion] = useState(false)

  const estadoConexion = error ? 'Error de conexión' : loading ? 'Conectando...' : 'En línea'

  useEffect(() => {
    if (pushSoportado()) estaSuscripto().then(setSuscripto)
  }, [])

  async function alternarNotificaciones() {
    if (iosRequiereInstalar()) {
      notificar('Para recibir notificaciones en iPhone/iPad, primero agregá esta app a tu pantalla de inicio (compartir → "Agregar a inicio").', 'error')
      return
    }
    setCambiandoSuscripcion(true)
    try {
      if (suscripto) {
        await desuscribirPush()
        setSuscripto(false)
      } else {
        await suscribirPush()
        setSuscripto(true)
      }
    } catch (err) {
      notificar(err instanceof Error ? err.message : 'No se pudo cambiar el estado de notificaciones', 'error')
    } finally {
      setCambiandoSuscripcion(false)
    }
  }

  function seleccionarMenuMovil(v: 'pedidos' | 'cocina') {
    onChangeVista(v)
    setMenuAbierto(false)
  }

  return (
    <>
      <header className="w-full h-16 shrink-0 flex justify-between items-center px-5 sm:px-8 z-[40] sticky top-0 glass-header shadow-sm safe-top">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-br from-guinda to-guinda-dark rounded-[14px] flex items-center justify-center shadow-lg shadow-guinda/20 border border-white/10 ring-2 ring-white/50 overflow-hidden p-1">
            <img src="/logo2.png" alt="Melchorita" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">Melchorita</h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold bg-slate-100/50 px-2 py-0.5 rounded-full w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{estadoConexion}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-5">
          <div className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1 border border-slate-200">
            <button
              onClick={() => onChangeVista('pedidos')}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide text-slate-500 border border-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50 ${vista === 'pedidos' ? 'view-tab-active' : ''}`}
            >
              Pedidos
            </button>
            <button
              onClick={() => onChangeVista('cocina')}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide text-slate-500 border border-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50 ${vista === 'cocina' ? 'view-tab-active' : ''}`}
            >
              Cocina
            </button>
          </div>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className="sm:hidden w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-700 active:scale-90 transition-all cursor-pointer hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-guinda/60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          {pushSoportado() && (
            <button
              onClick={alternarNotificaciones}
              disabled={cambiandoSuscripcion}
              title={suscripto ? 'Notificaciones activadas' : 'Activar notificaciones'}
              aria-label={suscripto ? 'Notificaciones activadas' : 'Activar notificaciones'}
              className={`hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center border transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-guinda/60 ${suscripto ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100/80 border-slate-200 text-slate-500 hover:bg-slate-200'}`}
            >
              {suscripto ? <IconBell className="w-5 h-5" /> : <IconBellOff className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={() => logout()}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wide hover:text-red-500 transition-colors hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <div
        className={`mobile-nav-menu ${menuAbierto ? 'menu-visible' : 'menu-hidden'} sm:hidden fixed top-[calc(4rem+env(safe-area-inset-top))] right-4 z-[60] w-[min(260px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15`}
      >
        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Navegación</div>
        <button
          onClick={() => seleccionarMenuMovil('pedidos')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-guinda-50 text-guinda">
            <IconHome className="w-4 h-4" />
          </span>
          Pedidos
        </button>
        <button
          onClick={() => seleccionarMenuMovil('cocina')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <IconFlame className="w-4 h-4" />
          </span>
          Cocina
        </button>
        {pushSoportado() && (
          <button
            onClick={alternarNotificaciones}
            disabled={cambiandoSuscripcion}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              {suscripto ? <IconBell className="w-4 h-4" /> : <IconBellOff className="w-4 h-4" />}
            </span>
            {suscripto ? 'Notificaciones activas' : 'Activar notificaciones'}
          </button>
        )}
        <div className="my-1 border-t border-slate-100"></div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <IconLogout className="w-4 h-4" />
          </span>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
