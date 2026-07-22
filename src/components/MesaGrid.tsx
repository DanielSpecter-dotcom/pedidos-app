import { useAppData } from '../contexts/AppDataContext'
import { useCart } from '../contexts/CartContext'
import { formatDuracion, minutosDesde } from '../lib/tiempo'

const UMBRAL_MESA_VIEJA_MIN = 60

interface MesaGridProps {
  onMesaOcupadaClick: (mesaId: number, numeroMesa: string) => void
}

export function MesaGrid({ onMesaOcupadaClick }: MesaGridProps) {
  const { mesas, pedidoInfoPorMesa } = useAppData()
  const { mesasSeleccionadas, toggleMesa } = useCart()

  return (
    <div
      id="panelMapa"
      className="bg-white lg:rounded-[24px] shadow-glass border-y lg:border border-slate-200/60 flex flex-col relative min-h-[400px] lg:h-full lg:flex-1 w-full z-10"
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 lg:rounded-t-[24px]">
        <h2 className="font-extrabold text-slate-800 flex items-center gap-2.5 text-sm uppercase tracking-wide">
          📍 Salón Principal{' '}
          <span className="bg-guinda/10 text-guinda px-2.5 py-1 rounded-xl text-xs font-black border border-guinda/20">
            {mesas.length}
          </span>
        </h2>
        <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden xs:flex">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-slate-200 bg-white shadow-soft"></span> Libre
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-guinda shadow-soft shadow-guinda/30"></span> Sel
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-100 border-2 border-red-300"></span> Ocp
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 lg:p-5 overflow-y-auto thin-scrollbar bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-[position:center_center]">
        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4 pb-4">
          {mesas.map((m) => {
            const isOcupada = m.Estado === 'OCUPADA'
            const isSeleccionada = mesasSeleccionadas.has(m.MesaID)
            const info = pedidoInfoPorMesa[m.MesaID]
            const minutosOcupada = isOcupada && info ? minutosDesde(info.fechaCreacion) : 0
            const esVieja = isOcupada && minutosOcupada >= UMBRAL_MESA_VIEJA_MIN

            const colorClass = isOcupada
              ? 'mesa-ocupada'
              : isSeleccionada
                ? 'mesa-seleccionada'
                : 'border-slate-200 text-slate-400 hover:border-guinda/30 hover:text-slate-600 group bg-white'
            const viejaClass = esVieja ? 'ring-2 ring-offset-2 ring-amber-400 soft-pulse' : ''

            return (
              <div
                key={m.MesaID}
                onClick={() => (isOcupada ? onMesaOcupadaClick(m.MesaID, m.NumeroMesa) : toggleMesa(m.MesaID))}
                className={`aspect-[4/3] rounded-[20px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 relative border-2 shadow-soft ${colorClass} ${viejaClass}`}
              >
                <span className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-1">Mesa</span>
                <span className="text-2xl font-black leading-none">{m.NumeroMesa}</span>
                {isOcupada && (
                  <span
                    title={`${info?.estado === 'SERVIDO' ? 'Servido — falta cobrar' : 'En cocina'} · Ocupada hace ${formatDuracion(minutosOcupada)}`}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white shadow-sm border border-red-200 flex items-center justify-center text-[10px]"
                  >
                    {info?.estado === 'SERVIDO' ? '✅' : '🍳'}
                  </span>
                )}
                {esVieja && (
                  <span
                    title={`Ocupada hace ${formatDuracion(minutosOcupada)} sin cerrar la cuenta`}
                    className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[8px] font-black shadow-sm"
                  >
                    ⏰ {formatDuracion(minutosOcupada)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
