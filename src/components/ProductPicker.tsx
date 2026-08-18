import { useMemo, useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { useCart } from '../contexts/CartContext'
import { useNotifications } from '../contexts/NotificationContext'
import { extrasPorCategoria } from '../lib/extras'
import { ExtrasCheckboxList } from './ExtrasCheckboxList'
import { ProductoSearchSelect } from './ProductoSearchSelect'

export function ProductPicker() {
  const { productos, extras } = useAppData()
  const { addToCart } = useCart()
  const { notificar } = useNotifications()

  const [productoId, setProductoId] = useState('')
  // Texto libre, no número: si el estado fuera number, cada tecla que
  // borra el campo (dejándolo vacío momentáneamente) se resolvía con
  // parseInt('') || 1 y el input volvía a "1" solo, sin dejar escribir
  // un número de más de un dígito ni borrarlo para reemplazarlo.
  const [cantidadTexto, setCantidadTexto] = useState('1')
  const [esLlevar, setEsLlevar] = useState(false)
  const [esMediaPorcion, setEsMediaPorcion] = useState(false)
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
      notificar('Seleccione un producto', 'error')
      return
    }
    const cantidad = Math.max(1, parseInt(cantidadTexto) || 1)
    const extrasElegidos = extras.filter((ex) => extrasSeleccionados.has(ex.ExtraID))
    addToCart(productoSeleccionado, cantidad, esLlevar, extrasElegidos, esMediaPorcion)

    setProductoId('')
    setCantidadTexto('1')
    setEsLlevar(false)
    setEsMediaPorcion(false)
    setExtrasSeleccionados(new Set())
  }

  return (
    <div className="bg-white rounded-[24px] shadow-premium p-4 sm:p-5 border border-slate-100 shrink-0 z-20 sticky lg:static top-28 lg:top-0">
      <div className="flex gap-2.5 w-full mb-3">
        <ProductoSearchSelect
          productos={productos}
          value={productoId}
          onChange={(id) => {
            setProductoId(id)
            setExtrasSeleccionados(new Set())
          }}
          placeholder="Buscar un plato..."
          className="flex-1"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cantidadTexto}
          onChange={(e) => setCantidadTexto(e.target.value)}
          onBlur={() => setCantidadTexto(String(Math.max(1, parseInt(cantidadTexto) || 1)))}
          className="w-[60px] shrink-0 text-center font-bold border border-slate-200 rounded-2xl h-12 text-sm focus:border-guinda focus:bg-white focus:outline-none focus:ring-4 focus:ring-guinda/10 shadow-inner bg-slate-50 transition-all"
        />
      </div>

      <ExtrasCheckboxList extras={extrasCheckbox} seleccionados={extrasSeleccionados} onToggle={toggleExtra} />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
        <div className="flex gap-2">
          <label className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 text-[11px] font-bold text-slate-500 uppercase cursor-pointer whitespace-nowrap bg-slate-50 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors select-none">
            <input
              type="checkbox"
              checked={esLlevar}
              onChange={(e) => setEsLlevar(e.target.checked)}
              className="accent-amarillo w-4 h-4 rounded shadow-sm shrink-0"
            />
            <span>P/ Llevar</span>
          </label>
          <label className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 text-[11px] font-bold text-slate-500 uppercase cursor-pointer whitespace-nowrap bg-slate-50 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors select-none">
            <input
              type="checkbox"
              checked={esMediaPorcion}
              onChange={(e) => setEsMediaPorcion(e.target.checked)}
              className="accent-amarillo w-4 h-4 rounded shadow-sm shrink-0"
            />
            <span>½ Porción</span>
          </label>
        </div>
        <button
          onClick={handleAgregar}
          className="w-full sm:w-auto bg-gradient-to-r from-amarillo to-amber-400 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-extrabold h-11 sm:h-10 px-5 sm:px-6 rounded-xl shadow-lg shadow-amarillo/30 text-[11px] uppercase tracking-wider active:scale-95 transition-all flex justify-center items-center gap-1.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-amarillo/30"
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
