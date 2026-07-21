import type { ColaCocinaItem } from '../types'

interface KitchenQueueGridProps {
  cola: ColaCocinaItem[]
  onMarcarServido: (detalleId: number, pedidoId: number) => void
}

export function KitchenQueueGrid({ cola, onMarcarServido }: KitchenQueueGridProps) {
  if (cola.length === 0) {
    return (
      <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center text-slate-300 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3 stroke-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">No hay pedidos en cola</span>
      </div>
    )
  }

  return (
    <>
      {cola.map((item) => {
        const servicio = item.pedido?.TipoServicio || 'MESA'
        const labelUbicacion = item.mesas.length > 0 ? `Mesa ${item.mesas.join(' + ')}` : servicio
        const minutes = item.FechaAgregado ? Math.max(0, Math.round((Date.now() - new Date(item.FechaAgregado).getTime()) / 60000)) : 0
        const urgent = minutes >= 15

        return (
          <article
            key={item.DetalleID}
            className={`rounded-[20px] border ${urgent ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-white'} shadow-soft overflow-hidden`}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-900 text-white">#{item.posicion}</span>
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      Pedido {item.PedidoID}
                    </span>
                    {item.EsParaLlevar && (
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">LLEVAR</span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight mt-3">{item.productoNombre}</h4>
                  <p className="text-xs font-bold text-slate-500 mt-1">{labelUbicacion}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-3xl font-black text-slate-900 leading-none">{item.Cantidad}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">cant.</div>
                </div>
              </div>
              {item.Notas && (
                <p className="mt-3 text-xs font-bold text-guinda bg-guinda/5 border border-guinda/10 rounded-xl px-3 py-2">{item.Notas}</p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className={`text-[11px] font-black ${urgent ? 'text-red-600' : 'text-slate-400'} uppercase tracking-widest`}>
                  {minutes} min
                </span>
                <button
                  onClick={() => onMarcarServido(item.DetalleID, item.PedidoID)}
                  className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wide active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Servido
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </>
  )
}
