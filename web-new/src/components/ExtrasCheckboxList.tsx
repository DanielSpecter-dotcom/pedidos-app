import type { Extra } from '../types'

interface ExtrasCheckboxListProps {
  extras: Extra[]
  seleccionados: Set<number>
  onToggle: (extraId: number, marcado: boolean) => void
}

export function ExtrasCheckboxList({ extras, seleccionados, onToggle }: ExtrasCheckboxListProps) {
  if (extras.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {extras.map((ex) => (
        <label
          key={ex.ExtraID}
          className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors select-none"
        >
          <input
            type="checkbox"
            checked={seleccionados.has(ex.ExtraID)}
            onChange={(e) => onToggle(ex.ExtraID, e.target.checked)}
            className="accent-amarillo w-4 h-4 rounded shadow-sm"
          />
          <span>
            {ex.Nombre} (+S/ {ex.PrecioUnitario.toFixed(2)})
          </span>
        </label>
      ))}
    </div>
  )
}
