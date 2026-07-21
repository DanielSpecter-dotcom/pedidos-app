import { useMemo, useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { useCart } from '../contexts/CartContext'
import { extrasPorCategoria } from '../lib/extras'
import { ExtrasCheckboxList } from './ExtrasCheckboxList'

export function ProductPicker() {
  const { productos, extras } = useAppData()
  const { addToCart } = useCart()

  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [esLlevar, setEsLlevar] = useState(false)
  const [extrasSeleccionados, setExtrasSeleccionados] = useState<Set<number>>(new Set())

  const productoSeleccionado = productos.find((p) => p.ProductoID === parseInt(productoId))
  const extrasCheckbox = useMemo(
    () => extrasPorCategoria(extras, productoSeleccionado?.CategoriaID ?? null, 'CHECKBOX'),
    [extras, productoSeleccionado],
  )

  function toggleExtra(extraId: number, marcado: boolean) {
    setExtrasSeleccionados((prev) => {
      const next = new Set(prev)
      if (marcado) next.add(extraId)
      else next.delete(extraId)
      return next
    })
  }

  function handleAgregar() {
    if (!productoSeleccionado) {
      alert('Seleccione un producto')
      return
    }
    const extrasElegidos = extras.filter((ex) => extrasSeleccionados.has(ex.ExtraID))
    addToCart(productoSeleccionado, cantidad, esLlevar, extrasElegidos)

    setProductoId('')
    setCantidad(1)
    setEsLlevar(false)
    setExtrasSeleccionados(new Set())
  }

  return (
    <div className="bg-white rounded-[24px] shadow-premium p-4 sm:p-5 border border-slate-100 shrink-0 z-20 sticky lg:static top-28 lg:top-0">
      <div className="flex gap-2.5 w-full mb-3">
        <select
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value)
            setExtrasSeleccionados(new Set())
          }}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-2xl h-12 px-4 focus:border-guinda focus:bg-white focus:outline-none focus:ring-4 focus:ring-guinda/10 shadow-inner truncate pr-10 transition-all"
        >
          <option value="" disabled>
            🔍 Buscar un plato...
          </option>
          {productos.map((p) => (
            <option key={p.ProductoID} value={p.ProductoID}>
              {p.Nombre} - S/ {p.Precio.toFixed(2)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-[60px] shrink-0 text-center font-bold border border-slate-200 rounded-2xl h-12 text-sm focus:border-guinda focus:bg-white focus:outline-none focus:ring-4 focus:ring-guinda/10 shadow-inner bg-slate-50 transition-all"
        />
      </div>

      <ExtrasCheckboxList extras={extrasCheckbox} seleccionados={extrasSeleccionados} onToggle={toggleExtra} />

      <div className="flex justify-between items-center gap-3">
        <label className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 uppercase cursor-pointer whitespace-nowrap bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors select-none">
          <input
            type="checkbox"
            checked={esLlevar}
            onChange={(e) => setEsLlevar(e.target.checked)}
            className="accent-amarillo w-4 h-4 rounded shadow-sm"
          />
          <span>P/ Llevar</span>
        </label>
        <button
          onClick={handleAgregar}
          className="bg-gradient-to-r from-amarillo to-amber-400 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-extrabold h-10 px-5 sm:px-6 rounded-xl shadow-lg shadow-amarillo/30 text-[11px] uppercase tracking-wider active:scale-95 transition-all flex-1 sm:flex-none flex justify-center items-center gap-1.5 focus:ring-4 focus:ring-amarillo/30"
        >
          Agregar
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
