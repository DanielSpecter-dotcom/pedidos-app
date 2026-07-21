import { useCallback, useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { useAppData } from '../contexts/AppDataContext'
import { KitchenQueueGrid } from '../components/KitchenQueueGrid'
import { KitchenSummary } from '../components/KitchenSummary'
import { MobileKitchenBar } from '../components/MobileKitchenBar'
import type { ColaCocinaItem } from '../types'

interface CocinaViewProps {
  onVolverAPedidos: () => void
}

export function CocinaView({ onVolverAPedidos }: CocinaViewProps) {
  const { productos, refetchMesas } = useAppData()
  const [colaCocina, setColaCocina] = useState<ColaCocinaItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null)

  const cargarVistaCocina = useCallback(async () => {
    setCargando(true)
    setError(false)
    try {
      const { data: detalles, error: errDetalles } = await supabase
        .from('DetallePedido')
        .select('DetalleID, PedidoID, ProductoID, Cantidad, PrecioUnitario, Notas, EsParaLlevar, EstadoPlato, FechaAgregado')
        .eq('EstadoPlato', 'EN_COLA')
        .order('FechaAgregado', { ascending: true })
      if (errDetalles) throw errDetalles

      const cola = detalles || []
      const pedidoIds = [...new Set(cola.map((d) => d.PedidoID).filter(Boolean))]

      const pedidosMap: Record<number, ColaCocinaItem['pedido']> = {}
      const mesasPorPedido: Record<number, string[]> = {}

      if (pedidoIds.length > 0) {
        const { data: pedidos } = await supabase
          .from('Pedidos')
          .select('PedidoID, TipoServicio, EstadoPedido, FechaCreacion')
          .in('PedidoID', pedidoIds)
          .neq('EstadoPedido', 'ANULADO')
          .neq('EstadoPedido', 'PAGADO')

        ;(pedidos || []).forEach((p) => {
          pedidosMap[p.PedidoID] = p
        })

        const { data: asignaciones } = await supabase.from('AsignacionMesas').select('PedidoID, MesaID').in('PedidoID', pedidoIds)

        const mesaIds = [...new Set((asignaciones || []).map((a) => a.MesaID).filter(Boolean))]
        const mesasMap: Record<number, string> = {}
        if (mesaIds.length > 0) {
          const { data: mesasData } = await supabase.from('Mesas').select('MesaID, NumeroMesa').in('MesaID', mesaIds)
          ;(mesasData || []).forEach((m) => {
            mesasMap[m.MesaID] = m.NumeroMesa
          })
        }

        ;(asignaciones || []).forEach((a) => {
          if (!mesasPorPedido[a.PedidoID]) mesasPorPedido[a.PedidoID] = []
          const numero = mesasMap[a.MesaID]
          if (numero) mesasPorPedido[a.PedidoID].push(numero)
        })
      }

      const productosMap: Record<number, string> = {}
      productos.forEach((p) => {
        productosMap[p.ProductoID] = p.Nombre
      })

      const colaEnriquecida: ColaCocinaItem[] = cola
        .filter((d) => pedidosMap[d.PedidoID])
        .map((d, index) => ({
          ...d,
          posicion: index + 1,
          productoNombre: productosMap[d.ProductoID] || `Producto #${d.ProductoID}`,
          pedido: pedidosMap[d.PedidoID],
          mesas: mesasPorPedido[d.PedidoID] || [],
        }))

      setColaCocina(colaEnriquecida)
      setUltimaSync(new Date())
    } catch (err) {
      console.error('Error cargando cocina:', err)
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [productos])

  useEffect(() => {
    cargarVistaCocina()
  }, [cargarVistaCocina])

  useEffect(() => {
    let channel: RealtimeChannel | null = supabase
      .channel('cola-cocina')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'DetallePedido' }, () => cargarVistaCocina())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Pedidos' }, () => cargarVistaCocina())
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
      channel = null
    }
  }, [cargarVistaCocina])

  async function marcarPlatoServido(detalleId: number, pedidoId: number) {
    if (!confirm('¿Marcar este plato como servido?')) return

    try {
      const { error: errUpdate } = await supabase.from('DetallePedido').update({ EstadoPlato: 'SERVIDO' }).eq('DetalleID', detalleId)
      if (errUpdate) throw errUpdate

      const { count, error: errCount } = await supabase
        .from('DetallePedido')
        .select('DetalleID', { count: 'exact', head: true })
        .eq('PedidoID', pedidoId)
        .eq('EstadoPlato', 'EN_COLA')
      if (errCount) throw errCount

      if ((count || 0) === 0) {
        const { error: errPedido } = await supabase.from('Pedidos').update({ EstadoPedido: 'SERVIDO' }).eq('PedidoID', pedidoId)
        if (errPedido) throw errPedido
      }

      await cargarVistaCocina()
      await refetchMesas()
    } catch (err) {
      console.error('Error marcando servido:', err)
      alert('No se pudo marcar como servido: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const platosCount = colaCocina.reduce((sum, item) => sum + (item.Cantidad || 0), 0)
  const pedidosCount = new Set(colaCocina.map((item) => item.PedidoID)).size
  const oldestDate = colaCocina[0]?.FechaAgregado ? new Date(colaCocina[0].FechaAgregado) : null
  const waitingMinutes = oldestDate ? Math.max(0, Math.round((Date.now() - oldestDate.getTime()) / 60000)) : 0

  return (
    <section className="h-auto lg:h-full w-full p-4 sm:p-6 lg:overflow-hidden">
      <div className="h-auto lg:h-full flex flex-col gap-4">
        <div className="bg-slate-900 text-white rounded-[24px] shadow-xl overflow-hidden border border-slate-800 shrink-0">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-black text-amber-300 uppercase tracking-[0.22em] mb-2">Vista de cocina</p>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">Pedidos en cola</h2>
              <p className="text-sm text-slate-300 font-medium mt-1">Ordenados por llegada para preparar sin perder el ritmo.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0 md:min-w-[360px]">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black">Platos</span>
                <strong className="block text-2xl font-black leading-tight mt-1">{platosCount}</strong>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black">Pedidos</span>
                <strong className="block text-2xl font-black leading-tight mt-1">{pedidosCount}</strong>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black">Tiempo</span>
                <strong className="block text-2xl font-black leading-tight mt-1">{waitingMinutes}m</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 min-h-0 lg:flex-1">
          <div className="kitchen-card rounded-[24px] shadow-glass overflow-hidden flex flex-col min-h-[420px] lg:min-h-0">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Cola activa</h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  {cargando
                    ? 'Sincronizando...'
                    : error
                      ? 'No se pudo cargar la cola de cocina.'
                      : ultimaSync
                        ? `Actualizado ${ultimaSync.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                </p>
              </div>
              <button
                onClick={() => cargarVistaCocina()}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wide active:scale-95 transition-all"
              >
                Actualizar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
              {cargando ? (
                <div className="col-span-full min-h-[260px] flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-10 h-10 border-[4px] border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                  <span className="text-xs font-black uppercase tracking-widest">Cargando cola...</span>
                </div>
              ) : error ? (
                <div className="col-span-full min-h-[260px] flex flex-col items-center justify-center text-red-400 gap-2">
                  <span className="text-3xl">!</span>
                  <span className="text-xs font-bold">No se pudo cargar la cola de cocina.</span>
                </div>
              ) : (
                <KitchenQueueGrid cola={colaCocina} onMarcarServido={marcarPlatoServido} />
              )}
            </div>
          </div>

          <aside className="bg-white rounded-[24px] shadow-glass border border-slate-200/80 overflow-hidden lg:min-h-0">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Resumen</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">Servicios con platos pendientes</p>
            </div>
            <div className="p-4 space-y-3">
              <KitchenSummary cola={colaCocina} />
            </div>
          </aside>
        </div>
      </div>

      <MobileKitchenBar platosCount={platosCount} onVolver={onVolverAPedidos} />
    </section>
  )
}
