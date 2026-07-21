import type { PedidoCola } from '../types'

interface KitchenSummaryProps {
  pedidos: PedidoCola[]
}

export function KitchenSummary({ pedidos }: KitchenSummaryProps) {
  if (pedidos.length === 0) {
    return <div className="text-xs font-bold text-slate-400 p-4 text-center">Todo al dia.</div>
  }

  const resumen = pedidos.reduce<Record<string, number>>((acc, pedido) => {
    const key = pedido.tipoServicio || 'MESA'
    const cantidad = pedido.items.reduce((s, item) => s + (item.Cantidad || 0), 0)
    acc[key] = (acc[key] || 0) + cantidad
    return acc
  }, {})

  return (
    <>
      {Object.entries(resumen).map(([servicio, cantidad]) => (
        <div key={servicio} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{servicio}</span>
          <strong className="text-lg font-black text-slate-900">{cantidad}</strong>
        </div>
      ))}
    </>
  )
}
