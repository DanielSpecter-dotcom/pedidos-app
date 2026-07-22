import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface PedidoActivoRow {
  pedidoId: number
  tipoServicio: string
  tipoLabel: string
  nombreCliente: string
  horaDisplay: string
  estadoPedido: string
  total: number
}

interface PedidosActivosModalProps {
  onClose: () => void
  onEditar: (pedidoId: number) => void
}

function formatTipo(tipo: string) {
  switch (tipo) {
    case 'LLEVAR':
      return '🥡 Para Llevar'
    case 'RECOGER':
      return '🎒 Para Recoger'
    case 'DELIVERY':
      return '🛵 Delivery'
    default:
      return tipo
  }
}

// Para Llevar/Recoger/Delivery no hay mesa que clickear para reabrir el
// pedido (a diferencia de MESA, que se edita clickeando la mesa ocupada en
// MesaGrid) — este modal es la puerta de entrada equivalente para esos tres
// tipos de servicio, mismo concepto que WindowPedidosActivos en la app de
// escritorio.
export function PedidosActivosModal({ onClose, onEditar }: PedidosActivosModalProps) {
  const [pedidos, setPedidos] = useState<PedidoActivoRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        const { data: pedidosData, error: errPedidos } = await supabase
          .from('Pedidos')
          .select('PedidoID, TipoServicio, ClienteID, NombreDestinatario, FechaCreacion, EstadoPedido, Total')
          .neq('TipoServicio', 'MESA')
          .neq('EstadoPedido', 'PAGADO')
          .neq('EstadoPedido', 'ANULADO')
          .order('FechaCreacion', { ascending: true })
        if (errPedidos) throw errPedidos

        const clienteIds = [...new Set((pedidosData || []).map((p) => p.ClienteID).filter(Boolean))] as number[]
        const clientesMap: Record<number, string> = {}
        if (clienteIds.length > 0) {
          const { data: clientesData } = await supabase.from('Clientes').select('ClienteID, NombreCompleto').in('ClienteID', clienteIds)
          ;(clientesData || []).forEach((c) => {
            clientesMap[c.ClienteID] = c.NombreCompleto
          })
        }

        const filas: PedidoActivoRow[] = (pedidosData || []).map((p) => ({
          pedidoId: p.PedidoID,
          tipoServicio: p.TipoServicio,
          tipoLabel: formatTipo(p.TipoServicio),
          // Si al tomar el pedido se escribió un nombre sin DNI, queda en
          // NombreDestinatario en vez de un Cliente real (ver CartContext.confirmarPedido).
          nombreCliente: p.NombreDestinatario || (p.ClienteID && clientesMap[p.ClienteID]) || 'Cliente Genérico',
          horaDisplay: new Date(p.FechaCreacion).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          estadoPedido: p.EstadoPedido,
          total: p.Total,
        }))

        if (!cancelado) setPedidos(filas)
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity fade-animate" onClick={onClose}></div>
      <div className="relative w-full md:w-[520px] bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden modal-animate flex flex-col h-auto max-h-[calc(100dvh-1.5rem)] border border-slate-100 z-10">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 sm:px-6 sm:py-5 flex justify-between items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <h3 className="text-white font-extrabold text-lg leading-tight tracking-wide">📋 Pedidos Activos</h3>
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">Llevar, Recoger y Delivery</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center font-bold hover:bg-white/20 active:scale-90 transition-all backdrop-blur-sm"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 thin-scrollbar bg-slate-50/50 p-3">
          {cargando && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-8 h-8 border-[4px] border-slate-200 border-t-guinda rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
            </div>
          )}

          {!cargando && error && (
            <div className="p-8 flex flex-col items-center justify-center text-red-400 gap-2">
              <span className="text-3xl">⚠️</span>
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {!cargando && !error && pedidos.length === 0 && (
            <div className="p-8 flex flex-col items-center justify-center text-gray-300 gap-2">
              <span className="text-3xl">✅</span>
              <span className="text-xs font-bold uppercase tracking-wider">No hay pedidos activos</span>
            </div>
          )}

          {!cargando &&
            !error &&
            pedidos.map((p) => (
              <button
                key={p.pedidoId}
                onClick={() => onEditar(p.pedidoId)}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-soft p-3.5 mb-2.5 flex items-center justify-between gap-3 hover:border-guinda/40 active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-guinda font-black text-sm">#{p.pedidoId}</span>
                    <span className="text-slate-700 font-bold text-sm">{p.tipoLabel}</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        p.estadoPedido === 'SERVIDO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.estadoPedido}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{p.nombreCliente}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{p.horaDisplay}</p>
                </div>
                <span className="font-black text-emerald-600 text-sm whitespace-nowrap">S/ {p.total.toFixed(2)}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
