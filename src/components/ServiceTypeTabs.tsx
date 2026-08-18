import { useCart } from '../contexts/CartContext'
import { TIPO_SERVICIO_ICON } from '../lib/tipoServicio'
import type { TipoServicio } from '../types'

// Etiquetas cortas para que quepan en la pestaña (a diferencia de
// TIPO_SERVICIO_LABEL, pensada para texto de encabezados/listas).
const TABS: { tipo: TipoServicio; label: string }[] = [
  { tipo: 'MESA', label: 'Mesa' },
  { tipo: 'LLEVAR', label: 'Llevar' },
  { tipo: 'RECOGER', label: 'Recoger' },
  { tipo: 'DELIVERY', label: 'Delivery' },
]

export function ServiceTypeTabs() {
  const { tipoServicio, setTipoServicio } = useCart()

  return (
    <div className="flex gap-2 xs:gap-2.5 px-5 lg:px-0 shrink-0 py-4 w-full border-b lg:border-none border-slate-200/50">
      {TABS.map(({ tipo, label }) => {
        const Icono = TIPO_SERVICIO_ICON[tipo]
        return (
          <button
            key={tipo}
            onClick={() => setTipoServicio(tipo)}
            className={`radio-btn flex-1 min-w-0 bg-white border border-slate-200 rounded-[20px] py-3 xs:py-3.5 px-1 text-[10px] xs:text-xs font-bold text-slate-500 shadow-soft flex flex-col items-center justify-center gap-1.5 xs:gap-2 transition-all duration-300 active:scale-95 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-guinda/50 ${
              tipoServicio === tipo ? 'servicio-activo' : ''
            }`}
          >
            <Icono className="w-5 h-5 xs:w-6 xs:h-6" /> {label}
          </button>
        )
      })}
    </div>
  )
}
