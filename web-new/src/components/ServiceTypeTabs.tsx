import { useCart } from '../contexts/CartContext'
import type { TipoServicio } from '../types'

const SERVICIOS: { tipo: TipoServicio; icono: string; label: string }[] = [
  { tipo: 'MESA', icono: '🍽️', label: 'Mesa' },
  { tipo: 'LLEVAR', icono: '🥡', label: 'Llevar' },
  { tipo: 'RECOGER', icono: '🎒', label: 'Recoger' },
  { tipo: 'DELIVERY', icono: '🛵', label: 'Delivery' },
]

export function ServiceTypeTabs() {
  const { tipoServicio, setTipoServicio } = useCart()

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 lg:px-0 shrink-0 py-4 w-full border-b lg:border-none border-slate-200/50">
      {SERVICIOS.map((s) => (
        <button
          key={s.tipo}
          onClick={() => setTipoServicio(s.tipo)}
          className={`radio-btn min-w-[85px] flex-1 bg-white border border-slate-200 rounded-[20px] py-3.5 px-2 text-xs font-bold text-slate-500 shadow-soft flex flex-col items-center justify-center gap-2 transition-all duration-300 active:scale-95 hover:border-slate-300 ${
            tipoServicio === s.tipo ? 'servicio-activo' : ''
          }`}
        >
          <span className="text-2xl leading-none">{s.icono}</span> {s.label}
        </button>
      ))}
    </div>
  )
}
