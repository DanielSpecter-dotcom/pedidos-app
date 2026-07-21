import type { ColaCocinaItem } from '../types'

interface KitchenSummaryProps {
  cola: ColaCocinaItem[]
}

export function KitchenSummary({ cola }: KitchenSummaryProps) {
  if (cola.length === 0) {
    return <div className="text-xs font-bold text-slate-400 p-4 text-center">Todo al dia.</div>
  }

  const resumen = cola.reduce<Record<string, number>>((acc, item) => {
    const key = item.pedido?.TipoServicio || 'MESA'
    acc[key] = (acc[key] || 0) + (item.Cantidad || 0)
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
