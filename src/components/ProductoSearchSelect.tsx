import { useEffect, useRef, useState } from 'react'
import type { Producto } from '../types'

interface ProductoSearchSelectProps {
  productos: Producto[]
  value: string
  onChange: (productoId: string) => void
  placeholder?: string
  className?: string
}

// Quita tildes para que buscar "choncholi" encuentre "Choncholí".
function normalizar(texto: string) {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function etiqueta(p: Producto) {
  return `${p.Nombre} - S/ ${p.Precio.toFixed(2)}`
}

export function ProductoSearchSelect({ productos, value, onChange, placeholder, className }: ProductoSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) {
      setQuery('')
      return
    }
    const seleccionado = productos.find((p) => p.ProductoID === parseInt(value))
    if (seleccionado) setQuery(etiqueta(seleccionado))
  }, [value, productos])

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const filtrados = query.trim() === '' ? productos : productos.filter((p) => normalizar(p.Nombre).includes(normalizar(query)))

  function seleccionar(p: Producto) {
    onChange(String(p.ProductoID))
    setQuery(etiqueta(p))
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
    if (value) onChange('')
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className || ''}`}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-2xl h-12 px-4 focus:border-guinda focus:bg-white focus:outline-none focus:ring-4 focus:ring-guinda/10 shadow-inner truncate transition-all"
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-56 overflow-y-auto thin-scrollbar bg-white rounded-2xl shadow-xl border border-slate-200">
          {filtrados.length === 0 ? (
            <div className="px-4 py-3 text-xs font-semibold text-slate-400">Sin resultados</div>
          ) : (
            filtrados.map((p) => (
              <button
                key={p.ProductoID}
                type="button"
                onClick={() => seleccionar(p)}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-guinda-50 transition-colors border-b border-slate-50 last:border-0"
              >
                {etiqueta(p)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
