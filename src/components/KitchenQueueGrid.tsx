import { useState } from 'react'
import type { PedidoCola } from '../types'

interface KitchenQueueGridProps {
  pedidos: PedidoCola[]
  onMarcarListo: (pedidoId: number) => void
  onDeshacerListo: (pedidoId: number) => void
  pendientesDespacho: Set<number>
  onAvisarMesero: (pedido: PedidoCola) => void
  esAdmin: boolean
}

export function KitchenQueueGrid({
  pedidos,
  onMarcarListo,
  onDeshacerListo,
  pendientesDespacho,
  onAvisarMesero,
  esAdmin,
}: KitchenQueueGridProps) {
  if (pedidos.length === 0) {
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
      {pedidos.map((pedido) => (
        <PedidoColaCard
          key={pedido.pedidoId}
          pedido={pedido}
          onMarcarListo={onMarcarListo}
          onDeshacerListo={onDeshacerListo}
          pendienteDespacho={pendientesDespacho.has(pedido.pedidoId)}
          onAvisarMesero={onAvisarMesero}
          esAdmin={esAdmin}
        />
      ))}
    </>
  )
}

function PedidoColaCard({
  pedido,
  onMarcarListo,
  onDeshacerListo,
  pendienteDespacho,
  onAvisarMesero,
  esAdmin,
}: {
  pedido: PedidoCola
  onMarcarListo: (pedidoId: number) => void
  onDeshacerListo: (pedidoId: number) => void
  pendienteDespacho: boolean
  onAvisarMesero: (pedido: PedidoCola) => void
  esAdmin: boolean
}) {
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [avisado, setAvisado] = useState(false)
  const urgent = pedido.minutosEspera >= 15

  function toggleMarcado(detalleId: number) {
    setMarcados((prev) => {
      const next = new Set(prev)
      if (next.has(detalleId)) next.delete(detalleId)
      else next.add(detalleId)
      return next
    })
  }

  function handleAvisar() {
    onAvisarMesero(pedido)
    setAvisado(true)
  }

  return (
    <article
      className={`rounded-[20px] border ${urgent ? 'border-red-300' : 'border-slate-200'} shadow-soft overflow-hidden bg-white flex flex-col transition-opacity ${pendienteDespacho ? 'opacity-50' : ''}`}
    >
      <div className={`px-4 py-3 flex items-center justify-between gap-3 text-white ${urgent ? 'bg-red-600' : 'bg-guinda'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-black/20">#{pedido.posicion}</span>
          <span className="font-black text-lg leading-none uppercase">{pedido.labelUbicacion}</span>
        </div>
        <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${urgent ? 'bg-black/20' : 'bg-black/10'}`}>
          {pedido.minutosEspera} min
        </span>
      </div>

      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-600 truncate">👤 {pedido.clienteNombre}</span>
        <span className="font-bold text-slate-400 truncate">🤵 {pedido.meseroNombre}</span>
      </div>

      <div className="flex-1 divide-y divide-slate-100">
        {pedido.items.map((item) => (
          <label
            key={item.DetalleID}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors select-none"
          >
            <span className="bg-slate-900 text-white font-bold text-xs w-6 h-6 rounded-md shrink-0 flex items-center justify-center">
              {item.Cantidad}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className={`font-bold text-sm text-slate-800 ${marcados.has(item.DetalleID) ? 'line-through text-slate-400' : ''}`}>
                  {item.productoNombre}
                </span>
                {item.EsParaLlevar && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 uppercase">Llevar</span>
                )}
              </div>
              {item.Notas && <div className="text-[10px] text-guinda font-medium italic">📝 {item.Notas}</div>}
            </div>
            <input
              type="checkbox"
              checked={marcados.has(item.DetalleID)}
              onChange={() => toggleMarcado(item.DetalleID)}
              className="accent-emerald-600 w-4 h-4 rounded shrink-0"
            />
          </label>
        ))}
      </div>

      {pendienteDespacho ? (
        <button
          onClick={() => onDeshacerListo(pedido.pedidoId)}
          className="h-12 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wide active:scale-[0.98] transition-all shrink-0 flex items-center justify-center gap-2"
        >
          ↩ Deshacer — despachando el pedido...
        </button>
      ) : esAdmin ? (
        <div className="grid grid-cols-2 gap-px bg-slate-100 shrink-0">
          <button
            onClick={handleAvisar}
            className={`h-12 text-xs font-black uppercase tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
              avisado ? 'bg-amber-50 text-amber-600' : 'bg-amber-400 hover:bg-amber-500 text-slate-900'
            }`}
          >
            {avisado ? '🔔 Mesero avisado' : '🔔 Avisar Mesero'}
          </button>
          <button
            onClick={() => onMarcarListo(pedido.pedidoId)}
            className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wide active:scale-[0.98] transition-all"
          >
            Marcar Listo ✓
          </button>
        </div>
      ) : (
        <div className="h-9 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 shrink-0">
          Solo lectura
        </div>
      )}
    </article>
  )
}
